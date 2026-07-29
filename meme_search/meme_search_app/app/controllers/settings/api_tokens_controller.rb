# frozen_string_literal: true

module Settings
  class ApiTokensController < ApplicationController
    before_action :prevent_token_page_caching
    before_action :set_api_token, only: :revoke
    before_action :require_turbo_stream_creation, only: :create

    def index
      load_index
    end

    def create
      permitted = api_token_params
      @expires_at_input = permitted[:expires_at].to_s
      @expires_at_local_input = permitted[:expires_at_local].to_s
      expires_at = parse_expiry(@expires_at_input)
      @api_token, @raw_token = ApiToken.issue!(
        name: permitted[:name],
        scopes: Array(permitted[:scopes]),
        expires_at: expires_at
      )
      load_index

      render :create, status: :created
    rescue ActiveRecord::RecordInvalid => e
      copy_validation_errors(e.record)
      load_tokens
      render_create_failure
    rescue ArgumentError
      build_form_token
      @api_token.errors.add(:expires_at, "must be a valid future date and time")
      load_tokens
      render_create_failure
    end

    def revoke
      already_revoked = @api_token.revoked_at?
      @api_token.revoke!
      message = already_revoked ? "API token was already revoked." : "API token revoked."

      redirect_to settings_api_tokens_path, status: :see_other, notice: message
    end

    private

      def set_api_token
        @api_token = ApiToken.find(params[:id])
      end

      def require_turbo_stream_creation
        return if request.format.turbo_stream?

        @expires_at_input = params.dig(:api_token, :expires_at).to_s
        @expires_at_local_input = params.dig(:api_token, :expires_at_local).to_s
        build_form_token
        @api_token.errors.add(
          :base,
          "Token creation requires the interactive settings page. No token was created."
        )
        load_tokens
        render :index, status: :not_acceptable
      end

      def api_token_params
        params.require(:api_token).permit(:name, :expires_at, :expires_at_local, scopes: [])
      end

      def parse_expiry(value)
        ApiToken.parse_expiry!(value)
      end

      def load_index
        load_tokens
        @api_token = ApiToken.new(scopes: ApiToken::ALLOWED_SCOPES)
        @expires_at_input = nil
        @expires_at_local_input = nil
      end

      def load_tokens
        @api_tokens = ApiToken.order(created_at: :desc)
      end

      def build_form_token
        permitted = api_token_params
        @api_token = ApiToken.new(
          name: permitted[:name],
          scopes: Array(permitted[:scopes])
        )
      end

      def copy_validation_errors(record)
        @api_token = ApiToken.new(
          name: record.name,
          scopes: record.scopes,
          expires_at: record.expires_at
        )
        record.errors.each do |error|
          @api_token.errors.add(error.attribute, error.type, **error.options)
        end
      end

      def render_create_failure
        render :create, status: :unprocessable_entity
      end

      def prevent_token_page_caching
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
      end
  end
end
