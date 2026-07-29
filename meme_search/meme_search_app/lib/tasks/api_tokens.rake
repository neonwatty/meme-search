namespace :api_tokens do
  desc "Create a read-only API token (EXPIRES_AT must be ISO 8601 with a timezone)"
  task create: :environment do
    name = ENV.fetch("NAME", "").strip
    abort "NAME is required" if name.empty?

    scopes = ENV.fetch("SCOPES", ApiToken::ALLOWED_SCOPES.join(",")).split(",").map(&:strip)
    expires_at = ApiToken.parse_expiry!(ENV["EXPIRES_AT"])
    token, raw_token = ApiToken.issue!(name: name, scopes: scopes, expires_at: expires_at)

    puts "Created API token #{token.token_prefix} for #{token.name}."
    puts "Copy it now; it is stored only as a digest:"
    puts raw_token
  rescue ArgumentError
    abort "Token was not created: EXPIRES_AT must be an ISO 8601 timestamp with a timezone."
  rescue ActiveRecord::RecordInvalid => e
    abort "Token was not created: #{e.record.errors.full_messages.to_sentence}."
  end

  desc "List API tokens without revealing secrets"
  task list: :environment do
    ApiToken.order(:created_at).find_each do |token|
      state = if token.revoked_at?
        "revoked"
      elsif token.expires_at? && token.expires_at <= Time.current
        "expired"
      else
        "active"
      end
      puts [ token.token_prefix, state, token.scopes.join(","), token.name ].join("\t")
    end
  end

  desc "Revoke an API token by its displayed prefix (PREFIX=ms_...)"
  task revoke: :environment do
    prefix = ENV.fetch("PREFIX", "").strip
    abort "PREFIX is required" if prefix.empty?

    matches = ApiToken.where(token_prefix: prefix)
    abort "No token matches #{prefix}" if matches.empty?
    abort "Prefix #{prefix} matches multiple tokens; use the Rails console to revoke by ID" if matches.many?

    matches.first.revoke!
    puts "Revoked API token #{prefix}."
  end
end
