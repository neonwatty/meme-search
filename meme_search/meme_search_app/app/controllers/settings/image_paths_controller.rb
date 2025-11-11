module Settings
  class ImagePathsController < ApplicationController
    before_action :set_image_path, only: %i[ show edit update destroy rescan ]

    # GET /settings/image_paths
    def index
      @image_paths = ImagePath.order(updated_at: :desc)
      @pagy, @image_paths = pagy(@image_paths)
    end

    # GET /settings/image_paths/1
    def show
    end

    # GET /settings/image_paths/new
    def new
      @image_path = ImagePath.new
    end

    # GET /settings/image_paths/1/edit
    def edit
    end

    # POST /settings/image_paths
    def create
      @image_path = ImagePath.new(image_path_params)
      respond_to do |format|
        if @image_path.save
          # Trigger immediate first scan if auto-scan is enabled
          if @image_path.auto_scan_enabled?
            begin
              @image_path.scan_and_update!
            rescue => e
              Rails.logger.error "[ImagePath] Immediate scan failed: #{e.message}"
              # Don't fail the creation, just log the error
            end
          end
          flash[:notice] = "Directory path successfully created!"
          format.html { redirect_to [ :settings, @image_path ] }
        else
          flash[:alert] = "Invalid directory path!"
          format.html { render :new, status: :unprocessable_entity }
        end
      end
    end

    # PATCH/PUT /settings/image_paths/1
    def update
      respond_to do |format|
        if @image_path.update(image_path_params)
          flash[:notice] = "Directory path succesfully updated!"
          format.html { redirect_to [ :settings, @image_path ] }
        else
          flash[:alert] = "Invalid directory path!"
          format.html { render :edit, status: :unprocessable_entity }
        end
      end
    end

    # DELETE /settings/image_paths/1
    def destroy
      @image_path.destroy!

      respond_to do |format|
        flash[:notice] = "Directory path successfully deleted!"
        format.html { redirect_to [ :settings, :image_paths ], status: :see_other }
      end
    end

    # POST /settings/image_paths/1/rescan
    def rescan
      # Use scan_and_update! to properly track scan status and errors
      begin
        result = @image_path.scan_and_update!

        # Build detailed flash message based on what changed
        message = if result[:added].zero? && result[:removed].zero?
          "No changes detected in directory."
        elsif result[:removed].zero?
          "Added #{result[:added]} new #{'image'.pluralize(result[:added])}."
        elsif result[:added].zero?
          "Removed #{result[:removed]} orphaned #{'record'.pluralize(result[:removed])}."
        else
          "Added #{result[:added]} new #{'image'.pluralize(result[:added])}, removed #{result[:removed]} orphaned #{'record'.pluralize(result[:removed])}."
        end

        flash[:notice] = message
      rescue => e
        flash[:alert] = "Scan failed: #{e.message}"
      end

      respond_to do |format|
        format.html { redirect_to [ :settings, :image_paths ], status: :see_other }
      end
    end

    private
      # Use callbacks to share common setup or constraints between actions.
      def set_image_path
        @image_path = ImagePath.find(params[:id])
      end

      # Only allow a list of trusted parameters through.
      def image_path_params
        params.require(:image_path).permit(:name, :scan_frequency_minutes)
      end
  end
end
