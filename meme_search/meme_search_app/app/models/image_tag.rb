class ImageTag < ApplicationRecord
  belongs_to :tag_name
  belongs_to :image_core
end
