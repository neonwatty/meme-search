require "test_helper"

class HostAuthorizationIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Rails.application.config.x.api_rate_limit_store.clear
    _, @raw_token = ApiToken.issue!(name: "Host boundary test", scopes: [ "search:read" ])
  end

  test "rejects an attacker controlled Host before settings or API routes" do
    host! "attacker.example"

    get settings_api_tokens_path
    assert_response :forbidden

    get api_v1_search_path,
      params: { q: "bunny" },
      headers: authorization_header
    assert_response :forbidden
  end

  test "accepts documented loopback and required Docker internal hosts" do
    [ "localhost", "127.0.0.1", "meme_search", "rails-app" ].each do |allowed_host|
      host! allowed_host
      get api_v1_search_path,
        params: { q: "bunny" },
        headers: authorization_header

      assert_response :success, "expected #{allowed_host} to be authorized"
    end

    get api_v1_search_path,
      params: { q: "bunny" },
      headers: authorization_header.merge("Host" => "[::1]")
    assert_response :success, "expected [::1] to be authorized"
  end

  private

    def authorization_header
      { "Authorization" => "Bearer #{@raw_token}" }
    end
end
