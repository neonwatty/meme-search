# Auto-Scan Feature Design

**Feature**: Automatic directory scanning with user-configurable frequencies

**Created**: 2025-11-11
**Status**: Planning

---

## Overview

Enable optional automatic scanning of tracked image folders to detect new/removed images without manual user intervention. Auto-scan is **opt-in** (disabled by default). Each folder can have its own scan frequency (30 minutes to daily), with a background job that checks every 5 minutes and scans paths that are "due" based on their individual schedules. Includes error handling, visual status indicators, and concurrent scan protection.

---

## Key Features

✅ **Per-folder scan frequency** - Users choose: Manual only (default), 30min, 1hr, 6hr, or Daily
✅ **Opt-in auto-scanning** - Auto-scan disabled by default ("Manual only"), users must explicitly enable
✅ **Smart scheduling** - Job checks every 5 minutes, only scans paths that are due
✅ **UI shows next scan time** - Display "Next scan in 23m" for paths with auto-scan enabled
✅ **Visual scan status** - Show "Scanning...", "Up to date", or error states in real-time
✅ **Error handling** - Failed scans show error message with retry button
✅ **Concurrent scan protection** - Prevents duplicate scans of the same path
✅ **Immediate first scan** - New paths scan immediately on creation, then follow frequency

---

## Design Decisions

### Why Polling Instead of Filesystem Events?

**Considered**: Listen gem with inotify/FSEvents for real-time detection

**Decision**: Use scheduled polling

**Rationale**:
- Docker volume mounts don't propagate filesystem events from host to container
- Would require `force_polling: true` in production anyway
- Low file count + infrequent changes = negligible polling overhead
- Simpler implementation, fewer dependencies
- More reliable across environments

### Background Job System

**Decision**: Keep existing `:async` adapter with self-re-enqueuing job

**Why not Solid Queue?**
- Adds dependency and migrations
- `:async` sufficient for periodic scanning (non-critical)
- Jobs auto-restart on Rails boot via initializer
- Can upgrade to Solid Queue later if persistence needed

### Scan Frequency Check Interval

**Decision**: Job checks every 5 minutes, scans paths where `due_for_scan?` returns true

**Example**:
- Path A: frequency = 15 min, last scan = 20 min ago → **Scans now**
- Path B: frequency = 60 min, last scan = 30 min ago → **Skips** (not due yet)
- Path C: frequency = 15 min, last scan = 5 min ago → **Skips** (not due yet)

This allows fine-grained per-folder control while keeping the job loop simple.

### Opt-In Auto-Scan

**Decision**: Auto-scan disabled by default (frequency = `null` = "Manual only")

**Rationale**:
- Conservative approach - users must explicitly enable auto-scanning
- Prevents unexpected behavior for new users
- Clear opt-in UX: dropdown defaults to "Manual only"
- Existing manual "Rescan" button always available regardless of setting

### Error Handling & Resilience

**Decision**: Track scan errors and display in UI

**Features**:
- `scan_status` enum: idle (0), scanning (1), failed (2)
- `last_scan_error` text column stores error messages
- Circuit breaker: Stop re-enqueuing after 3 consecutive job failures
- UI shows "[❌ Scan failed: Permission denied] [Retry Now]"
- Job continues scanning other paths even if one fails

### Concurrent Scan Protection

**Decision**: Use optimistic locking to prevent duplicate scans

**Implementation**:
- Add `currently_scanning` boolean flag
- Use database lock during scan
- Skip if already scanning (both manual and auto-triggered)
- Prevents race conditions between auto-scan job and manual rescan button

---

## Architecture

### Database Schema

```ruby
# image_paths table
add_column :scan_frequency_minutes, :integer, default: nil  # null = "Manual only"
add_column :last_scanned_at, :datetime
add_column :scan_status, :integer, default: 0, null: false  # 0=idle, 1=scanning, 2=failed
add_column :last_scan_error, :text
add_column :currently_scanning, :boolean, default: false, null: false
add_column :last_scan_duration_ms, :integer  # Performance tracking

add_index :image_paths, :last_scanned_at
add_index :image_paths, :scan_frequency_minutes
```

### Model Logic

