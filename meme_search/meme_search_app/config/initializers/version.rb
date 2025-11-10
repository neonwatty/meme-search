# frozen_string_literal: true

# Load application version from VERSION file at repository root
VERSION_FILE = Rails.root.join("..", "..", "VERSION")
APP_VERSION = if File.exist?(VERSION_FILE)
  File.read(VERSION_FILE).strip
else
  "unknown"
end
