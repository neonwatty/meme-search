class ImagePath < ApplicationRecord
  validates :name, presence: true, uniqueness: { message: "path already used" }
  validates :name, length: {
    minimum: 1,
    maximum: 300,
    too_short: "Path name must have at least %{count} characters.",
    too_long: "Path name must have no more than %{count} characters."
  }
  has_many :image_cores, dependent: :destroy
  has_many :image_tags, through: :image_cores

  validate :valid_dir
  after_save :list_files_in_directory

  private

    def valid_dir
      base_dir = Dir.getwd
      full_path = base_dir + "/public/memes/" + self.name
      puts full_path
      unless self.name.length > 0 && File.directory?(full_path)
        self.errors.add :name, message: "The input path - #{self.name} - is not a valid subdirectory in /public/memes"
      end
    end

    def count_images
    end

  def list_files_in_directory
    base_dir = Dir.getwd
    full_path = base_dir + "/public/memes/" + self.name

    # Return early if directory doesn't exist
    unless File.directory?(full_path)
      puts "Directory does not exist."
      return { added: 0, removed: 0 }
    end

    # allowed extensions
    allowed_extensions = [ ".jpg", ".jpeg", ".png", ".webp" ]

    # get images from filesystem
    image_names = Dir.entries(full_path).select do |f|
      file_path = File.join(full_path, f)
      File.file?(file_path) && allowed_extensions.include?(File.extname(f).downcase)
    end

    # Convert to set for O(1) lookup
    filesystem_files = image_names.to_set

    added_count = 0
    removed_count = 0

    # Add new images (find_or_create to prevent duplicates on rescans)
    image_names.each do |f|
      image_core = ImageCore.find_or_create_by!(image_path: self, name: f)
      # Track if it was newly created
      added_count += 1 if image_core.previously_new_record?
    end

    # Remove orphaned records (files that no longer exist on disk)
    image_cores.each do |image_core|
      unless filesystem_files.include?(image_core.name)
        image_core.destroy # Triggers before_destroy callback and cascade deletes
        removed_count += 1
      end
    end

    # Print the filtered files
    if image_names.empty?
      puts "No image files found."
    else
      puts "Image files in directory:"
      image_names.each { |file| puts file }
      image_names.map { |f| File.join(full_path, f) }.each { |file| puts file }
    end

    { added: added_count, removed: removed_count }
  end
end