```ruby
class ImagePath < ApplicationRecord
  SCAN_FREQUENCIES = {
    nil => "Manual only",  # Default
    30 => "Every 30 minutes",
    60 => "Every hour",
    360 => "Every 6 hours",
    1440 => "Daily"
  }.freeze

  enum scan_status: { idle: 0, scanning: 1, failed: 2 }

  def auto_scan_enabled?
    scan_frequency_minutes.present?
  end

  def due_for_scan?
    return false unless auto_scan_enabled?
    return true if last_scanned_at.nil?
    Time.current >= next_scan_time
  end

  def next_scan_time
    return nil unless auto_scan_enabled?
    return Time.current if last_scanned_at.nil?
    last_scanned_at + scan_frequency_minutes.minutes
  end

  def time_until_next_scan
    return "Manual only" unless auto_scan_enabled?
    return "Due now" if due_for_scan?
    # Returns human-readable countdown: "23m", "1h 15m"
    distance_of_time_in_words(Time.current, next_scan_time)
  end

  def scan_and_update!
    return if currently_scanning?  # Skip if already scanning

    with_lock do
      update_columns(currently_scanning: true, scan_status: :scanning, last_scan_error: nil)
      start_time = Time.current

      begin
        result = list_files_in_directory # Existing method
        duration_ms = ((Time.current - start_time) * 1000).to_i

        update_columns(
          last_scanned_at: Time.current,
          scan_status: :idle,
          currently_scanning: false,
          last_scan_duration_ms: duration_ms,
          last_scan_error: nil
        )

        Rails.logger.info "[Scan] #{name} - Duration: #{duration_ms}ms, Added: #{result[:added]}, Removed: #{result[:removed]}"
        result
      rescue => e
        update_columns(
          scan_status: :failed,
          currently_scanning: false,
          last_scan_error: e.message
        )
        Rails.logger.error "[Scan] #{name} - Failed: #{e.message}"
        raise
      end
    end
  end
end
```

### Background Job

```ruby
class AutoScanImagePathsJob < ApplicationJob
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
```

### Controller Actions

**Updated**: `rescan` - Uses `scan_and_update!` to update timestamp and track errors

**Updated**: `create` - Triggers immediate first scan after path creation (if auto-scan enabled)

---

## User Interface

**💡 See detailed visual mockups**: `plans/mockups/` directory contains 4 interactive HTML files demonstrating all UI states

### Path Form (Create & Edit)

**📄 Mockups**:
- `mockups/01-path-form-frequency-dropdown.html` (Create)
- `mockups/04-path-edit-form.html` (Edit)

**New field**: Scan frequency dropdown
```
[ Scan Frequency ▼ ]
Options:
- Manual only (default)
- Every 30 minutes
- Every hour
- Every 6 hours
- Daily

Help text: "Auto-scan this folder for new/removed images? Default is 'Manual only'."
```

**Edit form additional features**:
- Shows current scan status (idle/scanning/failed)
- Displays last scan time and next scan time
- Tip box for disabling auto-scan
- Common scenario examples

### Path Card Display

**📄 Mockups**:
- `mockups/02-path-card-all-states.html` (Detailed view of all 6 states)
- `mockups/03-paths-index-overview.html` (Full page with multiple paths)

Shows for each path based on status:

**Manual only** (auto-scan disabled):
```
[⚙️] Auto-scan: Manual only
[Rescan Now] button
```
*Color scheme: Gray background, settings gear icon*

**Auto-scan enabled (idle, up to date)**:
```
[✓] Scans every 30 minutes
    Next scan in 15m
    Last: 15 minutes ago
[Rescan Now] button
```
*Color scheme: Emerald/green background, checkmark icon*

**Auto-scan enabled (due now)**:
```
[⏰] Scans every 30 minutes
    Due for scan now
    Last: 45 minutes ago
[Rescan Now] button
```
*Color scheme: Amber background, clock icon, "Due now" badge*

**Currently scanning**:
```
[🔄] Scanning...
    Last: 2 minutes ago
[Rescan Now] button (disabled)
```
*Color scheme: Blue background, spinning refresh icon, disabled button*

**Failed scan**:
```
[❌] Scan failed: Permission denied
    Last attempted: 5 minutes ago
[Retry Now] button
```
*Color scheme: Red background, error icon, error message in monospace font*

**First scan pending** (never scanned, auto-scan enabled):
```
[⚡] Scans every 30 minutes
    First scan pending
    Never scanned
[Scan Now] button
```
*Color scheme: Purple background, lightning bolt icon, "First scan pending" badge*

---

## Implementation Steps

### Step 1: Database Migration
```bash
cd meme_search/meme_search_app
bin/rails generate migration AddAutoScanToImagePaths
bin/rails db:migrate
```

### Step 2: Update Model
File: `app/models/image_path.rb`
- Add `SCAN_FREQUENCIES` constant (with `nil => "Manual only"`)
- Add `scan_status` enum
- Add `auto_scan_enabled?` method
- Add `due_for_scan?`, `next_scan_time`, `time_until_next_scan` methods
- Update `scan_and_update!` with error handling and concurrent protection
- Add validation for `scan_frequency_minutes`

### Step 3: Create Background Job
File: `app/jobs/auto_scan_image_paths_job.rb`
- Query for due paths (only where `scan_frequency_minutes IS NOT NULL`)
- Filter out currently scanning paths
- Scan each and log results
- Re-enqueue for 5 minutes later
- Add circuit breaker for consecutive failures
- Handle errors gracefully (continue with other paths)

