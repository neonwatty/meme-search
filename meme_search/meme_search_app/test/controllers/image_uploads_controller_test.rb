require "test_helper"
require "minitest/mock"

class ImageUploadsControllerTest < ActionDispatch::IntegrationTest
  def setup
    @upload_dir = Rails.root.join("public", "memes", "direct-uploads")
    FileUtils.mkdir_p(@upload_dir)
  end

  def teardown
    # Clean up test uploads
    Dir.glob(File.join(@upload_dir, "*")).each do |file|
      File.delete(file) if File.file?(file)
    end
  end

  # Helper to create a test image file upload
  def create_test_image(filename: "test.jpg", content: "fake image content")
    Rack::Test::UploadedFile.new(
      StringIO.new(content),
      "image/jpeg",
      original_filename: filename
    )
  end

  # GET /image_uploads/new tests
  test "should get new" do
    get new_image_upload_url
    assert_response :success
  end

  # POST /image_uploads tests
  test "should create upload and ensure direct-uploads ImagePath" do
    # Ensure the direct-uploads path doesn't exist yet
    ImagePath.find_by(name: "direct-uploads")&.destroy

    file = create_test_image(filename: "test_upload.jpg")

    assert_difference("ImagePath.count", 1) do
      post image_uploads_url, params: { files: [ file ] }
    end

    assert_response :success
    assert ImagePath.exists?(name: "direct-uploads")

    # Verify file was saved
    uploaded_file_path = File.join(@upload_dir, "test_upload.jpg")
    assert File.exist?(uploaded_file_path)
  end

  test "should upload multiple files" do
    ImagePath.ensure_direct_uploads_path!

    file1 = create_test_image(filename: "image1.jpg")
    file2 = create_test_image(filename: "image2.png", content: "another image")

    post image_uploads_url, params: { files: [ file1, file2 ] }
    assert_response :success

    # Verify both files were saved
    assert File.exist?(File.join(@upload_dir, "image1.jpg"))
    assert File.exist?(File.join(@upload_dir, "image2.png"))

    # Verify response JSON
    json_response = JSON.parse(response.body)
    assert_equal 2, json_response["success"].length
  end

  test "should reject files over 10MB" do
    ImagePath.ensure_direct_uploads_path!

    # Create a file that's over 10MB
    large_content = "x" * (11 * 1024 * 1024)  # 11MB
    file = create_test_image(filename: "large.jpg", content: large_content)

    post image_uploads_url, params: { files: [ file ] }
    assert_response :unprocessable_entity

    json_response = JSON.parse(response.body)
    assert json_response["errors"].any?
    assert_match(/exceeds maximum/, json_response["errors"].first["error"])
  end

  test "should reject invalid file types" do
    ImagePath.ensure_direct_uploads_path!

    invalid_file = Rack::Test::UploadedFile.new(
      StringIO.new("fake pdf content"),
      "application/pdf",
      original_filename: "document.pdf"
    )

    post image_uploads_url, params: { files: [ invalid_file ] }
    assert_response :unprocessable_entity

    json_response = JSON.parse(response.body)
    assert json_response["errors"].any?
    assert_match(/Invalid file type/, json_response["errors"].first["error"])
  end

  test "should sanitize filenames" do
    ImagePath.ensure_direct_uploads_path!

    # Test file with special characters
    file = create_test_image(filename: "../../../etc/passwd.jpg")

    post image_uploads_url, params: { files: [ file ] }
    assert_response :success

    # Verify file was saved with sanitized name (should strip path traversal)
    json_response = JSON.parse(response.body)
    sanitized_filename = json_response["success"].first["filename"]

    # Should not contain path traversal
    assert_not_includes sanitized_filename, ".."
    assert_not_includes sanitized_filename, "/"
  end

  test "should return error when no files provided" do
    post image_uploads_url, params: {}
    assert_response :unprocessable_entity

    json_response = JSON.parse(response.body)
    assert_match(/No files selected/, json_response["error"])
  end

  test "should trigger ImagePath scan after upload" do
    ImagePath.ensure_direct_uploads_path!
    direct_uploads_path = ImagePath.find_by(name: "direct-uploads")

    # Record initial ImageCore count
    initial_count = ImageCore.where(image_path: direct_uploads_path).count

    file = create_test_image(filename: "scan_test.jpg")

    post image_uploads_url, params: { files: [ file ] }
    assert_response :success

    # Verify scan ran and created ImageCore record
    direct_uploads_path.reload
    final_count = ImageCore.where(image_path: direct_uploads_path).count
    assert_equal initial_count + 1, final_count
  end

  test "should handle mixed valid and invalid files" do
    ImagePath.ensure_direct_uploads_path!

    valid_file = create_test_image(filename: "valid.jpg")
    invalid_file = Rack::Test::UploadedFile.new(
      StringIO.new("text content"),
      "text/plain",
      original_filename: "invalid.txt"
    )

    post image_uploads_url, params: { files: [ valid_file, invalid_file ] }
    assert_response :unprocessable_entity

    json_response = JSON.parse(response.body)
    assert_equal 1, json_response["success"].length
    assert_equal 1, json_response["errors"].length
  end
end
