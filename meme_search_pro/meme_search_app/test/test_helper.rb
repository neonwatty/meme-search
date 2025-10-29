# Coverage reporting must be started before loading application code
if ENV["COVERAGE"]
  require "simplecov"
  SimpleCov.start "rails" do
    add_filter "/test/"
    add_filter "/config/"
    add_filter "/vendor/"

    add_group "Models", "app/models"
    add_group "Controllers", "app/controllers"
    add_group "Channels", "app/channels"
    add_group "Helpers", "app/helpers"
    add_group "Jobs", "app/jobs"
    add_group "Mailers", "app/mailers"
  end
end

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers - 1 worker
    # parallelize(workers: 1)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end
