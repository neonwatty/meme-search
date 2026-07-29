# frozen_string_literal: true

module Api
  module V1
    class SearchController < BaseController
      QUERY_MAX_LENGTH = 200
      TAG_MAX_LENGTH = 20
      TAG_MAX_COUNT = 10
      ALLOWED_MODES = %w[keyword vector].freeze

      rate_limit to: 60, within: 1.minute, by: -> { current_api_token&.id || request.remote_ip },
        store: Rails.application.config.x.api_rate_limit_store,
        with: -> { render_api_error(:rate_limited, "Too many search requests. Try again shortly.", :too_many_requests) }

      def index
        return unless require_scope!("search:read")
        return unless validate_search_params

        results = ImageSearchQuery.new(
          query: params[:q],
          mode: mode,
          selected_tag_names: requested_tags,
          limit: limit
        ).call
        preload_tags(results)

        render json: {
          data: results.map { |image_core| serialize(image_core) },
          meta: {
            query: params[:q],
            mode: mode,
            tags: requested_tags,
            limit: limit,
            count: results.length
          }
        }
      end

      private

        def validate_search_params
          if !params[:q].is_a?(String) || params[:q].blank?
            render_api_error(:invalid_query, "q is required.", :unprocessable_entity)
            return false
          end

          if params[:q].to_s.length > QUERY_MAX_LENGTH
            render_api_error(:invalid_query, "q must be at most #{QUERY_MAX_LENGTH} characters.", :unprocessable_entity)
            return false
          end

          if requested_tags.length > TAG_MAX_COUNT || requested_tags.any? { |tag| tag.length > TAG_MAX_LENGTH }
            render_api_error(
              :invalid_tags,
              "Use at most #{TAG_MAX_COUNT} tags of #{TAG_MAX_LENGTH} characters or fewer.",
              :unprocessable_entity
            )
            return false
          end

          if params[:limit].present? &&
              (parsed_limit.nil? || !parsed_limit.between?(1, ImageSearchQuery::MAX_RESULT_LIMIT))
            render_api_error(
              :invalid_limit,
              "limit must be an integer between 1 and #{ImageSearchQuery::MAX_RESULT_LIMIT}.",
              :unprocessable_entity
            )
            return false
          end

          return true if ALLOWED_MODES.include?(mode)

          render_api_error(:invalid_mode, "mode must be keyword or vector.", :unprocessable_entity)
          false
        end

        def mode
          params[:mode].presence || "keyword"
        end

        def limit
          (parsed_limit || ImageSearchQuery::DEFAULT_RESULT_LIMIT)
            .clamp(1, ImageSearchQuery::MAX_RESULT_LIMIT)
        end

        def parsed_limit
          @parsed_limit ||= Integer(params[:limit].presence || ImageSearchQuery::DEFAULT_RESULT_LIMIT, exception: false)
        end

        def requested_tags
          @requested_tags ||= query_tag_values
            .map { |value| value.to_s.strip }
            .reject(&:blank?)
            .uniq
        end

        def query_tag_values
          URI.decode_www_form(request.query_string)
            .select { |name, _value| %w[tag tag[] tags tags[]].include?(name) }
            .map(&:last)
        rescue ArgumentError
          Array(params[:tag]) + Array(params[:tags])
        end

        def preload_tags(results)
          ActiveRecord::Associations::Preloader.new(
            records: results.to_a,
            associations: { image_tags: :tag_name }
          ).call
        end

        def serialize(image_core)
          MemeSerializer.new(
            image_core,
            content_url: content_api_v1_meme_path(image_core)
          ).as_json
        end
    end
  end
end
