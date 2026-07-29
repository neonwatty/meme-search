require "test_helper"

class ApiTokensSchemaTest < ActiveSupport::TestCase
  test "prepared databases include the forward api tokens migration" do
    migration_versions = ActiveRecord::Base.connection_pool.migration_context.get_all_versions

    assert_includes migration_versions, 20_260_728_000_000
    assert ActiveRecord::Base.connection.table_exists?(:api_tokens)
  end

  test "api token schema stores digests and lifecycle metadata but no raw secret" do
    columns = ActiveRecord::Base.connection.columns(:api_tokens).index_by(&:name)

    assert_equal false, columns.fetch("name").null
    assert_equal false, columns.fetch("token_digest").null
    assert_equal false, columns.fetch("token_prefix").null
    assert_equal false, columns.fetch("scopes").null
    assert_equal "[]", columns.fetch("scopes").default
    assert columns.key?("last_used_at")
    assert columns.key?("expires_at")
    assert columns.key?("revoked_at")
    assert_not columns.key?("token")
    assert_not columns.key?("raw_token")
  end

  test "api token digest is uniquely indexed and safe prefix is indexed" do
    indexes = ActiveRecord::Base.connection.indexes(:api_tokens).index_by(&:name)

    assert_equal [ "token_digest" ], indexes.fetch("index_api_tokens_on_token_digest").columns
    assert indexes.fetch("index_api_tokens_on_token_digest").unique
    assert_equal [ "token_prefix" ], indexes.fetch("index_api_tokens_on_token_prefix").columns
    assert_not indexes.fetch("index_api_tokens_on_token_prefix").unique
    assert_equal [ "revoked_at" ], indexes.fetch("index_api_tokens_on_revoked_at").columns
  end
end
