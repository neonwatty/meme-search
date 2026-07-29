class ImagePath < ApplicationRecord
  include ActionView::Helpers::DateHelper

  SCAN_FREQUENCIES = {
    nil => "Manual only",
    30 => "Every 30 minutes",
    60 => "Every hour",
    360 => "Every 6 hours",
    1440 => "Daily"
  }.freeze

  enum :scan_status, { idle: 0, scanning: 1, failed: 2 }, prefix: false

  validates :name, presence: true, uniqueness: { message: "path already used" }
  validates :name, length: {
    minimum: 1,
    maximum: 300,
    too_short: "Path name must have at least %{count} characters.",
    too_long: "Path name must have no more than %{count} characters."
  }
  validates :scan_frequency_minutes, inclusion: { in: SCAN_FREQUENCIES.keys }, allow_nil: true

  has_many :image_cores, dependent: :destroy
  has_many :image_tags, through: :image_cores

  validate :valid_dir
  after_save :list_files_in_directory

  # Ensure the direct-uploads ImagePath exists
  def self.ensure_direct_uploads_path!
    direct_uploads_path = find_or_initialize_by(name: "direct-uploads")

    if direct_uploads_path.new_record?
      # Create the directory if it doesn't exist
      full_path = Rails.root.join("public", "memes", "direct-uploads")
      FileUtils.mkdir_p(full_path) unless File.directory?(full_path)

      # Save with manual scan only (no auto-scan)
      direct_uploads_path.scan_frequency_minutes = nil
      direct_uploads_path.save!
    end

    direct_uploads_path
  end

  # Auto-scan feature methods
  def auto_scan_enabled?
    scan_frequency_minutes.present?
  end

  def due_for_scan?
    return false unless auto_scan_enabled?
    return true if last_scanned_at.nil?
    Time.current >= next_scan_time
  end

  def next_scan_time
    return nil unless auto_scan_enabled?
    return Time.current if last_scanned_at.nil?
    last_scanned_at + scan_frequency_minutes.minutes
  end

  def time_until_next_scan
    return "Manual only" unless auto_scan_enabled?
    return "Due now" if due_for_scan?
    distance_of_time_in_words(Time.current, next_scan_time, include_seconds: false)
  end

  def directory_path
    relative_path = Pathname.new(name.to_s).cleanpath
    segments = relative_path.each_filename.to_a

    return if relative_path.absolute?
    return if segments.empty? || segments.any? { |segment| segment == ".." }

    memes_root = Rails.root.join("public", "memes").cleanpath
    current_path = memes_root

    segments.each do |segment|
      current_path = current_path.join(segment)
      return if current_path.symlink?
    end

    current_path.cleanpath
  end

  def scan_and_update!
    return if currently_scanning?

    with_lock do
      update_columns(currently_scanning: true, scan_status: :scanning, last_scan_error: nil)
      start_time = Time.current

      begin
        result = list_files_in_directory
        duration_ms = ((Time.current - start_time) * 1000).to_i

        update_columns(
          last_scanned_at: Time.current,
          scan_status: :idle,
          currently_scanning: false,
          last_scan_duration_ms: duration_ms,
          last_scan_error: nil
        )

        Rails.logger.info(
          "[Scan] #{name} - Duration: #{duration_ms}ms, Added: #{result[:added]}, " \
          "Removed: #{result[:removed]}, Unsafe: #{result[:unsafe]}"
        )
        result
      rescue => e
        update_columns(
          scan_status: :failed,
          currently_scanning: false,
          last_scan_error: e.message
        )
        Rails.logger.error "[Scan] #{name} - Failed: #{e.message}"
        raise
      end
    end
  end

  private

    def valid_dir
      return if self.name.blank?

      full_path = directory_path
      unless full_path&.directory?
        self.errors.add :name, message: "The input path - #{self.name} - is not a valid subdirectory in /public/memes"
      end
    end

    def count_images
    end

  def list_files_in_directory
    full_path = directory_path

    # Return early if directory doesn't exist
    unless full_path&.directory?
      Rails.logger.warn "[Scan] Refusing invalid or missing meme directory: #{name.inspect}"
      return { added: 0, removed: 0 }
    end

    # allowed extensions
    allowed_extensions = [ ".jpg", ".jpeg", ".png", ".webp", ".gif" ]

    # Classify supported names before reconciling records. Unsafe-but-present
    # entries are never indexed, but retaining their existing records avoids
    # destructive metadata loss when upgrading from older symlink behavior.
    image_names = []
    unsafe_names = []
    candidate_names = Dir.entries(full_path).select do |f|
      allowed_extensions.include?(File.extname(f).downcase)
    end

    candidate_names.each do |name|
      file_path = File.join(full_path, name)

      if File.symlink?(file_path)
        unsafe_names << name
      elsif File.file?(file_path)
        image_names << name
      elsif File.exist?(file_path) || File.lexist?(file_path)
        unsafe_names << name
      end
    rescue SystemCallError
      # A permission or transient stat failure is not proof that the entry was
      # deleted. Preserve any existing record for this scan and try again later.
      unsafe_names << name
    end

    if unsafe_names.any?
      Rails.logger.warn(
        "[Scan] #{self.name} - Preserving metadata for unsafe entries that were not indexed: " \
        "#{unsafe_names.join(", ")}"
      )
    end

    # Convert present safe and unsafe names to a set for O(1) lookup. Truly
    # missing names are still removed below.
    filesystem_entries = (image_names + unsafe_names).to_set

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
      unless filesystem_entries.include?(image_core.name)
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

    { added: added_count, removed: removed_count, unsafe: unsafe_names.length }
  end
end
