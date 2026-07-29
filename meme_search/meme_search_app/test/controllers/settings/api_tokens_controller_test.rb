require "test_helper"

module Settings
  class ApiTokensControllerTest < ActionDispatch::IntegrationTest
    setup do
      ApiToken.delete_all
    end

    test "index renders safe token metadata, navigation, and the security boundary" do
      active, raw_token = ApiToken.issue!(
        name: "<script>alert('token')</script>",
        scopes: [ "search:read" ]
      )
      active.update!(last_used_at: Time.current)
      revoked, = ApiToken.issue!(name: "Revoked", scopes: [ "media:read" ])
      revoked.revoke!
      expired, = ApiToken.issue!(name: "Expired", expires_at: 1.day.from_now)
      expired.update_column(:expires_at, 1.minute.ago)

      get settings_api_tokens_url

      assert_response :success
      assert_includes response.body, "API tokens"
      assert_includes response.body, "loopback-only"
      assert_includes response.body, "protect only <code>/api/v1</code>"
      assert_includes response.body, "Search API setup and security guide"
      assert_includes response.body, ERB::Util.html_escape(active.name)
      assert_not_includes response.body, active.name
      assert_includes response.body, active.token_prefix
      assert_includes response.body, "search:read"
      assert_includes response.body, "media:read"
      assert_includes response.body, "active"
      assert_includes response.body, "revoked"
      assert_includes response.body, "expired"
      assert_not_includes response.body, raw_token
      assert_not_includes response.body, active.token_digest
      assert_equal "no-store", response.headers["Cache-Control"]
    end

    test "create returns a raw token once without persisting or caching it" do
      assert_difference("ApiToken.count", 1) do
        post settings_api_tokens_url,
          params: {
            api_token: {
              name: "Browser extension",
              scopes: [ "search:read", "media:read" ],
              expires_at: 2.days.from_now.iso8601
            }
          },
          headers: turbo_stream_headers
      end

      assert_response :created
      raw_token = response.body[/ms_[A-Za-z0-9_-]{43}/]
      record = ApiToken.order(:created_at).last
      assert raw_token
      assert_equal ApiToken.digest(raw_token), record.token_digest
      assert_not_includes record.attributes.values, raw_token
      assert_not_includes response.body, record.token_digest
      assert_equal "no-store", response.headers["Cache-Control"]
      assert_equal "no-cache", response.headers["Pragma"]
      assert_equal "0", response.headers["Expires"]

      get settings_api_tokens_url

      assert_response :success
      assert_not_includes response.body, raw_token
      assert_not_includes response.body, "api-token-one-time-secret"
      assert_includes response.body, record.token_prefix
    end

    test "html create requests fail before issuing or revealing a token" do
      assert_no_difference("ApiToken.count") do
        post settings_api_tokens_url, params: {
          api_token: {
            name: "No JavaScript client",
            scopes: [ "search:read" ]
          }
        }
      end

      assert_response :not_acceptable
      assert_includes response.body, "No token was created"
      refute_match(/ms_[A-Za-z0-9_-]{43}/, response.body)
    end

    test "create safely rejects invalid names scopes and expiry" do
      invalid_inputs = [
        { name: "", scopes: [ "search:read" ] },
        { name: "n" * 101, scopes: [ "search:read" ] },
        { name: "No scopes", scopes: [] },
        { name: "Writer", scopes: [ "library:write" ] },
        { name: "Bad date", scopes: [ "search:read" ], expires_at: "not-a-date" },
        {
          name: "Past date",
          scopes: [ "search:read" ],
          expires_at: 1.day.ago.iso8601
        }
      ]

      invalid_inputs.each do |input|
        assert_no_difference("ApiToken.count") do
          post settings_api_tokens_url,
            params: { api_token: input },
            headers: turbo_stream_headers
        end

        assert_response :unprocessable_entity
        assert_includes response.body, "Token was not created"
        refute_match(/ms_[A-Za-z0-9_-]{43}/, response.body)
      end
    end

    test "create stores an offset bearing expiry as the intended instant" do
      phoenix_expiry = Time.new(2030, 1, 15, 12, 30, 0, "-07:00")

      post settings_api_tokens_url,
        params: {
          api_token: {
            name: "Phoenix browser",
            scopes: [ "search:read" ],
            expires_at_local: "2030-01-15T12:30",
            expires_at: phoenix_expiry.iso8601
          }
        },
        headers: turbo_stream_headers

      assert_response :created
      assert_equal phoenix_expiry, ApiToken.order(:created_at).last.expires_at
    end

    test "create rejects a zone less expiry instead of guessing the server timezone" do
      assert_no_difference("ApiToken.count") do
        post settings_api_tokens_url,
          params: {
            api_token: {
              name: "Ambiguous browser",
              scopes: [ "search:read" ],
              expires_at_local: "2030-01-15T12:30",
              expires_at: "2030-01-15T12:30"
            }
          },
          headers: turbo_stream_headers
      end

      assert_response :unprocessable_entity
      assert_includes response.body, "valid future date and time"
    end

    test "revoke is explicit id based and retains token metadata" do
      token, = ApiToken.issue!(name: "Local CLI", scopes: [ "search:read" ])
      original_attributes = token.attributes.slice(
        "id", "name", "token_digest", "token_prefix", "scopes", "created_at"
      )

      assert_no_difference("ApiToken.count") do
        patch revoke_settings_api_token_url(token)
      end

      assert_redirected_to settings_api_tokens_url
      assert_equal "API token revoked.", flash[:notice]
      assert token.reload.revoked_at?
      assert_equal original_attributes, token.attributes.slice(*original_attributes.keys)
    end

    test "a prefix cannot be used as an ambiguous revoke target" do
      token, = ApiToken.issue!(name: "Local CLI")

      patch revoke_settings_api_token_url(id: token.token_prefix)

      assert_response :not_found
      assert_nil token.reload.revoked_at
    end

    private

      def turbo_stream_headers
        { "Accept" => "text/vnd.turbo-stream.html" }
      end
  end
end
