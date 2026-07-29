require_relative "boot"

require "rails/all"
require "ipaddr"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module MemeSearch
  module HostAuthorization
    HOST_LABEL = /[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?/i
    HOSTNAME = /\A#{HOST_LABEL}(?:\.#{HOST_LABEL})*\z/

    BUILT_IN_HOSTS = [
      "localhost",
      "meme_search",
      "rails-app",
      "host.docker.internal",
      IPAddr.new("127.0.0.0/8"),
      IPAddr.new("::1")
    ].freeze

    def self.allowed_hosts(extra_hosts: ENV["MEME_SEARCH_ALLOWED_HOSTS"])
      BUILT_IN_HOSTS + parse_extra_hosts(extra_hosts)
    end

    def self.parse_extra_hosts(value)
      value.to_s.split(",").filter_map do |entry|
        host = entry.strip
        next if host.empty?

        parse_exact_host(host)
      end.uniq
    end

    def self.parse_exact_host(host)
      if host.include?("/") || host.include?("*") || host.start_with?(".")
        raise ArgumentError, "MEME_SEARCH_ALLOWED_HOSTS only accepts exact hostnames or IP addresses"
      end

      IPAddr.new(host)
    rescue IPAddr::InvalidAddressError
      return host if HOSTNAME.match?(host)

      raise ArgumentError, "MEME_SEARCH_ALLOWED_HOSTS contains an invalid host"
    end
    private_class_method :parse_exact_host
  end

  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    if defined?(Dotenv)
      root = "./"
      dotenv_path = File.join(root, ".env")
      Dotenv.load(dotenv_path) if File.exist?(dotenv_path)
    end

    config.active_job.queue_adapter = :solid_queue
  end
end
