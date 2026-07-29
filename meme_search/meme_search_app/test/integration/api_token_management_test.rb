require "test_helper"

class ApiTokenManagementTest < ActionDispatch::IntegrationTest
  setup do
    ApiToken.delete_all
    @original_forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
  end

  teardown do
    ActionController::Base.allow_forgery_protection = @original_forgery_protection
  end

  test "create rejects requests without a CSRF token" do
    assert_no_difference("ApiToken.count") do
      post settings_api_tokens_url, params: {
        api_token: {
          name: "Forged client",
          scopes: [ "search:read" ]
        }
      }
    end

    assert_response :unprocessable_entity
  end

  test "a form CSRF token authorizes creation but is not the issued secret" do
    get settings_api_tokens_url
    csrf_token = response.body.match(/name="csrf-token" content="([^"]+)"/)[1]

    post settings_api_tokens_url,
      params: {
        authenticity_token: csrf_token,
        api_token: {
          name: "Form client",
          scopes: [ "search:read" ]
        }
      },
      headers: { "Accept" => "text/vnd.turbo-stream.html" }

    assert_response :created
    raw_token = response.body[/ms_[A-Za-z0-9_-]{43}/]
    assert raw_token
    assert_not_equal csrf_token, raw_token
    assert_not_includes response.request.parameters.values, raw_token

    get settings_api_tokens_url
    assert_not_includes response.body, raw_token
  end

  test "revoke rejects requests without a CSRF token" do
    token, = ApiToken.issue!(name: "Protected token")

    patch revoke_settings_api_token_url(token)

    assert_response :unprocessable_entity
    assert_nil token.reload.revoked_at
  end
end
