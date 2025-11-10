require "uri"
require "net/http"
require "json"

class ImageCoresController < ApplicationController
  rate_limit to: 20, within: 1.minute, only: [ :search ], with: -> { redirect_to root_path, alert: "Too many requests. Please try again" }
  before_action :set_image_core, only: %i[ show edit update destroy generate_description ]
  skip_before_action :verify_authenticity_token, only: [ :description_receiver, :status_receiver ]

  def status_receiver
    received_data = params[:data]
    id = received_data[:image_core_id].to_i
    status = received_data[:status].to_i
    image_core = ImageCore.find(id)
    image_core.status = status
    img_id = image_core.id
    div_id = "status-image-core-id-#{image_core.id}"
    if image_core.save
      status_html = ApplicationController.renderer.render(partial: "image_cores/generate_status", locals: { img_id: img_id, div_id: div_id, status: image_core.status })
      ActionCable.server.broadcast "image_status_channel", { div_id: div_id, status_html: status_html }
    else
    end
  end

  def description_receiver
    received_data = params[:data]
    id = received_data[:image_core_id].to_i
    description = received_data[:description]

    image_core = ImageCore.find(id)
    image_core.description = description
    div_id = "description-image-core-id-#{image_core.id}"

    if image_core.save
      # update view with newly generated description
      ActionCable.server.broadcast "image_description_channel", { div_id: div_id, description: description }

      # re-compute embeddings
      image_core.refresh_description_embeddings
    else
      puts "Error updating description: #{image.errors.full_messages.join(", ")}"
    end
  end

  def generate_description
    status = @image_core.status
    if status != "in_queue" && status != "processing"
      # update status of instance
      @image_core.status = 1
      @image_core.save

      # get current model
      current_model = ImageToText.find_by(current: true)

      # send request
      uri = URI("http://image_to_text_generator:8000/add_job")
      http = Net::HTTP.new(uri.host, uri.port)

      # Try to make a request to the first URI
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      data = { image_core_id: @image_core.id, image_path: @image_core.image_path.name + "/" + @image_core.name, model: current_model.name }
      request.body = data.to_json
      response = http.request(request)

      respond_to do |format|
        if response.is_a?(Net::HTTPSuccess)
          # flash[:notice] = "Image added to queue for automatic description generation."
          # format.html { redirect_back_or_to root_path }
        else
          flash[:alert] = "Cannot generate description, your image to text genertaor is offline!"
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
      # update status of instance
      @image_core.status = 4
      @image_core.save!

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
      respond_to do |format|
        flash[:alert] = "Image currently in queue for text description generation or processing."
        format.html { redirect_back_or_to root_path }
      end
    end
  end

  def search
  end

  def search_items
    selected_tag_names = search_params[:selected_tag_names]
    search_params.delete(:selected_tag_names)

    @query = search_params["query"]
    @checkbox_value = search_params["checkbox_value"]
    if @checkbox_value == "0" # keyword
      @query = remove_stopwords(@query)
      @image_cores = ImageCore.search_any_word(@query).limit(10) || []
    end
    if @checkbox_value == "1" # vector
      @image_cores = vector_search(@query)
    end

    # filter search results via selected tags
    if selected_tag_names.length > 0
      @image_cores = @image_cores.select { |item| (item.image_tags&.map { |tag| tag.tag_name&.name } & selected_tag_names).any? }
    end

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

      # Optionally handle other formats like JSON
      format.json { render json: @words }
    end
  end

  # GET /image_cores
  def index
    if !params[:selected_tag_names].present? && !params[:selected_path_names].present? && !params[:has_embeddings].present?
      @image_cores = ImageCore.order(updated_at: :desc)
      @pagy, @image_cores = pagy(@image_cores)
    else
      if params[:selected_tag_names].present?
          if params[:selected_tag_names].length > 0
            selected_tag_names = params[:selected_tag_names].split(",").map { |tag| tag.strip }
            @image_cores = ImageCore.with_selected_tag_names(selected_tag_names).order(updated_at: :desc)
          end
      else
        @image_cores = ImageCore.order(updated_at: :desc)
      end

      if params[:selected_path_names].present?
        if params[:selected_path_names].length > 0
          selected_path_names = params[:selected_path_names].split(",").map { |path| path.strip }
          image_path_ids = selected_path_names.map { |name| ImagePath.where({ name: name }) }.map { |element| element[0].id }
          keeper_ids = @image_cores.select { |item| image_path_ids.include?(item.image_path_id) }.map { |item| item.id }
          @image_cores = ImageCore.where(id: keeper_ids).order(updated_at: :desc)
        end
      end

      if params[:has_embeddings].present?
          keeper_ids = @image_cores.select { |item| item.image_embeddings.length > 0 }.map { |item| item.id }
          @image_cores = ImageCore.where(id: keeper_ids).order(updated_at: :desc)
      else
          keeper_ids = @image_cores.select { |item| item.image_embeddings.length == 0 }.map { |item| item.id }
          @image_cores = ImageCore.where(id: keeper_ids).order(updated_at: :desc)
      end

      @pagy, @image_cores = pagy(@image_cores)
    end
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
    @image_core.destroy!

    respond_to do |format|
      flash[:notice] = "Meme succesfully deleted!"
      format.html { redirect_to image_cores_path, status: :see_other }
    end
  end

  private

    def vector_search(query)
      query_embedding = ImageEmbedding.new({ image_core_id: ImageCore.first.id, snippet: query })
      query_embedding.compute_embedding
      results = query_embedding.get_neighbors.map { |item| item.image_core_id }.uniq.map { |image_core_id| ImageCore.find(image_core_id) }
      results
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

  def remove_stopwords(input_string)
    stopwords = %w[a i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those am is are was were be been being have has had having do does did doing a an the and but if or as until while of at by for with above below to from up down in out on off over under how all any both each few more most other some such no nor not only own same so than too very s]

    words = input_string.split
    filtered_words = words.reject { |word| stopwords.include?(word.downcase) }

    filtered_words.join(" ")
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
