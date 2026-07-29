require "test_helper"

class Api::V1::SearchControllerTest < ActionDispatch::IntegrationTest
  setup do
    Rails.application.config.x.api_rate_limit_store.clear
    @token, @raw_token = ApiToken.issue!(
      name: "Test client",
      scopes: [ "search:read", "media:read" ]
    )
  end

  test "requires a bearer token" do
    get api_v1_search_url, params: { q: "bunny" }

    assert_response :unauthorized
    assert_equal "unauthorized", response.parsed_body.dig("error", "code")
    assert_match(/^Bearer /, response.headers["WWW-Authenticate"])
  end

  test "returns a stable search response" do
    get api_v1_search_url,
      params: { q: "bunny", mode: "keyword", limit: 5, tag: "tag_two" },
      headers: authorization_header

    assert_response :success
    body = response.parsed_body
    assert_equal "bunny", body.dig("meta", "query")
    assert_equal "keyword", body.dig("meta", "mode")
    assert_equal 1, body.dig("meta", "count")
    assert_equal image_cores(:three).id, body.dig("data", 0, "id")
    assert_equal [ "tag_two" ], body.dig("data", 0, "tags")
    assert_equal content_api_v1_meme_path(image_cores(:three)), body.dig("data", 0, "content_url")
    assert_nil body.dig("data", 0, "image_path")
  end

  test "rejects invalid queries and modes" do
    get api_v1_search_url, params: { q: "" }, headers: authorization_header
    assert_response :unprocessable_entity
    assert_equal "invalid_query", response.parsed_body.dig("error", "code")

    get api_v1_search_url,
      params: { q: "bunny", mode: "sql" },
      headers: authorization_header
    assert_response :unprocessable_entity
    assert_equal "invalid_mode", response.parsed_body.dig("error", "code")

    get api_v1_search_url,
      params: { q: "bunny", limit: "many" },
      headers: authorization_header
    assert_response :unprocessable_entity
    assert_equal "invalid_limit", response.parsed_body.dig("error", "code")
  end

  test "rejects overlong queries and tags at the documented bounds" do
    get api_v1_search_url,
      params: { q: "q" * (Api::V1::SearchController::QUERY_MAX_LENGTH + 1) },
      headers: authorization_header
    assert_response :unprocessable_entity
    assert_equal "invalid_query", response.parsed_body.dig("error", "code")

    get api_v1_search_url,
      params: {
        q: "bunny",
        tag: "t" * (Api::V1::SearchController::TAG_MAX_LENGTH + 1)
      },
      headers: authorization_header
    assert_response :unprocessable_entity
    assert_equal "invalid_tags", response.parsed_body.dig("error", "code")
  end

  test "rejects result limits outside the documented contract" do
    [ 0, -1, ImageSearchQuery::MAX_RESULT_LIMIT + 1, "many" ].each do |invalid_limit|
      get api_v1_search_url,
        params: { q: "bunny", limit: invalid_limit },
        headers: authorization_header

      assert_response :unprocessable_entity
      assert_equal "invalid_limit", response.parsed_body.dig("error", "code")
    end
  end

  test "accepts repeated tag parameters" do
    get "#{api_v1_search_url}?q=image&tag=tag_one&tag=tag_two",
      headers: authorization_header

    assert_response :success
    assert_equal [ "tag_one", "tag_two" ], response.parsed_body.dig("meta", "tags")
    assert_equal(
      [ image_cores(:one).id, image_cores(:two).id, image_cores(:three).id ].sort,
      response.parsed_body.fetch("data").map { |item| item.fetch("id") }.sort
    )
  end

  test "treats each repeated percent-encoded tag as one exact value" do
    comma_tag = TagName.create!(name: "approval,pending", color: "#123456")
    image_cores(:one).image_tags.create!(tag_name: comma_tag)

    get "#{api_v1_search_url}?q=image&tag=approval%2Cpending&tag=tag_two",
      headers: authorization_header

    assert_response :success
    assert_equal [ "approval,pending", "tag_two" ], response.parsed_body.dig("meta", "tags")
    assert_equal(
      [ image_cores(:one).id, image_cores(:two).id, image_cores(:three).id ].sort,
      response.parsed_body.fetch("data").map { |item| item.fetch("id") }.sort
    )
  end

  test "rejects excessive tag input" do
    query = ([ "q=bunny" ] + 11.times.map { |index| "tag=tag#{index}" }).join("&")

    get "#{api_v1_search_url}?#{query}", headers: authorization_header

    assert_response :unprocessable_entity
    assert_equal "invalid_tags", response.parsed_body.dig("error", "code")
  end

  test "requires search read scope" do
    _, media_token = ApiToken.issue!(name: "Media only", scopes: [ "media:read" ])

    get api_v1_search_url,
      params: { q: "bunny" },
      headers: { "Authorization" => "Bearer #{media_token}" }

    assert_response :forbidden
    assert_equal "forbidden", response.parsed_body.dig("error", "code")
  end

  test "rejects revoked and expired bearer tokens" do
    revoked, revoked_raw = ApiToken.issue!(name: "Revoked search", scopes: [ "search:read" ])
    revoked.revoke!
    expired, expired_raw = ApiToken.issue!(
      name: "Expired search",
      scopes: [ "search:read" ],
      expires_at: 1.hour.from_now
    )
    expired.update_column(:expires_at, 1.minute.ago)

    [ revoked_raw, expired_raw ].each do |raw_token|
      get api_v1_search_url,
        params: { q: "bunny" },
        headers: { "Authorization" => "Bearer #{raw_token}" }

      assert_response :unauthorized
      assert_equal "unauthorized", response.parsed_body.dig("error", "code")
    end
  end

  test "rate limits searches per authenticated token" do
    61.times do
      get api_v1_search_url,
        params: { q: "bunny" },
        headers: authorization_header
    end

    assert_response :too_many_requests
    assert_equal "rate_limited", response.parsed_body.dig("error", "code")

    _, other_raw_token = ApiToken.issue!(
      name: "Other search client",
      scopes: [ "search:read" ]
    )
    get api_v1_search_url,
      params: { q: "bunny" },
      headers: { "Authorization" => "Bearer #{other_raw_token}" }

    assert_response :success
  end

  test "uses a real rate limit counter when the application cache is null" do
    assert_instance_of ActiveSupport::Cache::NullStore, Rails.cache

    store = Rails.application.config.x.api_rate_limit_store
    assert_not_instance_of ActiveSupport::Cache::NullStore, store

    key = "rate-limit-runtime-proof-#{SecureRandom.hex(8)}"
    assert_equal 1, store.increment(key, 1, expires_in: 1.minute)
    assert_equal 2, store.increment(key, 1, expires_in: 1.minute)
  ensure
    store&.delete(key) if key
  end

  private

    def authorization_header
      { "Authorization" => "Bearer #{@raw_token}" }
    end
end
