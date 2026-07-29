class ImageEmbedding < ApplicationRecord
  belongs_to :image_core

  validates :snippet, presence: true
  validates_length_of :embedding, maximum: 384, allow_blank: true
  has_neighbors :embedding
  before_save :compute_embedding, if: -> { embedding.nil? }

  def get_neighbors(limit: ImageSearchQuery::DEFAULT_RESULT_LIMIT, image_core_ids: nil)
    relation = nearest_neighbors(:embedding, distance: "cosine")
    relation = relation.where(image_core_id: image_core_ids) if image_core_ids
    relation.first(limit)
  end

  def get_neighbor_image_core_ids(limit: ImageSearchQuery::DEFAULT_RESULT_LIMIT, image_core_ids: nil)
    ranked_embeddings = nearest_neighbors(:embedding, distance: "cosine")
    ranked_embeddings = ranked_embeddings.where(image_core_id: image_core_ids) if image_core_ids

    self.class
      .from("(#{ranked_embeddings.reorder(nil).to_sql}) ranked_embeddings")
      .group("ranked_embeddings.image_core_id")
      .order(
        Arel.sql("MIN(ranked_embeddings.neighbor_distance) ASC"),
        Arel.sql("ranked_embeddings.image_core_id ASC")
      )
      .limit(limit)
      .pluck(Arel.sql("ranked_embeddings.image_core_id"))
  end

  def compute_embedding
    self.embedding = $embedding_model.call(self.snippet)
  end
end
