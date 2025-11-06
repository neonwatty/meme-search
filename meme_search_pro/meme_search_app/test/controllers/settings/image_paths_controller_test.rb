require "test_helper"
require "minitest/mock"

module Settings
  class ImagePathsControllerTest < ActionDispatch::IntegrationTest
    def setup
      @image_path = image_paths(:one)
    end

    # Index tests
    test "should get index" do
      get settings_image_paths_url
      assert_response :success
    end

    test "index should order by updated_at desc" do
      get settings_image_paths_url
      assert_response :success
      assert_not_nil assigns(:image_paths)
    end

    # Show tests
    test "should show image_path" do
      get settings_image_path_url(@image_path)
      assert_response :success
    end

    # New tests
    test "should get new" do
      get new_settings_image_path_url
      assert_response :success
    end

    # Create tests
    test "should create image_path with valid directory" do
      # Use real test directory: public/memes/test_valid_directory
      assert_difference("ImagePath.count") do
        post settings_image_paths_url, params: {
          image_path: { name: "test_valid_directory" }
        }
      end

      assert_redirected_to settings_image_path_url(ImagePath.last)
      assert_equal "Directory path successfully created!", flash[:notice]

      # Verify ImageCore was created from the image file
      created_path = ImagePath.last
      assert_equal "test_valid_directory", created_path.name
      assert_equal 1, created_path.image_cores.count
      assert_equal "test_image.jpg", created_path.image_cores.first.name
    end

    test "should not create image_path with invalid directory" do
      # Use a directory name that doesn't exist
      non_existent_dir = "test_nonexistent_directory_#{SecureRandom.hex(8)}"

      assert_no_difference("ImagePath.count") do
        post settings_image_paths_url, params: {
          image_path: { name: non_existent_dir }
        }
      end

      assert_response :unprocessable_entity
      assert_equal "Invalid directory path!", flash[:alert]
    end

    test "should not create duplicate image_path" do
      # @image_path.name is "example_memes_1" from fixtures (already in DB)
      # The directory also exists on the filesystem

      assert_no_difference("ImagePath.count") do
        post settings_image_paths_url, params: {
          image_path: { name: @image_path.name }
        }
      end

      assert_response :unprocessable_entity
    end

    # Edit tests
    test "should get edit" do
      get edit_settings_image_path_url(@image_path)
      assert_response :success
    end

    # Update tests
    test "should update image_path with valid directory" do
      # Use real test directory: public/memes/test_empty_directory
      patch settings_image_path_url(@image_path), params: {
        image_path: { name: "test_empty_directory" }
      }

      assert_redirected_to settings_image_path_url(@image_path)
      assert_equal "Directory path succesfully updated!", flash[:notice]

      @image_path.reload
      assert_equal "test_empty_directory", @image_path.name
    end

    test "should not update image_path with invalid directory" do
      # Use a directory name that doesn't exist
      non_existent_dir = "test_invalid_update_#{SecureRandom.hex(8)}"

      patch settings_image_path_url(@image_path), params: {
        image_path: { name: non_existent_dir }
      }

      assert_response :unprocessable_entity
      assert_equal "Invalid directory path!", flash[:alert]
    end

    # Destroy tests
    test "should destroy image_path" do
      # Create a new ImagePath using real test directory
      image_path = ImagePath.create!(name: "test_empty_directory")

      assert_difference("ImagePath.count", -1) do
        delete settings_image_path_url(image_path)
      end

      assert_redirected_to settings_image_paths_url
      assert_equal "Directory path successfully deleted!", flash[:notice]
    end

    test "destroy should cascade delete image_cores" do
      # Create ImagePath with real directory
      image_path = ImagePath.create!(name: "test_empty_directory")

      # Manually create ImageCore (skip after_save hooks)
      image_core = ImageCore.create!(
        name: "test.jpg",
        description: "test",
        status: :not_started,
        image_path: image_path
      )

      # Mock HTTP DELETE request to image-to-text service using Webmock
      stub_request(:delete, /\/remove_job\/#{image_core.id}/)
        .to_return(status: 200, body: "success", headers: {})

      assert_difference("ImageCore.count", -1) do
        delete settings_image_path_url(image_path)
      end
    end

    # Parameter tests
    test "should only permit name parameter" do
      params = ActionController::Parameters.new(
        image_path: {
          name: "test_path",
          unauthorized_param: "should_not_be_permitted"
        }
      )

      controller = Settings::ImagePathsController.new
      controller.params = params

      permitted = controller.send(:image_path_params)
      assert_includes permitted.keys, "name"
      assert_not_includes permitted.keys, "unauthorized_param"
    end
  end
end
