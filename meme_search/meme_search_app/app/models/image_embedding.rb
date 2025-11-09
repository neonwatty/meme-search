class ImageEmbedding < ApplicationRecord
  belongs_to :image_core

  validates :snippet, presence: true
  validates_length_of :embedding, maximum: 384, allow_blank: true
  has_neighbors :embedding
  before_save :compute_embedding, if: -> { embedding.nil? }

  def get_neighbors
    nearest_neighbors(:embedding, distance: "cosine").first(10)
  end

  def compute_embedding
    self.embedding = $embedding_model.call(self.snippet)
  end
end
