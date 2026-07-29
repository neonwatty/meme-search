# frozen_string_literal: true

require "digest"
require "securerandom"
require "time"

class ApiToken < ApplicationRecord
  TOKEN_PREFIX = "ms_"
  ALLOWED_SCOPES = %w[search:read media:read].freeze
  LAST_USED_WRITE_INTERVAL = 5.minutes
  TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})\z/

  validates :name, presence: true, length: { maximum: 100 }
  validates :token_digest, presence: true, uniqueness: true
  validates :token_prefix, presence: true
  validate :at_least_one_scope
  validate :scopes_are_supported
  validate :expires_at_must_be_in_the_future, if: -> { expires_at.present? && will_save_change_to_expires_at? }

  scope :active, -> {
    where(revoked_at: nil)
      .where("expires_at IS NULL OR expires_at > ?", Time.current)
  }

  def self.issue!(name:, scopes: ALLOWED_SCOPES, expires_at: nil)
    raw_token = "#{TOKEN_PREFIX}#{SecureRandom.urlsafe_base64(32)}"
    record = create!(
      name: name,
      token_digest: digest(raw_token),
      token_prefix: raw_token.first(11),
      scopes: Array(scopes).map(&:to_s).uniq,
      expires_at: expires_at
    )

    [ record, raw_token ]
  end

  def self.authenticate(raw_token)
    return if raw_token.blank? || !raw_token.start_with?(TOKEN_PREFIX)

    active.find_by(token_digest: digest(raw_token))
  end

  def self.parse_expiry!(value)
    return if value.blank?
    raise ArgumentError unless value.match?(TIMEZONE_SUFFIX)

    Time.iso8601(value)
  end

  def self.digest(raw_token)
    Digest::SHA256.hexdigest(raw_token.to_s)
  end

  def scope?(scope)
    scopes.include?(scope.to_s)
  end

  def revoke!
    return self if revoked_at?

    update!(revoked_at: Time.current)
  end

  def expired?
    expires_at.present? && expires_at <= Time.current
  end

  def lifecycle_status
    return "revoked" if revoked_at?
    return "expired" if expired?

    "active"
  end

  def record_use!
    return if last_used_at.present? && last_used_at > LAST_USED_WRITE_INTERVAL.ago

    update_column(:last_used_at, Time.current)
  end

  private

    def at_least_one_scope
      errors.add(:scopes, "must include at least one read scope") if Array(scopes).empty?
    end

    def scopes_are_supported
      unsupported = Array(scopes).map(&:to_s) - ALLOWED_SCOPES
      errors.add(:scopes, "contain unsupported values: #{unsupported.join(", ")}") if unsupported.any?
    end

    def expires_at_must_be_in_the_future
      errors.add(:expires_at, "must be in the future") unless expires_at.future?
    end
end
