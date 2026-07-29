require "uri"
require "net/http"
require "json"

class ImageCoresController < ApplicationController
  rate_limit to: 20, within: 1.minute, only: [ :search ], with: -> { redirect_to root_path, alert: "Too many requests. Please try again" }
  before_action :set_image_core, only: %i[ show edit update destroy generate_description ]
  skip_before_action :verify_authenticity_token, only: [ :description_receiver, :status_receiver ]

  def status_receiver
    attempt = verified_callback_attempt
    return head :unauthorized unless attempt

    status = callback_data[:status].to_i
    changed =
      case status
      when ImageCore.statuses[:not_started]
        attempt.cancel!
      when ImageCore.statuses[:in_queue]
        attempt.mark_queued!
      when ImageCore.statuses[:processing]
        attempt.transition_to_processing!
      when ImageCore.statuses[:done]
        attempt.active?
      when ImageCore.statuses[:failed]
        attempt.fail_with_error!(callback_data[:error_message].presence || "Local image description generation failed.")
      else
        return head :unprocessable_entity
      end

    if changed
      image_core = attempt.image_core.reload
      img_id = image_core.id
      div_id = "status-image-core-id-#{image_core.id}"
      status_html = ApplicationController.renderer.render(partial: "image_cores/generate_status", locals: { img_id: img_id, div_id: div_id, status: image_core.status })
      ActionCable.server.broadcast "image_status_channel", { div_id: div_id, status_html: status_html }
    end

    head :ok
  end

  def description_receiver
    attempt = verified_callback_attempt
    return head :unauthorized unless attempt

    description = ImageCore.normalize_description(callback_data[:description])

    if attempt.succeed_with_description!(description)
      image_core = attempt.image_core.reload
      div_id = "description-image-core-id-#{image_core.id}"
      # update view with newly generated description
      ActionCable.server.broadcast "image_description_channel", { div_id: div_id, description: image_core.description }

      # re-compute embeddings
      image_core.refresh_description_embeddings
    end

    head :ok
  end

  def generate_description
    status = @image_core.status
    if status != "in_queue" && status != "processing"
      configuration = ImageDescriptionProviders::Configuration.current
      provider = ImageDescriptionProviders::Factory.build(configuration)
      result =
        if provider.queued_provider?
          provider.generate(@image_core)
        else
          attempt = @image_core.start_description_generation_attempt!(
            provider: provider_name(provider, configuration),
            provider_settings: configuration.job_options
          )
          @image_core.update!(status: :in_queue)
          GenerateImageDescriptionJob.perform_later(@image_core.id, configuration.job_options, attempt.id)
          ImageDescriptionProviders::Result.new(success: true, message: "Queued description generation.", queued: true)
        end

      respond_to do |format|
        if result.success?
          flash[:notice] = result.message if result.message.present?
          format.html { redirect_back_or_to root_path }
        else
          flash[:alert] = result.message
          format.html { redirect_back_or_to root_path }
        end
      end
    else
      respond_to do |format|
        flash[:alert] = "Image currently in queue for text description generation or processing."
        format.html { redirect_back_or_to root_path }
      end
    end
  end


  def generate_stopper
    if @image_core.nil?
      @image_core = ImageCore.find(params[:id])
    end
    status = @image_core.status
    if status == "in_queue"
      if queued_provider_for_cancel?(@image_core)
        @image_core.cancel_active_description_generation_attempt!

        # send request
        uri = URI.parse("http://image_to_text_generator:8000/remove_job/#{@image_core.id}")
        http = Net::HTTP.new(uri.host, uri.port)

        # Try to make a request to the first URI
        request = Net::HTTP::Delete.new(uri.request_uri)
        request["Content-Type"] = "application/json"
        response = http.request(request)

        respond_to do |format|
          if response.is_a?(Net::HTTPSuccess)
            flash[:notice] = "Removing from process queue."
            format.html { redirect_back_or_to root_path }
          else
            flash[:alert] = "Error: #{response.code} - #{response.message}"
            format.html { redirect_back_or_to root_path }
          end
        end
      else
        @image_core.cancel_active_description_generation_attempt!
        respond_to do |format|
          flash[:notice] = "Removed from process queue."
          format.html { redirect_back_or_to root_path }
        end
      end
    else
      respond_to do |format|
        flash[:alert] = "Image currently in queue for text description generation or processing."
        format.html { redirect_back_or_to root_path }
      end
    end
  end

  def bulk_generate_descriptions
    # Get filtered image cores based on current filter params
    image_cores = get_filtered_image_cores

    # Filter only images without descriptions
    # Include: status = 0 (never generated) OR blank/null description (manually deleted)
    images_without_descriptions = image_cores.where(
      "status = ? OR description IS NULL OR description = ?",
      0, ""
    )

    configuration = ImageDescriptionProviders::Configuration.current
    provider = ImageDescriptionProviders::Factory.build(configuration)
    provider_job_options = configuration.job_options
    operation = ImageDescriptionBulkOperation.create!(
      provider: provider_name(provider, configuration),
      provider_queued: provider.queued_provider?,
      total_count: images_without_descriptions.count,
      started_at: Time.current,
      filter_params: {
        selected_tag_names: params[:selected_tag_names],
        selected_path_names: params[:selected_path_names],
        has_embeddings: params[:has_embeddings]
      }
    )

    queued_count = 0
    failed_count = 0

    images_without_descriptions.each do |image_core|
      if provider.queued_provider?
        result = provider.generate(image_core, bulk_operation: operation)
        if result.success?
          queued_count += 1
        else
          failed_count += 1
        end
      else
        begin
          attempt = image_core.start_description_generation_attempt!(
            provider: provider_name(provider, configuration),
            provider_settings: provider_job_options,
            bulk_operation: operation
          )
          image_core.update!(status: :in_queue)
          GenerateImageDescriptionJob.perform_later(image_core.id, provider_job_options, attempt.id)
          queued_count += 1
        rescue StandardError => e
          Rails.logger.error "Failed to enqueue image description job for image #{image_core.id}: #{e.class}: #{e.message}"
          image_core.update(status: :failed)
          failed_count += 1
        end
      end
    end

    respond_to do |format|
      notices = []
      notices << "Queued #{queued_count} images for description generation." if queued_count > 0
      notices << "No images needed description generation." if notices.empty? && failed_count == 0
      flash[:notice] = notices.join(" ")
      flash[:alert] = "Failed to queue #{failed_count} images." if failed_count > 0
      format.html { redirect_to image_cores_path(
        selected_tag_names: params[:selected_tag_names],
        selected_path_names: params[:selected_path_names],
        has_embeddings: params[:has_embeddings]
      ) }
    end
  end

  def bulk_operation_status
    operation = ImageDescriptionBulkOperation.current
    return render json: { error: "No bulk operation in progress" }, status: :not_found unless operation

    render json: operation.mark_completed_if_finished!
  end

  def bulk_operation_cancel
    operation = ImageDescriptionBulkOperation.current
    return render json: { error: "No bulk operation in progress" }, status: :not_found unless operation

    in_queue_images = operation.image_cores.where(status: ImageCore.statuses[:in_queue])
    cancelled_count = 0

    in_queue_images.each do |image_core|
      begin
        if operation.provider_queued?
          image_core.cancel_active_description_generation_attempt!

          uri = URI("http://image_to_text_generator:8000/remove_job/#{image_core.id}")
          http = Net::HTTP.new(uri.host, uri.port)
          request = Net::HTTP::Delete.new(uri.request_uri)
          request["Content-Type"] = "application/json"
          response = http.request(request)

          cancelled_count += 1 if response.is_a?(Net::HTTPSuccess)
        else
          cancelled_count += 1 if image_core.cancel_active_description_generation_attempt!
        end
      rescue => e
        Rails.logger.error "Failed to cancel job for image #{image_core.id}: #{e.message}"
      end
    end

    operation.cancel!

    render json: { cancelled_count: cancelled_count }
  end

  def search
  end

  def search_items
    selected_tag_names = search_params[:selected_tag_names]
    search_params.delete(:selected_tag_names)

    @query = search_params["query"]
    @checkbox_value = search_params["checkbox_value"]
    @image_cores = ImageSearchQuery.new(
      query: @query,
      mode: @checkbox_value,
      selected_tag_names: selected_tag_names
    ).call

    respond_to do |format|
      # resopnd to turbo
      format.turbo_stream do
        if @query.blank?
          render turbo_stream: turbo_stream.update("search_results", partial: "image_cores/no_search")
        else
          render turbo_stream: turbo_stream.update("search_results", partial: "image_cores/search_results", locals: { image_cores: @image_cores, query: @query })
        end
      end

      # Handle HTML format or other formats
      format.html do
        # Redirect or render a specific view if needed
      end
    end
  end

  # GET /image_cores
  def index
    # Get filtered image cores
    image_cores = get_filtered_image_cores

    # Count images without descriptions
    # Include: status = 0 (never generated) OR blank/null description (manually deleted)
    # Count globally across all images, regardless of current filters
    @images_without_descriptions_count = ImageCore.where(
      "status = ? OR description IS NULL OR description = ?",
      0, ""
    ).count

    # Paginate
    @pagy, @image_cores = pagy(image_cores)
  end

  # GET /image_cores/1
  def show
  end

  # GET /image_cores/new
  # def new
  #   @image_core = ImageCore.new
  # end

  # GET /image_cores/1/edit
  def edit
    @image_core = ImageCore.find(params[:id])
    @image_core.image_tags.build if @image_core.image_tags.empty?
  end

  # POST /image_cores or /image_cores.json
  # def create
  #   @image_core = ImageCore.new(image_core_params)

  #   respond_to do |format|
  #     if @image_core.save
  #       flash[:notice] = "Image data was successfully created."
  #       format.html { redirect_to @image_core }
  #     else
  #       flash[:alert] = @image_core.errors.full_messages[0]
  #       format.html { render :new, status: :unprocessable_entity }
  #     end
  #   end
  # end

  # PATCH/PUT /image_cores/1 or /image_cores/1.json
  def update
    image_tags = @image_core.image_tags.map { |tag| tag.id }
    image_tags.each do |tag|
      ImageTag.destroy(tag)
    end

    # check if description has changed to update status
    update_params = image_update_params
    update_description_embeddings = false
    if @image_core.description != update_params[:description]
      update_description_embeddings = true
    end

    respond_to do |format|
      if @image_core.update(update_params)
        # recompute embeddings if description has changed
        if update_description_embeddings
          @image_core.refresh_description_embeddings
        end

        flash[:notice] = "Meme succesfully updated!"
        format.html { redirect_to @image_core }
      else
        flash[:alert] = @image_core.errors.full_messages[0]
        format.html { render :edit, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /image_cores/1 or /image_cores/1.json
  def destroy
    @image_core.delete_source_file!
    @image_core.destroy!

    respond_to do |format|
      flash[:notice] = "Meme successfully deleted from the library and disk."
      format.html { redirect_to image_cores_path, status: :see_other }
    end
  rescue ImageCore::FileDeletionError => e
    redirect_to @image_core, alert: e.message, status: :see_other
  end

  private

    def image_description_provider
      @image_description_provider ||= ImageDescriptionProviders::Factory.build
    end

    def queued_provider_for_cancel?(image_core)
      image_description_provider.queued_provider?
    end

    def provider_name(provider, configuration)
      return provider.name if provider.respond_to?(:name)

      configuration.provider
    end

    def get_filtered_image_cores(filter_params = nil)
      # Use provided filter params or fall back to request params
      filter_params ||= params

      # Start with all image cores
      image_cores = ImageCore.order(updated_at: :desc)

      # Filter by tags
      if filter_params[:selected_tag_names].present?
        selected_tag_names = filter_params[:selected_tag_names].is_a?(String) ?
          filter_params[:selected_tag_names].split(",").map(&:strip) :
          filter_params[:selected_tag_names]

        if selected_tag_names.is_a?(Array) && selected_tag_names.length > 0
          image_cores = image_cores.with_selected_tag_names(selected_tag_names)
        end
      end

      # Filter by paths
      if filter_params[:selected_path_names].present?
        selected_path_names = filter_params[:selected_path_names].is_a?(String) ?
          filter_params[:selected_path_names].split(",").map(&:strip) :
          filter_params[:selected_path_names]

        if selected_path_names.is_a?(Array) && selected_path_names.length > 0
          image_path_ids = selected_path_names.map { |name| ImagePath.where({ name: name }) }.map { |element| element[0]&.id }.compact
          keeper_ids = image_cores.select { |item| image_path_ids.include?(item.image_path_id) }.map { |item| item.id }
          image_cores = ImageCore.where(id: keeper_ids).order(updated_at: :desc)
        end
      end

      # Filter by embeddings (only if explicitly set)
      # Note: has_embeddings checkbox defaults to checked (true) in the UI
      # Empty string means "no filter applied" (bulk button passes params[:has_embeddings] which may be nil/empty)
      # Only apply filter if value is "0" (unchecked) or "1" (checked)
      if filter_params.key?(:has_embeddings) && filter_params[:has_embeddings].present?
        if filter_params[:has_embeddings] == "1"
          # Filter to only images WITH embeddings
          keeper_ids = image_cores.select { |item| item.image_embeddings.length > 0 }.map { |item| item.id }
          image_cores = ImageCore.where(id: keeper_ids).order(updated_at: :desc)
        elsif filter_params[:has_embeddings] == "0"
          # Filter to only images WITHOUT embeddings
          keeper_ids = image_cores.select { |item| item.image_embeddings.length == 0 }.map { |item| item.id }
          image_cores = ImageCore.where(id: keeper_ids).order(updated_at: :desc)
        end
        # If has_embeddings is empty string or any other value, don't filter (return all)
      end

      image_cores
    end

    # Use callbacks to share common setup or constraints between actions.
    def set_image_core
      @image_core = ImageCore.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def image_core_params
      params.require(:image_core).permit(:description)
    end

    def image_update_params
      permitted_params = params.require(:image_core).permit(:description, :selected_tag_names, image_tags_attributes: [ :id, :name, :_destroy ])

      Rails.logger.debug "===== IMAGE_UPDATE_PARAMS DEBUG ====="
      Rails.logger.debug "selected_tag_names: #{permitted_params[:selected_tag_names].inspect}"

      # Convert names TagName ids
      if permitted_params[:selected_tag_names].present? && permitted_params[:selected_tag_names].length > 0
        tag_names = permitted_params[:selected_tag_names]
        tag_names = tag_names.split(",").map { |name| name.strip }.reject(&:empty?)

        if tag_names.any?
          tag_names = tag_names.map { |name| TagName.where("LOWER(name) = ?", name.downcase).first }.compact
          tag_names_hash = tag_names.map { |tag| { tag_name: tag } }

          permitted_params.delete(:image_tags_attributes)
          permitted_params[:image_tags_attributes] = tag_names_hash
        else
          permitted_params.delete(:image_tags_attributes)
          permitted_params[:image_tags_attributes] = []
        end
      else
        # No tags selected, clear all tags
        permitted_params.delete(:image_tags_attributes)
        permitted_params[:image_tags_attributes] = []
      end

      permitted_params.delete(:selected_tag_names)
      permitted_params
    end

    def callback_data
      params.fetch(:data, {})
    end

    def verified_callback_attempt
      data = callback_data
      ImageDescriptionGenerationAttempt.find_verified_callback_attempt(
        attempt_id: data[:attempt_id],
        image_core_id: data[:image_core_id],
        callback_token: data[:callback_token]
      )
    end

  def search_params
    permitted_params = params.permit([ :query, :checkbox_value, :authenticity_token, :source, :controller, :action, :selected_tag_names, search_tags: [ :tag ] ])
    permitted_params.delete(:search_tags)
    selected_tag_names = (permitted_params[:selected_tag_names] || "").split(",").map { |tag| tag.strip }
    permitted_params.delete(:selected_tag_names)
    permitted_params[:selected_tag_names] = selected_tag_names
    permitted_params
  end
end