### Step 4: Add Initializer
File: `config/initializers/auto_scan.rb`
- Start job 1 minute after Rails boot
- Skip in test environment

### Step 5: Update Controller
File: `app/controllers/settings/image_paths_controller.rb`
- Update `image_path_params` to permit `:scan_frequency_minutes`
- Update `rescan` to use `scan_and_update!`
- Update `create` to trigger immediate scan if auto-scan enabled

### Step 6: Update Views
Files:
- `app/views/settings/image_paths/_form.html.erb` - Add frequency dropdown with "Manual only" default
- `app/views/settings/image_paths/_image_path.html.erb` - Show scan status with visual indicators

**📄 Reference mockups** for implementation:
- `plans/mockups/01-path-form-frequency-dropdown.html` - Form field design
- `plans/mockups/02-path-card-all-states.html` - All status states with exact colors/icons
- `plans/mockups/03-paths-index-overview.html` - Full page layout
- `plans/mockups/04-path-edit-form.html` - Edit form with status display
- `plans/mockups/README.md` - Complete design system documentation

### Step 7: Write Tests
Files:
- `test/models/image_path_test.rb` - Test scan logic, error handling, concurrent protection
- `test/controllers/settings/image_paths_controller_test.rb` - Test immediate scan on create
- `test/jobs/auto_scan_image_paths_job_test.rb` - Test job behavior, circuit breaker

### Step 8: Run Test Suite
```bash
cd meme_search/meme_search_app
bash run_tests.sh
```

---

## Files to Create

1. `db/migrate/YYYYMMDDHHMMSS_add_auto_scan_to_image_paths.rb` - Migration
2. `app/jobs/auto_scan_image_paths_job.rb` - Background job
3. `config/initializers/auto_scan.rb` - Job starter
4. `test/jobs/auto_scan_image_paths_job_test.rb` - Job tests

---

## Files to Modify

1. `app/models/image_path.rb` - Add scan methods, error handling, concurrent protection
2. `app/controllers/settings/image_paths_controller.rb` - Update create/rescan actions
3. `app/views/settings/image_paths/_form.html.erb` - Add frequency dropdown
4. `app/views/settings/image_paths/_image_path.html.erb` - Show scan status indicators
5. `test/models/image_path_test.rb` - Add tests
6. `test/controllers/settings/image_paths_controller_test.rb` - Add tests

---

## Testing Strategy

### Unit Tests (Model)
- `auto_scan_enabled?` returns false when frequency is nil
- `due_for_scan?` returns false when auto-scan disabled
- `due_for_scan?` returns true when never scanned (and enabled)
- `due_for_scan?` returns true when overdue
- `due_for_scan?` returns false when not yet due
- `next_scan_time` returns nil when auto-scan disabled
- `time_until_next_scan` returns "Manual only" when disabled
- `scan_and_update!` updates `last_scanned_at` and tracks duration
- `scan_and_update!` sets error status on failure
- `scan_and_update!` skips if already scanning (concurrent protection)

### Integration Tests (Controller)
- `create` action triggers immediate scan if auto-scan enabled
- `create` action skips immediate scan if manual only
- `update` action accepts `scan_frequency_minutes`
- `rescan` action works regardless of auto-scan setting

### Job Tests
- Job scans only paths with auto-scan enabled
- Job skips paths with nil frequency
- Job skips currently scanning paths
- Job re-enqueues itself after success
- Job re-enqueues after individual path errors
- Circuit breaker stops job after 3 consecutive failures
- Job logs results correctly

---

## Performance Considerations

### Resource Usage
- **Memory**: ~5-10MB per background job thread (single job, negligible)
- **CPU**: Minimal (5-minute check interval, selective scanning)
- **Database**: Simple timestamp query with index on `last_scanned_at`

### Scalability
- 10 paths with 100-1000 images each = no performance impact
- Job completes in < 1 second when no paths are due
- Each scan takes 0.1-1 second depending on file count

### Database Optimization
- Add index on `last_scanned_at` for efficient due path queries
- Add index on `scan_frequency_minutes` for filtering enabled paths
- Use `update_columns` instead of `update` to skip callbacks and validations

---

## Future Enhancements

### Phase 2 (Optional)
1. **Real-time Scan Updates**: Toast notification when auto-scan completes (ActionCable)
2. **Smart Frequency Suggestions**: Suggest optimal frequency based on actual change patterns
3. **Conditional Auto-Generate**: Option to auto-generate descriptions for newly detected images
4. **Batch Scanning**: Queue multiple path scans in parallel for faster completion

### Phase 3 (Optional)
1. **Filesystem Events**: Add Listen gem for instant detection in non-Docker environments
2. **Scan Analytics Dashboard**: Show scan performance metrics, average duration, trends
3. **Global Pause/Resume**: Temporarily disable all auto-scanning during batch operations

