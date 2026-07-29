# frozen_string_literal: true

module Api
  module V1
    class BaseController < ActionController::API
      before_action :authenticate_api_token!

      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

      private

        attr_reader :current_api_token

        def authenticate_api_token!
          raw_token = request.authorization.to_s.match(/\ABearer\s+(.+)\z/i)&.captures&.first
          @current_api_token = ApiToken.authenticate(raw_token)

          unless current_api_token
            response.headers["WWW-Authenticate"] = 'Bearer realm="meme-search"'
            return render_api_error(:unauthorized, "A valid API bearer token is required.", :unauthorized)
          end

          current_api_token.record_use!
        end

        def require_scope!(scope)
          return true if current_api_token&.scope?(scope)

          render_api_error(:forbidden, "This token does not grant #{scope}.", :forbidden)
          false
        end

        def render_api_error(code, message, status)
          render json: { error: { code: code, message: message } }, status: status
        end

        def render_not_found
          render_api_error(:not_found, "The requested meme was not found.", :not_found)
        end
    end
  end
end
