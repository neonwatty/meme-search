# Start auto-scan job on Rails boot
# Skip in test environment to avoid interference with tests
Rails.application.config.after_initialize do
  unless Rails.env.test?
    # Wait 1 minute after boot, then start the job
    AutoScanImagePathsJob.set(wait: 1.minute).perform_later
    Rails.logger.info "[AutoScan] Job scheduled to start in 1 minute"
  end
end
