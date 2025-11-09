require "test_helper"

module Settings
  class ImageToTextsControllerTest < ActionDispatch::IntegrationTest
    def setup
      # Create test models
      @model1 = ImageToText.create!(
        name: "Florence-2-base",
        resource: "microsoft/Florence-2-base",
        description: "250M parameter model",
        current: true
      )

      @model2 = ImageToText.create!(
        name: "Moondream2",
        resource: "vikhyatk/moondream2",
        description: "2B parameter model",
        current: false
      )
    end

    # Index tests
    test "should get index" do
      get settings_image_to_texts_url
      assert_response :success
    end

    test "index should order by id asc" do
      get settings_image_to_texts_url
      assert_response :success
      assert_not_nil assigns(:image_to_texts)

      # Verify ordering
      models = assigns(:image_to_texts)
      ids = models.map(&:id)
      assert_equal ids.sort, ids, "Models should be ordered by id ascending"
    end

    test "index should display all models" do
      get settings_image_to_texts_url
      assert_response :success

      models = assigns(:image_to_texts)
      assert models.count >= 2, "Should display all models"
    end

    # Update current tests
    test "should update current model" do
      post update_current_settings_image_to_texts_url, params: {
        current_id: @model2.id
      }

      assert_redirected_to settings_image_to_texts_url
      assert_match(/Current model set to: #{@model2.name}/, flash[:notice])

      # Verify database changes
      @model1.reload
      @model2.reload

      assert_equal false, @model1.current
      assert_equal true, @model2.current
    end

    test "update_current should unset all current values first" do
      # Ensure multiple models are current (edge case)
      @model1.update!(current: true)
      @model2.update!(current: true)

      post update_current_settings_image_to_texts_url, params: {
        current_id: @model1.id
      }

      # Only one should be current
      current_models = ImageToText.where(current: true)
      assert_equal 1, current_models.count
      assert_equal @model1.id, current_models.first.id
    end

    test "update_current should handle missing current_id" do
      post update_current_settings_image_to_texts_url, params: {
        current_id: nil
      }

      # Should still redirect but may not set any model as current
      assert_redirected_to settings_image_to_texts_url
    end

    test "update_current should switch from one model to another" do
      # Start with model1 current
      @model1.update!(current: true)
      @model2.update!(current: false)

      # Switch to model2
      post update_current_settings_image_to_texts_url, params: {
        current_id: @model2.id
      }

      @model1.reload
      @model2.reload

      assert_equal false, @model1.current
      assert_equal true, @model2.current
    end

    test "update_current should set correct flash message" do
      post update_current_settings_image_to_texts_url, params: {
        current_id: @model2.id
      }

      assert_equal "Current model set to: #{@model2.name}", flash[:notice]
    end

    # Integration tests
    test "should persist current model selection across requests" do
      post update_current_settings_image_to_texts_url, params: {
        current_id: @model2.id
      }

      # Make another request to verify persistence
      get settings_image_to_texts_url

      current_model = ImageToText.find_by(current: true)
      assert_equal @model2.id, current_model.id
    end

    test "should handle rapid model switching" do
      # Switch back and forth rapidly
      post update_current_settings_image_to_texts_url, params: {
        current_id: @model2.id
      }

      post update_current_settings_image_to_texts_url, params: {
        current_id: @model1.id
      }

      post update_current_settings_image_to_texts_url, params: {
        current_id: @model2.id
      }

      # Final state should be model2 current
      @model1.reload
      @model2.reload

      assert_equal false, @model1.current
      assert_equal true, @model2.current
    end

    test "should work with multiple models" do
      # Create additional models
      model3 = ImageToText.create!(
        name: "SmolVLM-256",
        resource: "HuggingFaceTB/SmolVLM-256",
        description: "256M parameter model",
        current: false
      )

      model4 = ImageToText.create!(
        name: "SmolVLM-500",
        resource: "HuggingFaceTB/SmolVLM-500",
        description: "500M parameter model",
        current: false
      )

      # Switch to model3
      post update_current_settings_image_to_texts_url, params: {
        current_id: model3.id
      }

      # Verify only model3 is current
      [ @model1, @model2, model3, model4 ].each(&:reload)

      assert_equal false, @model1.current
      assert_equal false, @model2.current
      assert_equal true, model3.current
      assert_equal false, model4.current
    end

    # Error handling tests
    test "should handle invalid current_id" do
      # Generate a guaranteed invalid ID
      max_id = ImageToText.maximum(:id) || 0
      invalid_id = max_id + 10000

      post update_current_settings_image_to_texts_url, params: {
        current_id: invalid_id
      }

      # Should handle gracefully without raising error
      assert_redirected_to settings_image_to_texts_url

      # Should set flash message (with empty model name since none is current)
      assert_equal "Current model set to: ", flash[:notice]

      # No model should be current (all were unset, invalid ID was skipped)
      assert_equal 0, ImageToText.where(current: true).count
    end

    test "should handle empty params" do
      post update_current_settings_image_to_texts_url, params: {}

      # Should handle gracefully
      assert_redirected_to settings_image_to_texts_url

      # Should set flash message (with empty model name since no current_id provided)
      assert_equal "Current model set to: ", flash[:notice]

      # No model should be current (all were unset, no new current_id set)
      assert_equal 0, ImageToText.where(current: true).count
    end

    # Private method tests
    test "should have image_to_text_params method" do
      controller = Settings::ImageToTextsController.new
      # In Rails 8, use private_methods to check for private method existence
      assert_includes controller.private_methods, :image_to_text_params
    end

    test "image_to_text_params should permit name and description" do
      params = ActionController::Parameters.new(
        image_to_text: {
          name: "Test Model",
          description: "Test Description",
          current: true,  # Should not be permitted via params
          unauthorized_param: "should_not_be_permitted"
        }
      )

      controller = Settings::ImageToTextsController.new
      controller.params = params

      permitted = controller.send(:image_to_text_params)
      assert_includes permitted.keys, "name"
      assert_includes permitted.keys, "description"
      assert_not_includes permitted.keys, "current"
      assert_not_includes permitted.keys, "unauthorized_param"
    end
  end
end
