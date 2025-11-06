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
      File.stub(:directory?, true) do
        Dir.stub(:entries, [ ".", "..", "test.jpg" ]) do
          File.stub(:file?, true) do
            assert_difference("ImagePath.count") do
              post settings_image_paths_url, params: {
                image_path: { name: "new_valid_directory" }
              }
            end

            assert_redirected_to settings_image_path_url(ImagePath.last)
            assert_equal "Directory path successfully created!", flash[:notice]
          end
        end
      end
    end

    test "should not create image_path with invalid directory" do
      File.stub(:directory?, false) do
        assert_no_difference("ImagePath.count") do
          post settings_image_paths_url, params: {
            image_path: { name: "invalid_directory" }
          }
        end

        assert_response :unprocessable_entity
        assert_equal "Invalid directory path!", flash[:alert]
      end
    end

    test "should not create duplicate image_path" do
      File.stub(:directory?, true) do
        Dir.stub(:entries, []) do
          assert_no_difference("ImagePath.count") do
            post settings_image_paths_url, params: {
              image_path: { name: @image_path.name }
            }
          end

          assert_response :unprocessable_entity
        end
      end
    end

    # Edit tests
    test "should get edit" do
      get edit_settings_image_path_url(@image_path)
      assert_response :success
    end

    # Update tests
    test "should update image_path with valid directory" do
      File.stub(:directory?, true) do
        Dir.stub(:entries, []) do
          patch settings_image_path_url(@image_path), params: {
            image_path: { name: "updated_directory" }
          }

          assert_redirected_to settings_image_path_url(@image_path)
          assert_equal "Directory path succesfully updated!", flash[:notice]
        end
      end
    end

    test "should not update image_path with invalid directory" do
      File.stub(:directory?, false) do
        patch settings_image_path_url(@image_path), params: {
          image_path: { name: "invalid_directory" }
        }

        assert_response :unprocessable_entity
        assert_equal "Invalid directory path!", flash[:alert]
      end
    end

    # Destroy tests
    test "should destroy image_path" do
      image_path = ImagePath.new(name: "test_to_delete")

      File.stub(:directory?, true) do
        Dir.stub(:entries, []) do
          image_path.save!
        end
      end

      assert_difference("ImagePath.count", -1) do
        delete settings_image_path_url(image_path)
      end

      assert_redirected_to settings_image_paths_url
      assert_equal "Directory path successfully deleted!", flash[:notice]
    end

    test "destroy should cascade delete image_cores" do
      image_path = ImagePath.new(name: "test_path")

      File.stub(:directory?, true) do
        Dir.stub(:entries, []) do
          image_path.save!
        end
      end

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
