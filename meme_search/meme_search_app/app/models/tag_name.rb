class TagName < ApplicationRecord
  validates_uniqueness_of :name, presence: true
  validates :color, presence: true
  validates_length_of :name, minimum: 1, maximum: 20, allow_blank: false
  has_many :image_tags, dependent: :destroy
end
