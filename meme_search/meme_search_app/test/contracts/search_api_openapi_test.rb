require "test_helper"
require "yaml"

class SearchApiOpenapiTest < ActionDispatch::IntegrationTest
  setup do
    contract_path = Rails.root.join("..", "..", "docs", "search-api-openapi.yml").cleanpath
    @contract = YAML.safe_load_file(contract_path)
    @token, @raw_token = ApiToken.issue!(
      name: "OpenAPI contract test",
      scopes: ApiToken::ALLOWED_SCOPES
    )
  end

  test "documents every public v1 route and only read operations" do
    documented_paths = @contract.fetch("paths").keys.sort
    v1_routes = Rails.application.routes.routes.filter_map do |route|
      path = route.path.spec.to_s.delete_suffix("(.:format)")
      next unless path.start_with?("/api/v1/")

      {
        path: path.gsub(%r{:([^/]+)}, '{\1}'),
        verb: route.verb
      }
    end

    assert_equal v1_routes.pluck(:path).sort, documented_paths
    assert_equal [ "GET" ], v1_routes.pluck(:verb).uniq
    assert_equal "3.1.0", @contract.fetch("openapi")
    assert_equal "loopback-only", @contract.dig("info", "x-support-boundary")
    assert_equal "additive-only", @contract.dig("info", "x-compatibility", "changes")
    assert_equal "/api/v2",
      @contract.dig("info", "x-compatibility", "breaking-changes-require")
    assert_equal "never-in-v1",
      @contract.dig("info", "x-compatibility", "write-operations")
  end

  test "keeps query bounds modes and scopes aligned with the server" do
    parameters = search_operation.fetch("parameters").index_by { |parameter| parameter.fetch("name") }

    assert_equal ApiToken::ALLOWED_SCOPES, @contract.dig("info", "x-token-scopes")
    assert_equal "search:read", search_operation.fetch("x-required-scope")
    assert_equal "search:read", operation("/api/v1/memes/{id}").fetch("x-required-scope")
    assert_equal "media:read", operation("/api/v1/memes/{id}/content").fetch("x-required-scope")
    assert_equal Api::V1::SearchController::QUERY_MAX_LENGTH, parameters.dig("q", "schema", "maxLength")
    assert_equal Api::V1::SearchController::ALLOWED_MODES, parameters.dig("mode", "schema", "enum")
    assert_equal Api::V1::SearchController::TAG_MAX_COUNT, parameters.dig("tag", "schema", "maxItems")
    assert_equal Api::V1::SearchController::TAG_MAX_LENGTH,
      parameters.dig("tag", "schema", "items", "maxLength")
    assert_equal(
      ImageSearchQuery::MAX_RESULT_LIMIT,
      parameters.dig("limit", "schema", "maximum")
    )
    assert_equal 1, parameters.dig("limit", "schema", "minimum")
    assert_equal ImageSearchQuery::DEFAULT_RESULT_LIMIT, parameters.dig("limit", "schema", "default")
    assert_equal(
      {
        "requests" => 60,
        "window-seconds" => 60,
        "key" => "authenticated-token"
      },
      search_operation.fetch("x-rate-limit")
    )
  end

  test "requires current success fields while permitting additive v1 fields" do
    meme_schema = @contract.dig("components", "schemas", "Meme")
    search_schema = @contract.dig("components", "schemas", "SearchResponse")
    error_schema = @contract.dig("components", "schemas", "ErrorResponse")
    serialized_keys = Api::V1::MemeSerializer.new(
      image_cores(:one),
      content_url: "/api/v1/memes/#{image_cores(:one).id}/content"
    ).as_json.keys.map(&:to_s)

    assert_equal serialized_keys.sort, meme_schema.fetch("required").sort
    assert_equal serialized_keys.sort, meme_schema.fetch("properties").keys.sort
    assert_equal true, meme_schema.fetch("additionalProperties")
    assert_equal %w[count limit mode query tags].sort,
      search_schema.dig("properties", "meta", "required").sort
    assert_equal true, search_schema.fetch("additionalProperties")
    assert_equal true, search_schema.dig("properties", "meta", "additionalProperties")
    assert_equal [ "error" ], error_schema.fetch("required")
    assert_equal %w[code message], error_schema.dig("properties", "error", "required").sort
    assert_equal true, error_schema.fetch("additionalProperties")
    assert_equal true, error_schema.dig("properties", "error", "additionalProperties")

    @contract.dig("components", "responses").each_value do |response|
      assert_equal(
        "#/components/schemas/ErrorResponse",
        response.dig("content", "application/json", "schema", "$ref")
      )
    end

    json_response_schemas.each do |schema, path|
      assert_additive_object_schemas(schema, path)
    end
  end

  test "documents the exact status matrix and supported media types" do
    assert_equal %w[200 401 403 422 429], search_operation.fetch("responses").keys.sort
    assert_equal %w[200 401 403 404], operation("/api/v1/memes/{id}").fetch("responses").keys.sort
    assert_equal %w[200 401 403 404],
      operation("/api/v1/memes/{id}/content").fetch("responses").keys.sort
    assert_equal(
      %w[application/octet-stream image/gif image/jpeg image/png image/webp],
      operation("/api/v1/memes/{id}/content")
        .dig("responses", "200", "content").keys.sort
    )
    assert_equal "nosniff",
      operation("/api/v1/memes/{id}/content")
        .dig("responses", "200", "headers", "X-Content-Type-Options", "schema", "const")

    operation("/api/v1/memes/{id}/content")
      .dig("responses", "200", "content")
      .each_value do |media|
        assert_equal(
          { "type" => "string", "format" => "binary" },
          media.fetch("schema")
        )
      end
  end

  test "live success and common error responses conform to their schemas" do
    get api_v1_search_url,
      params: { q: "bunny", mode: "keyword", limit: 5 },
      headers: authorization_header
    assert_response :success
    assert_schema_instance("SearchResponse", response.parsed_body)

    get api_v1_search_url, params: { q: "bunny" }
    assert_response :unauthorized
    assert_schema_instance("ErrorResponse", response.parsed_body)

    _, media_only_raw_token = ApiToken.issue!(
      name: "OpenAPI media only",
      scopes: [ "media:read" ]
    )
    get api_v1_search_url,
      params: { q: "bunny" },
      headers: { "Authorization" => "Bearer #{media_only_raw_token}" }
    assert_response :forbidden
    assert_schema_instance("ErrorResponse", response.parsed_body)

    get api_v1_search_url, params: { q: "" }, headers: authorization_header
    assert_response :unprocessable_entity
    assert_schema_instance("ErrorResponse", response.parsed_body)

    get api_v1_meme_url(99_999_999), headers: authorization_header
    assert_response :not_found
    assert_schema_instance("ErrorResponse", response.parsed_body)

    get api_v1_meme_url(image_cores(:one).id), headers: authorization_header
    assert_response :success
    metadata_schema = operation("/api/v1/memes/{id}")
      .dig("responses", "200", "content", "application/json", "schema")
    metadata = response.parsed_body
    assert_schema_value(metadata_schema, metadata.merge("future_v1_field" => true), "$.metadata")
    assert_raises(Minitest::Assertion) do
      assert_schema_value(metadata_schema, metadata.except("data"), "$.metadata")
    end
  end

  private

    def operation(path)
      @contract.dig("paths", path, "get")
    end

    def search_operation
      operation("/api/v1/search")
    end

    def authorization_header
      { "Authorization" => "Bearer #{@raw_token}" }
    end

    def json_response_schemas
      @contract.fetch("paths").flat_map do |path, path_item|
        path_item.fetch("get").fetch("responses").filter_map do |status, response|
          response = resolve_reference(response)
          schema = response.dig("content", "application/json", "schema")
          [ schema, "#{path} #{status}" ] if schema
        end
      end
    end

    def assert_additive_object_schemas(schema, path)
      schema = resolve_schema(schema)
      case schema["type"]
      when "object"
        assert_equal true, schema["additionalProperties"],
          "#{path} object schemas must permit additive v1 fields"
        assert schema.key?("required"), "#{path} must explicitly declare required fields"
        assert schema["required"].any?, "#{path} must retain at least one required field"
        assert_empty schema["required"] - schema.fetch("properties").keys,
          "#{path} requires undocumented properties"
        schema.fetch("properties").each do |field, child_schema|
          assert_additive_object_schemas(child_schema, "#{path}.#{field}")
        end
      when "array"
        assert_additive_object_schemas(schema.fetch("items"), "#{path}[]")
      end
    end

    def assert_schema_instance(schema_name, value)
      assert_schema_value(@contract.dig("components", "schemas", schema_name), value, "$")
    end

    def assert_schema_value(schema, value, path)
      schema = resolve_schema(schema)
      allowed_types = Array(schema["type"])
      assert(
        allowed_types.empty? || allowed_types.any? { |type| schema_type?(type, value) },
        "#{path} expected #{allowed_types.join(' or ')}, got #{value.class}"
      )

      case value
      when Hash
        Array(schema["required"]).each do |field|
          assert value.key?(field), "#{path} is missing required field #{field.inspect}"
        end
        schema.fetch("properties", {}).each do |field, property_schema|
          assert_schema_value(property_schema, value[field], "#{path}.#{field}") if value.key?(field)
        end
      when Array
        value.each_with_index do |item, index|
          assert_schema_value(schema.fetch("items"), item, "#{path}[#{index}]")
        end
      end

      assert_includes schema["enum"], value, "#{path} is not in the documented enum" if schema["enum"]
      assert_operator value, :>=, schema["minimum"], "#{path} is below minimum" if schema["minimum"]
      assert_operator value, :<=, schema["maximum"], "#{path} is above maximum" if schema["maximum"]
      assert_match Regexp.new(schema["pattern"]), value, "#{path} does not match pattern" if schema["pattern"]
    end

    def resolve_schema(schema)
      return schema unless schema["$ref"]

      resolve_reference(schema)
    end

    def resolve_reference(value)
      return value unless value["$ref"]

      value["$ref"].delete_prefix("#/").split("/").reduce(@contract) { |current, key| current.fetch(key) }
    end

    def schema_type?(type, value)
      ruby_type = {
        "array" => Array,
        "integer" => Integer,
        "null" => NilClass,
        "object" => Hash,
        "string" => String
      }.fetch(type)
      value.is_a?(ruby_type)
    end
end
