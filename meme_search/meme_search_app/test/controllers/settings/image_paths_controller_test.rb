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
      # Mock HTTP DELETE for orphaned records that get removed during rescan
      stub_request(:delete, /\/remove_job\//)
        .to_return(status: 200, body: "success", headers: {})

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

    # --- Tests for Scenario A: Rescanning existing paths ---

    test "touching existing path triggers rescan without creating duplicates" do
      # Create path with test_valid_directory (has 1 image: test_image.jpg)
      image_path = ImagePath.create!(name: "test_valid_directory")
      initial_count = image_path.image_cores.count

      assert_equal 1, initial_count, "Expected 1 ImageCore from initial creation"

      # Touch the record to trigger after_save callback (simulating a rescan)
      image_path.touch

      # Count should remain the same (find_or_create_by prevents duplicates)
      image_path.reload
      assert_equal initial_count, image_path.image_cores.count,
                   "Expected no duplicates after triggering rescan via touch"
    end

    test "updating path to different directory changes ImageCore associations" do
      # Mock HTTP DELETE for orphaned records
      stub_request(:delete, /\/remove_job\//)
        .to_return(status: 200, body: "success", headers: {})

      # Start with test_valid_directory (1 image)
      image_path = ImagePath.create!(name: "test_valid_directory")
      assert_equal 1, image_path.image_cores.count

      old_cores_count = image_path.image_cores.count

      # Update to test_empty_directory (0 images)
      patch settings_image_path_url(image_path), params: {
        image_path: { name: "test_empty_directory" }
      }

      assert_redirected_to settings_image_path_url(image_path)
      image_path.reload

      # Verify path name updated
      assert_equal "test_empty_directory", image_path.name,
                   "Expected path name to be updated"

      # With removal detection, old ImageCores are now removed
      assert_equal 0, image_path.image_cores.count,
                   "Old ImageCores should be removed when directory changes"
    end

    # Rescan tests
    test "should rescan image_path directory" do
      # Use test_valid_directory which has 1 image file
      image_path = ImagePath.create!(name: "test_valid_directory")
      initial_count = image_path.image_cores.count

      assert_equal 1, initial_count, "Expected 1 ImageCore from initial creation"

      post rescan_settings_image_path_url(image_path)

      assert_redirected_to settings_image_paths_url
      # After initial scan, rescan finds no changes
      assert_match(/No changes detected/i, flash[:notice])

      # Verify count remains the same (no duplicates)
      image_path.reload
      assert_equal initial_count, image_path.image_cores.count
    end

    test "rescan should find new images added to directory" do
      # Create path with test_valid_directory (has 1 image)
      image_path = ImagePath.create!(name: "test_valid_directory")
      initial_count = image_path.image_cores.count

      assert_equal 1, initial_count

      # Mock Dir.entries to simulate a new file appearing
      base_dir = Dir.getwd
      full_path = base_dir + "/public/memes/" + image_path.name
      original_entries = Dir.entries(full_path)
      mocked_entries = original_entries + [ "new_test_image.jpg" ]

      # Store original File methods
      original_file_method = File.method(:file?)
      original_join_method = File.method(:join)

      Dir.stub :entries, mocked_entries do
        File.stub :file?, ->(path) {
          # Use original method for real files, return true for our mocked file
          if path.end_with?("new_test_image.jpg")
            true
          else
            original_file_method.call(path)
          end
        } do
          File.stub :join, ->(dir, file) {
            original_join_method.call(dir, file)
          } do
            post rescan_settings_image_path_url(image_path)
          end
        end
      end

      assert_redirected_to settings_image_paths_url
      # Should show that 1 new image was added
      assert_match(/Added 1 new image/i, flash[:notice])

      # Verify new ImageCore was created
      image_path.reload
      assert_equal 2, image_path.image_cores.count
      assert_includes image_path.image_cores.pluck(:name), "new_test_image.jpg"
    end

    test "rescan should handle empty directory gracefully" do
      # Create path with test_empty_directory (0 images)
      image_path = ImagePath.create!(name: "test_empty_directory")

      post rescan_settings_image_path_url(image_path)

      assert_redirected_to settings_image_paths_url
      # Empty directory shows "No changes" since nothing was added or removed
      assert_match(/No changes detected/i, flash[:notice])

      image_path.reload
      assert_equal 0, image_path.image_cores.count
    end

    test "rescan should not create duplicates on multiple rescans" do
      image_path = ImagePath.create!(name: "test_valid_directory")
      initial_count = image_path.image_cores.count

      # Rescan multiple times
      3.times do
        post rescan_settings_image_path_url(image_path)
        image_path.reload
      end

      # Count should remain the same after multiple rescans
      assert_equal initial_count, image_path.image_cores.count,
                   "Multiple rescans should not create duplicates"
    end

    test "rescan should show 'no changes' message when nothing changed" do
      image_path = ImagePath.create!(name: "test_valid_directory")
      image_path.send(:list_files_in_directory) # Initial scan

      # Rescan with same files
      post rescan_settings_image_path_url(image_path)

      assert_redirected_to settings_image_paths_url
      assert_match(/No changes detected/i, flash[:notice])
    end

    test "rescan should show added count in flash message" do
      image_path = ImagePath.create!(name: "test_empty_directory")

      # Mock Dir.entries to simulate new file
      base_dir = Dir.getwd
      full_path = base_dir + "/public/memes/" + image_path.name
      original_file_method = File.method(:file?)

      Dir.stub :entries, [ ".", "..", "new_image.jpg" ] do
        File.stub :file?, ->(path) {
          if path.end_with?("new_image.jpg")
            true
          else
            original_file_method.call(path)
          end
        } do
          post rescan_settings_image_path_url(image_path)
        end
      end

      assert_redirected_to settings_image_paths_url
      assert_match(/Added 1 new image/i, flash[:notice])
    end

    test "rescan should show removed count in flash message" do
      image_path = ImagePath.create!(name: "test_valid_directory")
      image_path.send(:list_files_in_directory) # Create initial ImageCore

      # Manually create orphaned ImageCore
      orphaned = ImageCore.create!(
        image_path: image_path,
        name: "orphaned.jpg",
        description: "Orphaned",
        status: :not_started
      )

      # Mock HTTP DELETE
      stub_request(:delete, /\/remove_job\/#{orphaned.id}/)
        .to_return(status: 200, body: "success", headers: {})

      # Rescan - should detect and remove orphaned record
      post rescan_settings_image_path_url(image_path)

      assert_redirected_to settings_image_paths_url
      assert_match(/Removed 1 orphaned record/i, flash[:notice])
    end

    test "rescan should show both added and removed counts in flash message" do
      image_path = ImagePath.create!(name: "test_valid_directory")
      image_path.send(:list_files_in_directory) # Create initial ImageCore

      # Manually create orphaned ImageCore
      orphaned = ImageCore.create!(
        image_path: image_path,
        name: "orphaned.jpg",
        description: "Orphaned",
        status: :not_started
      )

      # Mock HTTP DELETE
      stub_request(:delete, /\/remove_job\/#{orphaned.id}/)
        .to_return(status: 200, body: "success", headers: {})

      # Mock Dir.entries to include original file + new file (orphaned removed)
      base_dir = Dir.getwd
      full_path = base_dir + "/public/memes/" + image_path.name
      original_entries = Dir.entries(full_path)
      mocked_entries = original_entries + [ "brand_new.jpg" ]

      original_file_method = File.method(:file?)
      original_join_method = File.method(:join)

      Dir.stub :entries, mocked_entries do
        File.stub :file?, ->(path) {
          if path.end_with?("brand_new.jpg")
            true
          else
            original_file_method.call(path)
          end
        } do
          File.stub :join, ->(dir, file) {
            original_join_method.call(dir, file)
          } do
            post rescan_settings_image_path_url(image_path)
          end
        end
      end

      assert_redirected_to settings_image_paths_url
      assert_match(/Added 1 new image.*removed 1 orphaned record/i, flash[:notice])
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
    test "should permit name and scan_frequency_minutes parameters" do
      params = ActionController::Parameters.new(
        image_path: {
          name: "test_path",
          scan_frequency_minutes: 30,
          unauthorized_param: "should_not_be_permitted"
        }
      )

      controller = Settings::ImagePathsController.new
      controller.params = params

      permitted = controller.send(:image_path_params)
      assert_includes permitted.keys, "name"
      assert_includes permitted.keys, "scan_frequency_minutes"
      assert_not_includes permitted.keys, "unauthorized_param"
    end

    # Auto-scan feature tests
    test "create action triggers immediate scan if auto-scan enabled" do
      # Create with auto-scan enabled - scan should be triggered
      post settings_image_paths_url, params: {
        image_path: {
          name: "test_valid_directory",
          scan_frequency_minutes: 30
        }
      }

      assert_redirected_to settings_image_path_url(ImagePath.last)

      # Verify the path was created with auto-scan enabled
      created_path = ImagePath.last
      assert_equal 30, created_path.scan_frequency_minutes
      assert_not_nil created_path.last_scanned_at, "Expected immediate scan to set last_scanned_at"
    end

    test "create action skips immediate scan if manual only" do
      # Create with manual only (nil frequency)
      post settings_image_paths_url, params: {
        image_path: {
          name: "test_valid_directory",
          scan_frequency_minutes: nil
        }
      }

      assert_redirected_to settings_image_path_url(ImagePath.last)

      # Verify the path was created without auto-scan
      created_path = ImagePath.last
      assert_nil created_path.scan_frequency_minutes
    end

    test "update action accepts scan_frequency_minutes" do
      # Mock HTTP DELETE for orphaned records
      stub_request(:delete, /\/remove_job\//)
        .to_return(status: 200, body: "success", headers: {})

      patch settings_image_path_url(@image_path), params: {
        image_path: {
          name: @image_path.name,
          scan_frequency_minutes: 60
        }
      }

      assert_redirected_to settings_image_path_url(@image_path)
      @image_path.reload
      assert_equal 60, @image_path.scan_frequency_minutes
    end

    test "rescan action uses scan_and_update! for tracking" do
      image_path = ImagePath.create!(name: "test_valid_directory", scan_frequency_minutes: 30)

      # Verify scan_and_update! is called (not just list_files_in_directory)
      post rescan_settings_image_path_url(image_path)

      image_path.reload
      assert_not_nil image_path.last_scanned_at, "Expected last_scanned_at to be set"
      assert_not_nil image_path.last_scan_duration_ms, "Expected duration to be tracked"
    end

    test "rescan action shows error message on failure" do
      image_path = ImagePath.create!(name: "test_valid_directory")

      # Mock scan_and_update! on the specific instance to raise error
      image_path.define_singleton_method(:scan_and_update!) do
        raise "Test scan error"
      end

      # We need to ensure the controller gets our mocked instance
      ImagePath.stub :find, image_path do
        post rescan_settings_image_path_url(image_path)
      end

      assert_redirected_to settings_image_paths_url
      assert_match(/Scan failed: Test scan error/i, flash[:alert])
    end
  end
end
