class ImageUploadsController < ApplicationController
  # Maximum file size: 10MB
  MAX_FILE_SIZE = 10.megabytes

  # Allowed file extensions
  ALLOWED_EXTENSIONS = %w[.jpg .jpeg .png .webp].freeze

  def new
    # Render the upload form
  end

  def create
    uploaded_files = params[:files]

    if uploaded_files.blank?
      render json: { error: "No files selected" }, status: :unprocessable_entity
      return
    end

    results = {
      success: [],
      errors: []
    }

    # Ensure direct-uploads ImagePath exists
    direct_uploads_path = ImagePath.ensure_direct_uploads_path!

    uploaded_files.each do |file|
      result = process_upload(file, direct_uploads_path)

      if result[:success]
        results[:success] << result
      else
        results[:errors] << result
      end
    end

    # Trigger scan to create ImageCore records for uploaded files
    if results[:success].any?
      scan_result = direct_uploads_path.scan_and_update!
      results[:scan] = scan_result
    end

    if results[:errors].any?
      render json: results, status: :unprocessable_entity
    else
      render json: results, status: :ok
    end
  end

  private

  def process_upload(file, image_path)
    # Validate file size
    if file.size > MAX_FILE_SIZE
      return {
        success: false,
        filename: file.original_filename,
        error: "File size exceeds maximum allowed (10MB)"
      }
    end

    # Validate file extension
    extension = File.extname(file.original_filename).downcase
    unless ALLOWED_EXTENSIONS.include?(extension)
      return {
        success: false,
        filename: file.original_filename,
        error: "Invalid file type. Allowed: #{ALLOWED_EXTENSIONS.join(", ")}"
      }
    end

    # Sanitize filename (remove path traversal attempts)
    sanitized_filename = sanitize_filename(file.original_filename)

    # Build full path
    base_dir = Rails.root
    upload_dir = File.join(base_dir, "public", "memes", "direct-uploads")
    file_path = File.join(upload_dir, sanitized_filename)

    begin
      # Save the file
      File.open(file_path, "wb") do |f|
        f.write(file.read)
      end

      {
        success: true,
        filename: sanitized_filename,
        size: file.size,
        path: "/memes/direct-uploads/#{sanitized_filename}"
      }
    rescue => e
      {
        success: false,
        filename: file.original_filename,
        error: "Failed to save file: #{e.message}"
      }
    end
  end

  def sanitize_filename(filename)
    # Remove path components and dangerous characters
    # Keep only alphanumeric, dash, underscore, period
    basename = File.basename(filename)
    basename.gsub(/[^\w\s_.-]/, "").gsub(/\s+/, "_")
  end
end
