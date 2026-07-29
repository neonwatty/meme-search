require "test_helper"
require "rake"

class ApiTokensRakeTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks unless Rake::Task.task_defined?("api_tokens:create")
    @task = Rake::Task["api_tokens:create"]
    @saved_environment = ENV.to_h.slice("NAME", "SCOPES", "EXPIRES_AT")
    ENV["NAME"] = "Rake client"
    ENV["SCOPES"] = "search:read"
  end

  teardown do
    %w[NAME SCOPES EXPIRES_AT].each { |key| ENV.delete(key) }
    @saved_environment.each { |key, value| ENV[key] = value }
    @task.reenable
  end

  test "create rejects an already expired timestamp without printing a secret" do
    ENV["EXPIRES_AT"] = 1.minute.ago.iso8601

    _stdout, stderr = capture_io do
      assert_raises(SystemExit) { @task.invoke }
    end

    assert_no_match(/Created API token/, stderr)
    assert_no_match(/ms_[A-Za-z0-9_-]{43}/, stderr)
    assert_match(/must be in the future/, stderr)
    assert_equal 0, ApiToken.where(name: "Rake client").count
  end

  test "create accepts a future offset bearing timestamp" do
    ENV["EXPIRES_AT"] = Time.new(2030, 1, 15, 12, 30, 0, "-07:00").iso8601

    stdout, _stderr = capture_io { @task.invoke }
    token = ApiToken.find_by!(name: "Rake client")

    assert_match(/Created API token/, stdout)
    assert_match(/ms_[A-Za-z0-9_-]{43}/, stdout)
    assert_equal Time.utc(2030, 1, 15, 19, 30), token.expires_at
  end

  test "create rejects a zone less timestamp without printing a secret" do
    ENV["EXPIRES_AT"] = "2030-01-15T12:30:00"

    _stdout, stderr = capture_io do
      assert_raises(SystemExit) { @task.invoke }
    end

    assert_match(/ISO 8601 timestamp with a timezone/, stderr)
    assert_no_match(/ms_[A-Za-z0-9_-]{43}/, stderr)
    assert_equal 0, ApiToken.where(name: "Rake client").count
  end
end
