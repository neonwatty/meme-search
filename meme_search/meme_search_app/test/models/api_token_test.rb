require "test_helper"

class ApiTokenTest < ActiveSupport::TestCase
  test "issues a token while storing only its digest" do
    token, raw_token = ApiToken.issue!(name: "Local CLI", scopes: [ "search:read" ])

    assert raw_token.start_with?(ApiToken::TOKEN_PREFIX)
    assert_equal ApiToken.digest(raw_token), token.token_digest
    assert_not_equal raw_token, token.token_digest
    assert_equal token, ApiToken.authenticate(raw_token)
    assert_not ApiToken.where(token_digest: raw_token).exists?
    assert_not_includes token.attributes.values, raw_token
  end

  test "rejects revoked and expired tokens" do
    revoked, revoked_raw = ApiToken.issue!(name: "Revoked")
    revoked.revoke!
    expired, expired_raw = ApiToken.issue!(name: "Expired", expires_at: 1.day.from_now)
    expired.update_column(:expires_at, 1.minute.ago)

    assert_nil ApiToken.authenticate(revoked_raw)
    assert_nil ApiToken.authenticate(expired_raw)
    assert_predicate expired, :persisted?
  end

  test "rejects unsupported scopes" do
    assert_raises ActiveRecord::RecordInvalid do
      ApiToken.issue!(name: "Writer", scopes: [ "library:write" ])
    end
  end

  test "requires at least one read scope" do
    assert_raises ActiveRecord::RecordInvalid do
      ApiToken.issue!(name: "No access", scopes: [])
    end
  end

  test "reports lifecycle status and preserves revocation time" do
    active, = ApiToken.issue!(name: "Active")
    expired, = ApiToken.issue!(name: "Expired status", expires_at: 1.day.from_now)
    expired.update_column(:expires_at, 1.minute.ago)

    assert_equal "active", active.lifecycle_status
    assert_equal "expired", expired.lifecycle_status

    active.revoke!
    revoked_at = active.reload.revoked_at
    travel 1.minute do
      active.revoke!
    end

    assert_equal "revoked", active.lifecycle_status
    assert_equal revoked_at, active.reload.revoked_at
  end

  test "records recent use without writing on every request" do
    token, = ApiToken.issue!(name: "Local CLI")
    token.record_use!
    first_used_at = token.reload.last_used_at

    travel 1.minute do
      assert_no_changes -> { token.reload.updated_at } do
        token.record_use!
      end
    end

    assert_equal first_used_at, token.reload.last_used_at
  end

  test "shared issuance rejects a past expiry without persisting a token" do
    assert_no_difference("ApiToken.count") do
      error = assert_raises ActiveRecord::RecordInvalid do
        ApiToken.issue!(name: "Already expired", expires_at: 1.minute.ago)
      end

      assert_includes error.record.errors[:expires_at], "must be in the future"
    end
  end

  test "naturally expired tokens can still be revoked without changing expiry" do
    token, = ApiToken.issue!(name: "Expires soon", expires_at: 1.day.from_now)
    token.update_column(:expires_at, 1.minute.ago)

    assert_nothing_raised { token.revoke! }
    assert token.reload.revoked_at?
  end

  test "expiry parsing requires an explicit timezone" do
    parsed = ApiToken.parse_expiry!("2030-01-15T12:30:00-07:00")

    assert_equal Time.utc(2030, 1, 15, 19, 30), parsed
    assert_raises(ArgumentError) { ApiToken.parse_expiry!("2030-01-15T12:30:00") }
  end
end
