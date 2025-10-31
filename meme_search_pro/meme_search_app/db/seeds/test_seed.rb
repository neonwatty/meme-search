# Test database seed file for E2E testing
# This replicates the data from test fixtures for Playwright tests

puts "Cleaning test database..."
ImageTag.destroy_all
ImageEmbedding.destroy_all
ImageCore.destroy_all
TagName.destroy_all
ImagePath.destroy_all
ImageToText.destroy_all

puts "Creating ImagePaths..."
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

puts "Creating ImageCores..."
image1 = ImageCore.create!(
  image_path_id: 1,
  name: "all the fucks.jpg",
  description: "this image says all the fucks",
  status: "not_started",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

image2 = ImageCore.create!(
  image_path_id: 1,
  name: "both pills.jpeg",
  description: "this image says did you just take both pills?",
  status: "not_started",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

image3 = ImageCore.create!(
  image_path_id: 2,
  name: "no.jpg",
  description: "this image has a bunny saying no",
  status: "not_started",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

image4 = ImageCore.create!(
  image_path_id: 2,
  name: "screenshot.jpg",
  description: "this image is of a cat saying weird knowledge increased",
  status: "not_started",
  created_at: "2019-01-01 00:00:00",
  updated_at: "2019-01-01 00:00:00"
)

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
puts "  - #{ImageCore.count} image cores"
puts "  - #{ImageToText.count} image-to-text models"
