require "test_helper"
require "webmock/minitest"

class SeedsTest < ActiveSupport::TestCase
  setup do
    # Stub HTTP requests to Python service
    stub_request(:delete, /remove_job/)
      .to_return(status: 200, body: '{"status": "removed"}')

    # Clean up database before each test
    ImageCore.destroy_all
    ImagePath.destroy_all
    TagName.destroy_all
    ImageToText.destroy_all
  end

  test "seed file runs successfully with empty meme directories" do
    # Temporarily move example meme files to simulate empty directories
    temp_dir = Rails.root.join("tmp", "test_seed_backup")
    FileUtils.mkdir_p(temp_dir)

    begin
      # Move example meme files out
      %w[example_memes_1 example_memes_2].each do |dir|
        source = Rails.root.join("public", "memes", dir)
        dest = temp_dir.join(dir)
        FileUtils.mv(source, dest) if File.directory?(source)
        # Create empty directory
        FileUtils.mkdir_p(source)
      end

      # Should not raise any errors even with empty directories
      assert_nothing_raised do
        load Rails.root.join("db", "seeds.rb")
      end

      # Verify ImageToText models were created despite empty directories
      assert_equal 6, ImageToText.count, "Should create 6 ImageToText models"

      # Verify all expected models exist
      expected_models = [
        "Florence-2-base",
        "Florence-2-large",
        "SmolVLM-256M-Instruct",
        "SmolVLM-500M-Instruct",
        "moondream2",
        "moondream2-int8"
      ]

      expected_models.each do |model_name|
        assert ImageToText.exists?(name: model_name),
               "Expected ImageToText model '#{model_name}' to exist"
      end

      # Verify default model is set
      florence_base = ImageToText.find_by(name: "Florence-2-base")
      assert florence_base.current, "Florence-2-base should be the current model"

      # Verify other models are not current
      other_models = ImageToText.where.not(name: "Florence-2-base")
      assert other_models.all? { |m| !m.current },
             "Only Florence-2-base should be the current model"
    ensure
      # Restore example meme files
      %w[example_memes_1 example_memes_2].each do |dir|
        source = temp_dir.join(dir)
        dest = Rails.root.join("public", "memes", dir)
        FileUtils.rm_rf(dest) if File.directory?(dest)
        FileUtils.mv(source, dest) if File.directory?(source)
      end
      FileUtils.rm_rf(temp_dir)
    end
  end

  test "seed file runs successfully with populated meme directories" do
    # Test with actual meme files (standard setup)
    # The test database fixtures include example memes in public/memes/
    assert_nothing_raised do
      load Rails.root.join("db", "seeds.rb")
    end

    # Verify ImageToText models were created
    assert_equal 6, ImageToText.count, "Should create 6 ImageToText models"

    # If ImageCores were created, verify tags were applied
    if ImageCore.count > 0
      # Verify tags were created
      assert TagName.exists?(name: "tag_one"), "tag_one should exist"
      assert TagName.exists?(name: "tag_two"), "tag_two should exist"
    end
  end

  test "seed file creates ImageToText models only once (uses find_or_create_by pattern)" do
    # First run
    load Rails.root.join("db", "seeds.rb")
    initial_count = ImageToText.count
    assert_equal 6, initial_count, "Should create 6 ImageToText models on first run"

    # Clean up tags to avoid duplication errors (they use .new + .save!)
    TagName.destroy_all

    # Second run should use find_or_create_by and not duplicate ImageToText models
    load Rails.root.join("db", "seeds.rb")
    assert_equal initial_count, ImageToText.count,
                 "Running seeds twice should not create duplicate ImageToText records"
  end

  test "ImageToText models have required attributes" do
    load Rails.root.join("db", "seeds.rb")

    ImageToText.all.each do |model|
      assert model.name.present?, "Model should have a name"
      assert model.resource.present?, "Model should have a resource URL"
      assert model.description.present?, "Model should have a description"
      assert_not_nil model.current, "Model should have current flag set"
    end
  end
end
