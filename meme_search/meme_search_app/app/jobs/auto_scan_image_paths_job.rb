class AutoScanImagePathsJob < ApplicationJob
  queue_as :default

  MAX_CONSECUTIVE_FAILURES = 3

  def perform
    # Find paths due for scanning (only those with auto-scan enabled)
    due_paths = ImagePath.where(
      "scan_frequency_minutes IS NOT NULL AND " \
      "(last_scanned_at IS NULL OR last_scanned_at + (scan_frequency_minutes * interval '1 minute') <= ?)",
      Time.current
    ).where(currently_scanning: false)

    # Scan each due path
    due_paths.find_each do |path|
      begin
        path.scan_and_update!
      rescue => e
        # Log error but continue with other paths
        Rails.logger.error "[AutoScan] #{path.name} - Error: #{e.message}"
      end
    end

    # Re-enqueue for next check in 5 minutes (with circuit breaker)
    AutoScanImagePathsJob.set(wait: 5.minutes).perform_later
  rescue => e
    # Circuit breaker: Track consecutive failures
    failures = Rails.cache.read("auto_scan_failures") || 0
    failures += 1

    if failures >= MAX_CONSECUTIVE_FAILURES
      Rails.logger.error "[AutoScan] Circuit breaker triggered after #{failures} failures. Stopping auto-scan job."
      Rails.cache.write("auto_scan_failures", 0)  # Reset counter
      # Don't re-enqueue - job stopped until manual restart
    else
      Rails.cache.write("auto_scan_failures", failures, expires_in: 1.hour)
      AutoScanImagePathsJob.set(wait: 5.minutes).perform_later  # Try again
    end

    raise  # Re-raise to log in job system
  end
end
