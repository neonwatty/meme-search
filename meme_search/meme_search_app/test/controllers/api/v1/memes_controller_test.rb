require "test_helper"
require "tempfile"

class Api::V1::MemesControllerTest < ActionDispatch::IntegrationTest
  setup do
    _, @raw_token = ApiToken.issue!(
      name: "Test client",
      scopes: [ "search:read", "media:read" ]
    )
    directory_name = "api-test-#{SecureRandom.hex(8)}"
    @directory_path = Rails.root.join("public", "memes", directory_name)
    FileUtils.mkdir_p(@directory_path)
    image_path = ImagePath.create!(name: directory_name)
    @image_core = ImageCore.create!(
      image_path: image_path,
      name: "api-content-test.jpg",
      description: "API content test",
      status: :not_started
    )
    @source_path = @image_core.source_file_path
    FileUtils.mkdir_p(@source_path.dirname)
    File.binwrite(@source_path, "not-really-a-jpeg")
  end

  teardown do
    Array(@extra_paths).each { |path| FileUtils.rm_f(path) }
    FileUtils.rm_f(@source_path)
    Dir.rmdir(@directory_path) if @directory_path&.directory? && @directory_path.children.empty?
    @outside_file&.close!
  end

  test "returns metadata without storage details" do
    get api_v1_meme_url(@image_core), headers: authorization_header

    assert_response :success
    assert_equal @image_core.name, response.parsed_body.dig("data", "filename")
    assert_nil response.parsed_body.dig("data", "image_path")
  end

  test "streams content through the authenticated endpoint" do
    get content_api_v1_meme_url(@image_core), headers: authorization_header

    assert_response :success
    assert_equal "not-really-a-jpeg", response.body
    assert_equal "nosniff", response.headers["X-Content-Type-Options"]
    assert_includes response.headers["Cache-Control"], "private"
  end

  test "requires media read scope to stream content" do
    _, search_token = ApiToken.issue!(name: "Search only", scopes: [ "search:read" ])

    get content_api_v1_meme_url(@image_core),
      headers: { "Authorization" => "Bearer #{search_token}" }

    assert_response :forbidden
  end

  test "requires search read scope to return metadata" do
    _, media_token = ApiToken.issue!(name: "Media only", scopes: [ "media:read" ])

    get api_v1_meme_url(@image_core),
      headers: { "Authorization" => "Bearer #{media_token}" }

    assert_response :forbidden
    assert_equal "forbidden", response.parsed_body.dig("error", "code")
  end

  test "checks scope before looking up a meme" do
    _, search_token = ApiToken.issue!(name: "Search only", scopes: [ "search:read" ])

    get content_api_v1_meme_url(id: 0),
      headers: { "Authorization" => "Bearer #{search_token}" }

    assert_response :forbidden
    assert_equal "forbidden", response.parsed_body.dig("error", "code")
  end

  test "returns the common not found envelope" do
    get api_v1_meme_url(id: 0), headers: authorization_header

    assert_response :not_found
    assert_equal(
      {
        "error" => {
          "code" => "not_found",
          "message" => "The requested meme was not found."
        }
      },
      response.parsed_body
    )
  end

  test "does not reveal whether a meme exists without authentication" do
    get api_v1_meme_url(@image_core)

    assert_response :unauthorized
  end

  test "refuses to stream an indexed symlink outside the meme library" do
    @outside_file = Tempfile.new([ "outside-meme-library", ".jpg" ])
    @outside_file.binmode
    @outside_file.write("private data")
    @outside_file.flush
    symlink_path = @directory_path.join("linked-secret.jpg")
    File.symlink(@outside_file.path, symlink_path)
    @extra_paths = [ symlink_path ]
    linked_image = ImageCore.create!(
      image_path: @image_core.image_path,
      name: symlink_path.basename.to_s,
      description: "should not be readable",
      status: :not_started
    )
    image_tag = ImageTag.create!(image_core: linked_image, tag_name: tag_names(:one))
    embedding = ImageEmbedding.create!(
      image_core: linked_image,
      snippet: "preserved private metadata",
      embedding: Array.new(384, 0.0)
    )
    attempt = ImageDescriptionGenerationAttempt.create!(
      image_core: linked_image,
      provider: "local",
      status: :succeeded,
      provider_settings: {}
    )

    scan_result = linked_image.image_path.scan_and_update!

    assert_equal 0, scan_result.fetch(:removed)
    assert_equal 1, scan_result.fetch(:unsafe)
    assert linked_image.reload.persisted?
    assert_equal "should not be readable", linked_image.description
    assert ImageTag.exists?(image_tag.id)
    assert ImageEmbedding.exists?(embedding.id)
    assert ImageDescriptionGenerationAttempt.exists?(attempt.id)

    get content_api_v1_meme_url(linked_image), headers: authorization_header

    assert_response :not_found
    assert_not_includes response.body, "private data"
  end

  test "returns not found for an unreadable source file" do
    File.chmod(0o000, @source_path)

    get content_api_v1_meme_url(@image_core), headers: authorization_header

    assert_response :not_found
    assert_equal "not_found", response.parsed_body.dig("error", "code")
  ensure
    File.chmod(0o600, @source_path) if @source_path&.exist?
  end

  test "returns not found when a path component is not a directory" do
    blocking_path = @directory_path.join("not-a-directory")
    File.binwrite(blocking_path, "not a directory")
    @extra_paths = [ blocking_path ]
    blocked_image_path = ImagePath.new(name: "#{@image_core.image_path.name}/not-a-directory")
    blocked_image_path.save!(validate: false)
    blocked_image = ImageCore.create!(
      image_path: blocked_image_path,
      name: "missing.jpg",
      description: "blocked by ENOTDIR",
      status: :not_started
    )

    get content_api_v1_meme_url(blocked_image), headers: authorization_header

    assert_response :not_found
    assert_equal "not_found", response.parsed_body.dig("error", "code")
  end

  test "returns not found when media disappears before send file" do
    remove_before_send = lambda do |*|
      FileUtils.rm_f(@source_path)
      "image/jpeg"
    end

    Marcel::MimeType.stub(:for, remove_before_send) do
      get content_api_v1_meme_url(@image_core), headers: authorization_header
    end

    assert_response :not_found
    assert_equal "not_found", response.parsed_body.dig("error", "code")
  end

  test "refuses to stream through a symlinked parent directory" do
    @outside_directory = Dir.mktmpdir("outside-meme-library")
    File.binwrite(File.join(@outside_directory, "secret.jpg"), "private parent data")
    linked_directory = Rails.root.join("public", "memes", "linked-parent-#{SecureRandom.hex(8)}")
    File.symlink(@outside_directory, linked_directory)
    @extra_paths = [ linked_directory ]
    linked_path = ImagePath.new(name: linked_directory.basename.to_s)
    linked_path.save!(validate: false)
    linked_image = ImageCore.create!(
      image_path: linked_path,
      name: "secret.jpg",
      description: "should not be readable",
      status: :not_started
    )

    get content_api_v1_meme_url(linked_image), headers: authorization_header

    assert_response :not_found
    assert_not_includes response.body, "private parent data"
  ensure
    FileUtils.remove_entry(@outside_directory) if @outside_directory && File.exist?(@outside_directory)
  end

  private

    def authorization_header
      { "Authorization" => "Bearer #{@raw_token}" }
    end
end
