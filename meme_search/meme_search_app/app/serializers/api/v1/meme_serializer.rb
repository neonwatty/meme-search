# frozen_string_literal: true

module Api
  module V1
    class MemeSerializer
      def initialize(image_core, content_url:)
        @image_core = image_core
        @content_url = content_url
      end

      def as_json(*)
        {
          id: image_core.id,
          filename: image_core.name,
          description: image_core.description,
          tags: image_core.image_tags.filter_map { |tag| tag.tag_name&.name },
          media_type: Rack::Mime.mime_type(File.extname(image_core.name.to_s).downcase, "application/octet-stream"),
          content_url: content_url
        }
      end

      private

        attr_reader :image_core, :content_url
    end
  end
end
