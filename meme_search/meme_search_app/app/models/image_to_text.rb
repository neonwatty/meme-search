class ImageToText < ApplicationRecord
    validates :name, presence: true
    validates :resource, presence: true
    validates :description, presence: true
    validates :current, inclusion: { in: [ true, false ] }
    validates_length_of :name, minimum: 1, maximum: 100, allow_blank: false
    validates_length_of :description, minimum: 1, maximum: 1000, allow_blank: false
end
