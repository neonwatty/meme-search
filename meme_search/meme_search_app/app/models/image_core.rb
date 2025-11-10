require "informers"
require "net/http"
require "uri"


class ImageCore < ApplicationRecord
  # keyword search scope
  include PgSearch::Model
  pg_search_scope :search_any_word,
                  against: [ :description ],
                  using: {
                    tsearch: { any_word: true }
                  }

  # tag association + lookup scope
  belongs_to :image_path
  has_many :image_tags, dependent: :destroy
  accepts_nested_attributes_for :image_tags, allow_destroy: true

  # tag lookup scope
  scope :with_selected_tag_names, ->(selected_tag_names) {
    joins(image_tags: :tag_name)
      .where(tag_names: { name: selected_tag_names })
      .distinct
      .order(created_at: :desc)
  }

  # embedding association + lookup scope
  has_many :image_embeddings, dependent: :destroy

  # embedding lookup scope
  scope :without_embeddings, -> {
    left_outer_joins(:image_embeddings).where(image_embeddings: { id: nil })
  }

  # validations
  validates_length_of :name, presence: true, minimum: 0, maximum: 100, allow_blank: false
  validates_length_of :description, minimum: 0, maximum: 500, allow_blank: true
  enum :status, [
    :not_started,
    :in_queue,
    :processing,
    :done,
    :removing,
    :failed
  ]
  validates :status, presence: true

  before_destroy :remove_image_text_job

  # before save create description embeddings
  # before_save :refresh_description_embeddings

  def remove_image_text_job
    # send request
    begin # For local / native metal testing
      uri = URI.parse("http://#{ENV["APP_HOST"]}:#{ENV["GEN_PORT"]}/remove_job/#{self.id}")
      http = Net::HTTP.new(uri.host, uri.port)

      # Try to make a request to the first URI
      request = Net::HTTP::Delete.new(uri.request_uri)
      request["Content-Type"] = "application/json"
      response = http.request(request)

      if response.is_a?(Net::HTTPSuccess)
        puts "Job removed successfully for image core #{self.id}: #{response.body}"
      else
        puts "Failed to remove job for #{self.id}: #{response.code} - #{response.body}"
      end

    rescue SocketError, Errno::ECONNREFUSED => e  # For compose runner (when app run in docker network)
      begin
        # If the connection fails, use the backup URI
        uri = URI.parse("http://image_to_text_app:8000/remove_job/#{self.id}")
        http = Net::HTTP.new(uri.host, uri.port)

        # Try to make a request to the first URI
        request = Net::HTTP::Delete.new(uri.request_uri)
        request["Content-Type"] = "application/json"
        response = http.request(request)

        if response.is_a?(Net::HTTPSuccess)
          puts "Job removed successfully for image core #{self.id}: #{response.body}"
        else
          puts "Failed to remove job for #{self.id}: #{response.code} - #{response.body}"
        end
      rescue
      end
    end
  end

  def refresh_description_embeddings
    # destroy current description embeddings
    begin
      current_embeddings = ImageEmbedding.where({ image_core_id: self.id })
      current_embeddings.map { |item| item.destroy! }
      current_embeddings = ImageEmbedding.where({ image_core_id: self.id })
    rescue StandardError => e
      puts "THE DESTROY EXCEPTION --> #{e}"
    end
    if !self.description.nil?
      if self.description.length > 0
        snippets = chunk_text(self.description)
        snippets_hash = snippets.map.with_index { |snippet, index| { image_core_id: self.id, snippet: snippet } }
        snippets_hash.map { |hash| ImageEmbedding.new(hash).save! }
      end
    end
  end

  private

    def clean_word(text)
      # clean input text - keeping only lower case letters, numbers, punctuation, and single quote symbols
      cleaned_text = text.downcase.strip.gsub(/[^a-z0-9,.!?']/, " ")
      cleaned_text.gsub!(/\s+/, " ")
      cleaned_text
    end

    def chunk_text(text)
      # split and clean input text
      text_split = clean_word(text).split(" ")
      text_split.reject!(&:empty?)

      # use two pointers to create chunks
      chunk_size = 4
      overlap_size = 2

      # create next chunk by moving right pointer until chunk_size is reached or line_number changes by more than 1 or end of word_sequence is reached
      left_pointer = 0
      right_pointer = chunk_size - 1
      chunks = []

      if right_pointer >= text_split.length
        chunks << text_split.join(" ")
      else
        while right_pointer < text_split.length
          # create chunk
          chunk = text_split[left_pointer..right_pointer]

          # move left pointer
          left_pointer += chunk_size - overlap_size

          # move right pointer
          right_pointer += chunk_size - overlap_size

          # store chunk
          chunks << chunk.join(" ")
        end

        # check if there is final chunk
        if left_pointer < text_split.length
          last_chunk = text_split[left_pointer..-1]
          chunks << last_chunk.join(" ")
        end
      end

      # insert the full text
      if chunks.length > 1
        chunks.insert(0, text.downcase)
      end

      chunks
    end
end
