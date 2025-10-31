# Test database seed file for E2E testing
# This replicates the data from test fixtures for Playwright tests

puts "Cleaning test database..."
ImageTag.destroy_all
ImageEmbedding.destroy_all
ImageCore.destroy_all
TagName.destroy_all
ImagePath.destroy_all
ImageToText.destroy_all

puts "Creating ImagePaths (with auto-discovery of image files)..."
# Note: ImagePath.after_save callback automatically creates ImageCore records for discovered files
path1 = ImagePath.create!(
  id: 1,
  name: "example_memes_1",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

path2 = ImagePath.create!(
  id: 2,
  name: "example_memes_2",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

puts "Creating TagNames..."
tag1 = TagName.create!(
  name: "tag_one",
  color: "#ff00d0",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

tag2 = TagName.create!(
  name: "tag_two",
  color: "#001eff",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

puts "Updating ImageCores with descriptions and tags..."
# ImageCores were auto-created by ImagePath callback, now add descriptions
image1 = ImageCore.find_by(image_path_id: 1, name: "all the fucks.jpg")
if image1
  image1.update!(description: "this image says all the fucks")
  # image1 has tag_one only
  ImageTag.create!(tag_name: tag1, image_core: image1)
end

image2 = ImageCore.find_by(image_path_id: 1, name: "both pills.jpeg")
if image2
  image2.update!(description: "this image says did you just take both pills?")
  # image2 has BOTH tag_one and tag_two
  ImageTag.create!(tag_name: tag1, image_core: image2)
  ImageTag.create!(tag_name: tag2, image_core: image2)
end

image3 = ImageCore.find_by(image_path_id: 2, name: "no.jpg")
if image3
  image3.update!(description: "this image has a bunny saying no")
  # image3 has tag_two only
  ImageTag.create!(tag_name: tag2, image_core: image3)
end

image4 = ImageCore.find_by(image_path_id: 2, name: "screenshot.jpg")
if image4
  image4.update!(description: "this image is of a cat saying weird knowledge increased")
  # image4 has NO tags
end

puts "Resetting ID sequences for all tables..."
# Reset sequences to avoid ID conflicts when creating new records
ActiveRecord::Base.connection.tables.each do |table|
  ActiveRecord::Base.connection.reset_pk_sequence!(table)
end

puts "Creating ImageToText models..."
# Florence-2-base is the default model
ImageToText.create!(
  name: "Florence-2-base",
  resource: "microsoft/Florence-2-base",
  description: "A popular series of small vision language models built by Microsoft, including a 250 Million (base) and a 700 Million (large) parameter variant.",
  current: true,  # Default model
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

ImageToText.create!(
  name: "Florence-2-large",
  resource: "microsoft/Florence-2-large",
  description: "The 700 Million parameter vision language model variant of the Florence-2 series.",
  current: false,
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

ImageToText.create!(
  name: "SmolVLM-256M-Instruct",
  resource: "HuggingFaceTB/SmolVLM-256M-Instruct",
  description: "A 256 Million parameter vision language model built by Hugging Face.",
  current: false,
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

ImageToText.create!(
  name: "SmolVLM-500M-Instruct",
  resource: "HuggingFaceTB/SmolVLM-500M-Instruct",
  description: "A 500 Million parameter vision language model built by Hugging Face.",
  current: false,
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

ImageToText.create!(
  name: "moondream2",
  resource: "vikhyatk/moondream2",
  description: "A 2 Billion parameter vision language model used for image captioning / extracting image text.",
  current: false,
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

puts "Test database seeded successfully!"
puts "  - #{ImagePath.count} image paths"
puts "  - #{TagName.count} tags"
puts "  - #{ImageCore.count} image cores (auto-discovered from directories)"
puts "  - #{ImageToText.count} image-to-text models"
