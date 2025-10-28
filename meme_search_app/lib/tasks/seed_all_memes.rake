namespace :db do
  desc "Seed database with all memes from public/memes directories"
  task seed_all_memes: :environment do
    puts "🖼️  Starting comprehensive meme seeding..."

    # Define all meme directories
    meme_dirs = ["example_memes_1", "example_memes_2", "example_memes_3", "memes/sample_memes"]

    meme_dirs.each do |memes_dir|
      puts "\n📁 Processing directory: #{memes_dir}"

      # For nested paths, adjust the file path
      if memes_dir.include?("/")
        parts = memes_dir.split("/")
        full_path = Rails.root.join("public", "memes", *parts)
      else
        full_path = Rails.root.join("public", "memes", memes_dir)
      end

      unless File.directory?(full_path)
        puts "⚠️  Directory not found: #{full_path}"
        next
      end

      # Create or find the ImagePath record
      image_path = ImagePath.find_or_create_by!(name: memes_dir) do |path|
        path.name = memes_dir
        puts "✅ Created ImagePath: #{memes_dir}"
      end

      # Get all image files in the directory
      image_files = Dir.glob(full_path.join("*.{jpg,jpeg,png,gif,webp}"))

      if image_files.empty?
        puts "❌ No image files found in #{full_path}"
        next
      end

      puts "📁 Found #{image_files.length} image files"

      # Process each image file
      image_files.each do |file_path|
        filename = File.basename(file_path)
        name = File.basename(filename, File.extname(filename))

        # Create a human-readable name from the filename
        display_name = name.split('_').map(&:capitalize).join(' ')

        # Check if this meme already exists
        existing = ImageCore.find_by(name: filename, image_path: image_path)

        if existing
          puts "⏭️  Skipping existing meme: #{filename}"
          next
        end

        # Create the ImageCore record
        image_core = ImageCore.create!(
          name: filename,
          description: nil,  # No description initially
          image_path: image_path,
          status: :not_started
        )

        puts "✅ Created ImageCore: #{filename} (ID: #{image_core.id})"
      end
    end

    puts "\n🎉 Comprehensive meme seeding completed!"
    puts "📊 Total ImagePaths: #{ImagePath.count}"
    puts "📊 Total ImageCores: #{ImageCore.count}"
    puts "📊 Total ImageEmbeddings: #{ImageEmbedding.count}"
  end
end
