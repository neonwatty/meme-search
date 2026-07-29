# frozen_string_literal: true

# Rails' controller rate limiter defaults to the application cache. Native
# development intentionally uses NullStore when fragment caching is disabled,
# so API request counters need a small, explicit store of their own.
Rails.application.config.x.api_rate_limit_store =
  if Rails.env.test?
    ActiveSupport::Cache::MemoryStore.new
  else
    ActiveSupport::Cache::FileStore.new(Rails.root.join("tmp/cache/api-rate-limits"))
  end
