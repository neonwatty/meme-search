# frozen_string_literal: true

# Load application version from VERSION file
# In development: two levels up from Rails.root (repository root)
# In Docker: Rails.root (copied during build)
VERSION_FILE = if File.exist?(Rails.root.join("VERSION"))
  Rails.root.join("VERSION")
else
  Rails.root.join("..", "..", "VERSION")
end

APP_VERSION = if File.exist?(VERSION_FILE)
  File.read(VERSION_FILE).strip
else
  "unknown"
end
