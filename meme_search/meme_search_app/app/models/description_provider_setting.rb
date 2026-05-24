# frozen_string_literal: true

class DescriptionProviderSetting < ApplicationRecord
  SINGLETON_KEY = 0
  PROVIDERS = %w[local openai].freeze
  OPENAI_MODELS = %w[gpt-4o-mini gpt-4.1-mini gpt-4.1].freeze
  DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"
  DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

  validates :singleton_key, presence: true, uniqueness: true, inclusion: { in: [ SINGLETON_KEY ] }
  validates :provider, inclusion: { in: PROVIDERS }
  validates :openai_base_url, presence: true
  validates :openai_model, inclusion: { in: OPENAI_MODELS }
  validates :openai_last_test_status, inclusion: { in: %w[not_tested passed failed] }

  before_validation :apply_defaults

  def self.current
    find_or_create_by!(singleton_key: SINGLETON_KEY) do |setting|
      setting.provider = "local"
      setting.openai_base_url = DEFAULT_OPENAI_BASE_URL
      setting.openai_model = DEFAULT_OPENAI_MODEL
      setting.openai_last_test_status = "not_tested"
    end
  end

  def self.openai_model_options
    OPENAI_MODELS
  end

  def openai_api_key
    return if openai_api_key_ciphertext.blank?

    encryptor.decrypt_and_verify(openai_api_key_ciphertext)
  rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveSupport::MessageEncryptor::InvalidMessage
    nil
  end

  def openai_api_key=(value)
    normalized = value.to_s.strip
    return if normalized.blank?

    self.openai_api_key_ciphertext = encryptor.encrypt_and_sign(normalized)
    self.openai_key_last_four = normalized.last(4)
  end

  def clear_openai_api_key
    self.openai_api_key_ciphertext = nil
    self.openai_key_last_four = nil
  end

  def saved_openai_api_key?
    openai_api_key_ciphertext.present?
  end

  def redacted_openai_api_key
    return "Not saved" unless saved_openai_api_key? && openai_key_last_four.present?

    "sk-...#{openai_key_last_four}"
  end

  private

    def apply_defaults
      self.singleton_key = SINGLETON_KEY if singleton_key.nil?
      self.provider = "local" if provider.blank?
      self.openai_base_url = DEFAULT_OPENAI_BASE_URL if openai_base_url.blank?
      self.openai_model = DEFAULT_OPENAI_MODEL if openai_model.blank?
      self.openai_last_test_status = "not_tested" if openai_last_test_status.blank?
    end

    def encryptor
      key = ActiveSupport::KeyGenerator.new(Rails.application.secret_key_base).generate_key("openai-api-key", 32)
      ActiveSupport::MessageEncryptor.new(key)
    end
end
