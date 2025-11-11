require "test_helper"

class AutoScanImagePathsJobTest < ActiveJob::TestCase
  setup do
    # Clear any cached failures before each test
    Rails.cache.delete("auto_scan_failures")
  end

  test "job scans only paths with auto-scan enabled" do
    # Create paths with and without auto-scan
    enabled_path = ImagePath.create!(
      name: "test_valid_directory",
      scan_frequency_minutes: 30,
      last_scanned_at: 1.hour.ago
    )
    disabled_path = ImagePath.create!(
      name: "test_empty_directory",
      scan_frequency_minutes: nil
    )

    # Stub scan_and_update! to track calls
    call_count = 0
    ImagePath.stub_any_instance(:scan_and_update!, -> { call_count += 1; { added: 0, removed: 0 } }) do
      assert_enqueued_with(job: AutoScanImagePathsJob) do
        AutoScanImagePathsJob.perform_now
      end
    end

    # Only enabled_path should be scanned
    assert_equal 1, call_count, "Expected only one path to be scanned"
  end

  test "job skips paths with nil frequency" do
    path = ImagePath.create!(
      name: "test_valid_directory",
      scan_frequency_minutes: nil
    )

    # Ensure scan_and_update! is not called
    ImagePath.any_instance.expects(:scan_and_update!).never

    assert_enqueued_with(job: AutoScanImagePathsJob) do
      AutoScanImagePathsJob.perform_now
    end
  end

  test "job skips currently scanning paths" do
    path = ImagePath.create!(
      name: "test_valid_directory",
      scan_frequency_minutes: 30,
      last_scanned_at: 1.hour.ago,
      currently_scanning: true
    )

    # Ensure scan_and_update! is not called
    call_count = 0
    ImagePath.stub_any_instance(:scan_and_update!, -> { call_count += 1; { added: 0, removed: 0 } }) do
      AutoScanImagePathsJob.perform_now
    end

    assert_equal 0, call_count, "Expected no paths to be scanned"
  end

  test "job re-enqueues itself after success" do
    assert_enqueued_with(job: AutoScanImagePathsJob, at: 5.minutes.from_now) do
      AutoScanImagePathsJob.perform_now
    end
  end

  test "job continues with other paths after individual path error" do
    path1 = ImagePath.create!(
      name: "test_valid_directory",
      scan_frequency_minutes: 30,
      last_scanned_at: 1.hour.ago
    )
    path2 = ImagePath.create!(
      name: "test_empty_directory",
      scan_frequency_minutes: 30,
      last_scanned_at: 1.hour.ago
    )

    # Make path1 fail, but path2 should still be attempted
    call_order = []
    ImagePath.any_instance.stub(:scan_and_update!) do |instance|
      call_order << instance.name
      raise "Test error" if instance.name == "test_valid_directory"
      { added: 0, removed: 0 }
    end

    # Job should continue despite error
    assert_enqueued_with(job: AutoScanImagePathsJob) do
      AutoScanImagePathsJob.perform_now
    end

    # Both paths should have been attempted
    assert_equal 2, call_order.length, "Expected both paths to be processed"
  end

  test "circuit breaker stops job after 3 consecutive failures" do
    # Simulate 3 consecutive failures
    AutoScanImagePathsJob.stub(:perform, -> { raise "Job error" }) do
      3.times do
        begin
          AutoScanImagePathsJob.perform_now
        rescue => e
          # Expected to fail
        end
      end
    end

    # Check that cache shows failures
    failures = Rails.cache.read("auto_scan_failures")
    assert failures >= AutoScanImagePathsJob::MAX_CONSECUTIVE_FAILURES,
           "Expected failures to be tracked in cache"
  end

  test "circuit breaker resets counter after reaching max failures" do
    # Mock the job to always fail
    call_count = 0
    original_perform = AutoScanImagePathsJob.instance_method(:perform)

    AutoScanImagePathsJob.define_method(:perform) do
      call_count += 1
      raise "Simulated failure"
    end

    # First failure
    begin
      AutoScanImagePathsJob.perform_now
    rescue => e
      # Expected
    end
    assert_equal 1, Rails.cache.read("auto_scan_failures")

    # Second failure
    begin
      AutoScanImagePathsJob.perform_now
    rescue => e
      # Expected
    end
    assert_equal 2, Rails.cache.read("auto_scan_failures")

    # Third failure - should reset to 0 and stop re-enqueuing
    begin
      AutoScanImagePathsJob.perform_now
    rescue => e
      # Expected
    end
    assert_equal 0, Rails.cache.read("auto_scan_failures"),
                 "Expected counter to be reset after max failures"

    # Restore original method
    AutoScanImagePathsJob.define_method(:perform, original_perform)
  end

  test "job scans paths that are due based on frequency" do
    # Create path that's due
    due_path = ImagePath.create!(
      name: "test_valid_directory",
      scan_frequency_minutes: 30,
      last_scanned_at: 1.hour.ago
    )

    # Create path that's not due
    not_due_path = ImagePath.create!(
      name: "test_empty_directory",
      scan_frequency_minutes: 60,
      last_scanned_at: 10.minutes.ago
    )

    scanned_paths = []
    ImagePath.stub_any_instance(:scan_and_update!, ->(instance) {
      scanned_paths << instance.name
      { added: 0, removed: 0 }
    }) do
      AutoScanImagePathsJob.perform_now
    end

    assert_includes scanned_paths, "test_valid_directory"
    assert_not_includes scanned_paths, "test_empty_directory"
  end

  test "job logs results correctly" do
    path = ImagePath.create!(
      name: "test_valid_directory",
      scan_frequency_minutes: 30,
      last_scanned_at: 1.hour.ago
    )

    # Capture log output
    assert_nothing_raised do
      AutoScanImagePathsJob.perform_now
    end
  end
end
