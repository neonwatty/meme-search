# frozen_string_literal: true

module Api
  module V1
    class MemesController < BaseController
      before_action -> { require_scope!("search:read") }, only: :show
      before_action -> { require_scope!("media:read") }, only: :content
      before_action :set_image_core

      def show
        render json: {
          data: MemeSerializer.new(
            @image_core,
            content_url: content_api_v1_meme_path(@image_core)
          ).as_json
        }
      end

      def content
        path = @image_core.safe_source_file_path

        response.headers["Cache-Control"] = "private, max-age=300"
        response.headers["X-Content-Type-Options"] = "nosniff"
        send_file(
          path,
          filename: @image_core.name,
          type: Marcel::MimeType.for(path, name: @image_core.name) || "application/octet-stream",
          disposition: :inline
        )
      rescue ImageCore::FileDeletionError, ImageCore::UnsafeSourceFileError, ActionController::MissingFile
        render_not_found
      end

      private

        def set_image_core
          @image_core = ImageCore.find(params[:id])
        end
    end
  end
end
