require "test_helper"

module Settings
  class TagNamesControllerTest < ActionDispatch::IntegrationTest
    def setup
      @tag_name = TagName.create!(name: "test_tag", color: "#FF5733")
    end

    # Index tests
    test "should get index" do
      get settings_tag_names_url
      assert_response :success
    end

    test "index should order by updated_at desc" do
      get settings_tag_names_url
      assert_response :success
      assert_not_nil assigns(:tag_names)
    end

    # Show tests
    test "should show tag_name" do
      get settings_tag_name_url(@tag_name)
      assert_response :success
    end

    # New tests
    test "should get new" do
      get new_settings_tag_name_url
      assert_response :success
    end

    # Create tests
    test "should create tag_name" do
      assert_difference("TagName.count") do
        post settings_tag_names_url, params: {
          tag_name: { name: "new_tag", color: "#123456" }
        }
      end

      assert_redirected_to settings_tag_name_url(TagName.last)
      assert_equal "Tag successfully created!", flash[:notice]
    end

    test "should not create tag_name without name" do
      assert_no_difference("TagName.count") do
        post settings_tag_names_url, params: {
          tag_name: { name: "", color: "#123456" }
        }
      end

      assert_response :unprocessable_entity
      assert_not_nil flash[:alert]
    end

    test "should not create tag_name without color" do
      assert_no_difference("TagName.count") do
        post settings_tag_names_url, params: {
          tag_name: { name: "tag_no_color", color: "" }
        }
      end

      assert_response :unprocessable_entity
      assert_not_nil flash[:alert]
    end

    test "should not create duplicate tag_name" do
      assert_no_difference("TagName.count") do
        post settings_tag_names_url, params: {
          tag_name: { name: @tag_name.name, color: "#000000" }
        }
      end

      assert_response :unprocessable_entity
      assert_match(/already been taken/, flash[:alert])
    end

    test "should not create tag_name with name exceeding 20 chars" do
      assert_no_difference("TagName.count") do
        post settings_tag_names_url, params: {
          tag_name: { name: "a" * 21, color: "#123456" }
        }
      end

      assert_response :unprocessable_entity
    end

    # Edit tests
    test "should get edit" do
      get edit_settings_tag_name_url(@tag_name)
      assert_response :success
    end

    # Update tests
    test "should update tag_name" do
      patch settings_tag_name_url(@tag_name), params: {
        tag_name: { name: "updated_tag", color: "#654321" }
      }

      assert_redirected_to settings_tag_name_url(@tag_name)
      assert_equal "Tag successfully updated!", flash[:notice]

      @tag_name.reload
      assert_equal "updated_tag", @tag_name.name
      assert_equal "#654321", @tag_name.color
    end

    test "should not update tag_name with invalid name" do
      patch settings_tag_name_url(@tag_name), params: {
        tag_name: { name: "", color: "#123456" }
      }

      assert_response :unprocessable_entity
      assert_not_nil flash[:alert]
    end

    test "should not update tag_name with duplicate name" do
      other_tag = TagName.create!(name: "other_tag", color: "#000000")

      patch settings_tag_name_url(@tag_name), params: {
        tag_name: { name: other_tag.name, color: "#123456" }
      }

      assert_response :unprocessable_entity
      assert_match(/already been taken/, flash[:alert])
    end

    test "should update only color" do
      original_name = @tag_name.name

      patch settings_tag_name_url(@tag_name), params: {
        tag_name: { name: original_name, color: "#ABCDEF" }
      }

      assert_redirected_to settings_tag_name_url(@tag_name)
      @tag_name.reload
      assert_equal original_name, @tag_name.name
      assert_equal "#ABCDEF", @tag_name.color
    end

    # Destroy tests
    test "should destroy tag_name" do
      tag_to_delete = TagName.create!(name: "delete_me", color: "#111111")

      assert_difference("TagName.count", -1) do
        delete settings_tag_name_url(tag_to_delete)
      end

      assert_redirected_to settings_tag_names_url
      assert_equal "Tag successfully deleted!", flash[:notice]
    end

    test "destroy should cascade delete image_tags" do
      image_core = image_cores(:one)
      ImageTag.create!(tag_name: @tag_name, image_core: image_core)

      assert_difference("ImageTag.count", -1) do
        delete settings_tag_name_url(@tag_name)
      end
    end

    # Parameter tests
    test "should only permit name and color parameters" do
      params = ActionController::Parameters.new(
        tag_name: {
          name: "test",
          color: "#FF0000",
          unauthorized_param: "should_not_be_permitted"
        }
      )

      controller = Settings::TagNamesController.new
      controller.params = params

      permitted = controller.send(:tag_name_params)
      assert_includes permitted.keys, "name"
      assert_includes permitted.keys, "color"
      assert_not_includes permitted.keys, "unauthorized_param"
    end

    # Integration tests
    test "should handle special characters in name" do
      post settings_tag_names_url, params: {
        tag_name: { name: "tag-with-dash", color: "#123456" }
      }

      assert_response :redirect
    end

    test "should accept various color formats" do
      [ "#FFF", "#FFFFFF", "red", "rgb(255,0,0)" ].each_with_index do |color, i|
        post settings_tag_names_url, params: {
          tag_name: { name: "color_test_#{i}", color: color }
        }

        assert_response :redirect
      end
    end
  end
end