---

## Rollout Plan

### Development
1. Implement feature on feature branch
2. Test locally with multiple paths at different frequencies
3. Verify job re-enqueues correctly
4. Check logs for expected behavior

### Staging/Testing
1. Deploy to Docker environment
2. Monitor job execution in logs
3. Test with real meme folders
4. Verify error handling with invalid paths
5. Test concurrent scan protection

### Production
1. Run migration during maintenance window
2. Monitor job performance and resource usage
3. Adjust frequencies if needed based on user feedback
4. Add monitoring/alerting if job fails

---

## Success Metrics

- ✅ Auto-scan is opt-in (default "Manual only")
- ✅ Background job runs consistently every 5 minutes
- ✅ Paths are scanned at their configured frequencies (±5 min accuracy)
- ✅ New images automatically appear in database within scan interval
- ✅ Removed images automatically deleted from database
- ✅ UI shows accurate scan status (scanning, idle, failed)
- ✅ Error handling works (errors displayed, retries work)
- ✅ Concurrent scans prevented (no duplicate scans)
- ✅ Circuit breaker stops job after 3 consecutive failures
- ✅ No performance degradation (CPU, memory, database)
- ✅ All tests pass

---

## Risks & Mitigations

### Risk: Job stops running after Rails restart
**Mitigation**: Initializer re-starts job on boot, verified in tests

### Risk: High CPU usage with many paths
**Mitigation**: Job only scans due paths, 5-minute check interval, efficient SQL query

### Risk: Database locks with concurrent scans
**Mitigation**: Database lock with `currently_scanning` flag prevents race conditions

### Risk: Scans fail silently
**Mitigation**: Error tracking with `scan_status` and `last_scan_error`, visible in UI

### Risk: Job failures cascade
**Mitigation**: Circuit breaker stops re-enqueuing after 3 consecutive failures

### Risk: Users accidentally enable auto-scan
**Mitigation**: Default to "Manual only", clear opt-in UX with help text

---

## Alternative Approaches Considered

### Option 1: Listen Gem (Filesystem Events)
**Pros**: Instant detection, no polling
**Cons**: Doesn't work in Docker with volume mounts, requires polling anyway
**Decision**: Not chosen due to Docker limitations

### Option 2: Cron with Whenever Gem
**Pros**: Persistent scheduling, system-level
**Cons**: Requires system cron access, not available in Docker/Heroku, less flexible
**Decision**: Not chosen due to deployment complexity

### Option 3: Solid Queue
**Pros**: Persistent jobs, survives restarts, web UI
**Cons**: Adds dependency, migrations, complexity
**Decision**: Not chosen (can add later if needed)

---

## Related Issues/PRs

- TBD: Link to implementation PR once created
- Related: Manual rescan feature (already implemented)
- Related: Bulk description generation (separate feature)

---

## Questions & Answers

**Q: Why 5-minute check interval instead of 1 minute?**
A: Balance between responsiveness and overhead. Users can set 15-min frequency, so checking every 1 min is unnecessary.

**Q: What happens if a path is deleted during scanning?**
A: Job handles errors gracefully, logs them, and continues with other paths. Re-enqueues itself regardless.

**Q: Can users disable auto-scan for specific paths?**
A: Yes, set frequency to "Manual only" (nil). This is the default.

**Q: What if job gets stuck or crashes?**
A: Initializer restarts job on Rails boot. Add monitoring/alerting in production to detect missing job executions.

---

## References

- [Rails ActiveJob Guide](https://guides.rubyonrails.org/active_job_basics.html)
- [Listen Gem Research](https://github.com/guard/listen) - Considered but not used
- [Rails Recurring Jobs Patterns](https://thoughtbot.com/blog/recurring-jobs-in-rails)
- CLAUDE.md - Project documentation with testing patterns
- **UI/UX Mockups**: `plans/mockups/` - Interactive HTML mockups with complete design system

---

## Changelog

- **2025-11-11**: Initial design document created
- **2025-11-11**: Simplified design based on feedback
  - Removed "Rescan All" button (minimal value)
  - Changed to opt-in auto-scan (default "Manual only")
  - Reduced frequency options (30min, 1hr, 6hr, Daily)
  - Added error handling and UI indicators
  - Added concurrent scan protection
  - Added circuit breaker for job failures
  - Added immediate first scan on path creation
  - Removed scan history features (not needed for MVP)
- **2025-11-11**: Added comprehensive UI/UX mockups
  - Created 4 interactive HTML mockups with full design system
  - All mockups support light/dark mode toggle
  - Documented all 6 scan status states with color schemes
  - Added edit form mockup for frequency adjustment
  - Included mockup README with implementation checklist
