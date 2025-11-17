# Helper method to scan an image path directory
def scan_image_path(image_path)
  image_dir = Rails.root.join("public", "memes", image_path.name).to_s
  return unless File.directory?(image_dir)

  puts "  Scanning #{image_path.name}..."
  entries = Dir.entries(image_dir)
  allowed_extensions = %w[.jpeg .jpg .png .gif]

  entries.each do |entry|
    next if entry.start_with?('.')
    ext = File.extname(entry).downcase
    next unless allowed_extensions.include?(ext)

    # Create ImageCore if it doesn't exist
    unless ImageCore.exists?(name: entry, image_path: image_path)
      ImageCore.create!(
        name: entry,
        image_path: image_path,
        status: 0  # not_started
      )
      puts "    Created: #{entry}"
    end
  end
end

# create image_path record for example_memes_1 directory
base_dir = Dir.getwd
example_memes_subdir = "example_memes_1"
example_dir = base_dir + "/public/memes/" + example_memes_subdir
if File.directory?(example_dir)
  examples_path = ImagePath.find_or_create_by!(name: example_memes_subdir)
  # Scan the directory to create ImageCore records
  scan_image_path(examples_path)
end

# create image_path for memes in example_memes_2 directory
base_dir = Dir.getwd
example_memes_subdir = "example_memes_2"
example_dir = base_dir + "/public/memes/" + example_memes_subdir
if File.directory?(example_dir)
  examples_path = ImagePath.find_or_create_by!(name: example_memes_subdir)
  # Scan the directory to create ImageCore records
  scan_image_path(examples_path)
end

# Now add descriptions and embeddings to the images
puts "\nAdding descriptions to seed images..."

if ImageCore.exists?(1)
  example_1 = ImageCore.find(1)
  example_1.update({ description: "This image contains a bald man wearing sunglasses.  The text 'did you just take both pills?' is printed on the image.", status: 3 })
  example_1.refresh_description_embeddings
  puts "  Updated image 1"
end

if ImageCore.exists?(2)
  example_2 = ImageCore.find(2)
  example_2.update({ description: "In this image a woman dances in a field of flowers.  The text 'look at all the fucks I do not give' is printed on the image.", status: 3 })
  example_2.refresh_description_embeddings
  puts "  Updated image 2"
end

if ImageCore.exists?(3)
  example_3 = ImageCore.find(3)
  example_3.update({ description: "This image contains a bunny rabbit saying the word 'no'.", status: 3 })
  example_3.refresh_description_embeddings
  puts "  Updated image 3"
end

if ImageCore.exists?(4)
  example_4 = ImageCore.find(4)
  example_4.update({ description: "This image contains a strange looking cat.  The text 'weird knowledge increased' is printed on the image.", status: 3 })
  example_4.refresh_description_embeddings
  puts "  Updated image 4"
end

# create two tags
my_tag_name = "tag_one"
tag_one = TagName.new({ name: my_tag_name, color: "#ef4444" })
tag_one.save!

my_tag_name = "tag_two"
tag_two = TagName.new({ name: my_tag_name, color: "#d946ef" })
tag_two.save!

# tag a few images with these tags
current_imgs = ImageCore.order(created_at: :desc)
first_meme = current_imgs[0]
second_meme = current_imgs[1]
third_meme = current_imgs[2]
fourth_meme = current_imgs[3]

first_meme&.update({ image_tags_attributes: [ { tag_name: tag_one } ] })
second_meme&.update({ image_tags_attributes: [ { tag_name: tag_one }, { tag_name: tag_two } ] })
third_meme&.update({ image_tags_attributes: [ { tag_name: tag_two } ] })


# instantiate current image_to_text models
available_models = [ "Florence-2-base", "Florence-2-large", "SmolVLM-256M-Instruct", "SmolVLM-500M-Instruct",  "moondream2", "moondream2-int8" ]
resources = [ "https://huggingface.co/microsoft/Florence-2-base", "https://huggingface.co/microsoft/Florence-2-large", "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0", "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0", "https://huggingface.co/vikhyatk/moondream2", "https://huggingface.co/vikhyatk/moondream2" ]
descriptions = [
  'A popular series of small vision language models built by Microsoft, including a 250 Million (base) and a 700 Million (large) parameter variant.',
  'The 700 Million parameter vision language model variant of the Florence-2 series.',
  'A 256 Million parameter vision language model built by Hugging Face.',
  'A 500 Million parameter vision language model built by Hugging Face.',
  'A 2 Billion parameter vision language model used for image captioning / extracting image text.',
  'INT8 quantized version of Moondream2 (2B params) for memory-constrained hardware. Reduces memory from ~5GB to ~1.5-2GB with minimal quality loss. Ideal for CPU-only machines.' ]

available_models.each_with_index do |model_name, index|
  model = ImageToText.new({ name: model_name, resource: resources[index], description: descriptions[index], current: index != 0 ? false : true })
  model.save!
end
