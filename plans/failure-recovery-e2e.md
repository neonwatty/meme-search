# E2E Test Plan: Failure Recovery with Mixed Success/Failure

**Version**: 1.0  
**Date**: 2025-11-10  
**Status**: Planning  

---

## Executive Summary

This plan details the implementation of an E2E test that validates system robustness when image processing fails for some images but succeeds for others. The test will ensure the Python worker continues processing after exceptions and that the Rails UI correctly displays mixed success/failure states.

---

## Current State Analysis

### Test Model Behavior
- **Location**: `meme_search/image_to_text_generator/app/model_init.py` (lines 26-50)
- **Current behavior**: `TestImageToText` always succeeds
  - Returns deterministic output: `f"Test description for {filename}"`
  - Fixed 1-second delay per image
  - No failure scenarios implemented

### Worker Error Handling
- **Location**: `meme_search/image_to_text_generator/app/jobs.py` (lines 96-105)
- **Current behavior**: 
  - Catches all exceptions in `try/except` block
  - Logs error: `logging.error(f"Worker thread error: {e}", exc_info=True)`
  - Closes database connection
  - Sleeps 5 seconds and continues
  - **Issue**: Does NOT send status=5 (failed) to Rails on processing errors

### Rails Status Handling
- **Status enum**: `ImageCore` model (lines 39-46)
  - 0: `not_started`
  - 1: `in_queue`
  - 2: `processing`
  - 3: `done`
  - 4: `removing`
  - 5: `failed` ← Target status for this test
- **UI rendering**: `app/views/image_cores/_generate_status.html.erb` (lines 36-39)
  - Red badge with "failed" text when status=5

---

## Test Scenario Design

### Test Name
`should handle mixed success and failure in batch processing`

### Test Objectives
1. Verify worker continues processing after encountering failures
2. Verify successful images still get descriptions
3. Verify failed images show correct status (5/failed)
4. Verify UI displays error state for failed images
5. Verify queue processes in FIFO order despite failures
6. Verify no system crashes or database corruption

### Test Flow
```
Setup
  ↓
Create 4 test images (2 success, 2 failure patterns)
  ↓
Trigger batch processing via image path rescan
  ↓
Monitor processing states (status updates via WebSocket)
  ↓
Verify final states:
  - 2 images: status=3 (done) + descriptions
  - 2 images: status=5 (failed) + no descriptions
  ↓
Verify UI rendering of failed state
  ↓
Cleanup
```

---

## Implementation Strategy

### Option A: Extend TestImageToText (Recommended)

**Pros**:
- Clean, maintainable solution
- Works in both CI and local environments
- Predictable, deterministic behavior
- No external dependencies

**Cons**:
- Requires modifying production model code
- Could affect other tests (need to verify)

**Implementation**:

```python
# meme_search/image_to_text_generator/app/model_init.py

class TestImageToText:
    """
    Test/dummy model for E2E testing that doesn't require actual ML inference.
    Returns deterministic output based on filename with a fixed 1-second delay
    to simulate realistic processing time for testing batch operations and
    real-time updates.
    
    FAILURE TESTING:
    - Files matching pattern "*_fail.jpg" will raise Exception
    - Files matching pattern "*_invalid.png" will raise FileNotFoundError
    """
    def __init__(self):
        import time
        from pathlib import Path
        self.model_id = "test-dummy-model"
        self.device = "cpu"
        self.time = time
        self.Path = Path

    def download(self):
        return None

    def extract(self, image_path):
        # Fixed 1-second delay to simulate realistic processing
        self.time.sleep(1)

        # Return deterministic output based on filename for assertions
        filename = self.Path(image_path).stem
        
        # NEW: Check for failure patterns
        if "_fail" in filename:
            raise Exception(f"Simulated processing failure for {filename}")
        if "_invalid" in filename:
            raise FileNotFoundError(f"Simulated invalid file: {filename}")
        
        return f"Test description for {filename}"
```

### Option B: Mock at API Level

**Pros**:
- No changes to model code
- Test-specific implementation

**Cons**:
- Complex to implement with WebSocket real-time updates
- Harder to test actual worker error handling
- Requires mocking FastAPI endpoints

**Verdict**: Not recommended for this use case.

### Option C: Invalid File Paths

**Pros**:
- Tests real error conditions

**Cons**:
- Less predictable (different errors on different systems)
- Harder to create specific failure scenarios
- Can't distinguish between different failure types

**Verdict**: Not recommended for this use case.

---

## Missing Feature: Status=5 on Processing Errors

### Problem
**Current code** (`jobs.py` lines 96-105):
```python
except Exception as e:
    logging.error(f"Worker thread error: {e}", exc_info=True)
    # Close connection on error
    if conn:
        try:
            conn.close()
        except Exception:
            pass
    # Sleep before retrying
    time.sleep(5)
```

The worker catches exceptions but:
- Does NOT send status=5 (failed) to Rails
- Does NOT remove the failed job from queue
- Job remains in database, will retry indefinitely

### Solution: Add Failure Status Reporting

**Location**: `meme_search/image_to_text_generator/app/jobs.py`

**Modified code** (lines 37-106):
```python
def process_jobs(JOB_DB, APP_URL):
    logging.info("Worker thread started - ready to process jobs")
    while True:
        conn = None
        job = None
        job_id = None
        image_core_id = None
        
        try:
            with lock:
                conn = sqlite3.connect(JOB_DB)
                cursor = conn.cursor()

                cursor.execute("SELECT * FROM jobs ORDER BY id LIMIT 1")
                job = cursor.fetchone()

                if job:
                    # unpack job
                    job_id, image_core_id, image_path, model = job

                    # pack up data for processing / status update
                    input_job_details = {
                        "image_core_id": image_core_id,
                        "image_path": "/app/public/memes/" + image_path if "tests" not in JOB_DB else image_path,
                        "model": model,
                    }
                    status_job_details = {"image_core_id": image_core_id, "status": 2}

                    # send status update (image out of queue and in process)
                    status_sender(status_job_details, APP_URL)

                    # report that processing has begun
                    logging.info("Processing job: %s", input_job_details)

                    # process job (this can raise exceptions)
                    output_job_details = proccess_job(input_job_details)

                    # send results to main app
                    description_sender(output_job_details, APP_URL)

                    # send status update (image processing complete)
                    status_job_details["status"] = 3
                    status_sender(status_job_details, APP_URL)

                    # log completion
                    logging.info("Finished processing job: %s", input_job_details)

                    # Remove the processed job from the queue
                    cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
                    conn.commit()
                else:
                    # If there are no jobs, wait for a while before checking again
                    logging.info("No jobs in queue. Waiting...")

                # Always close connection before sleep/continue
                if conn:
                    conn.close()
                    conn = None

            # Sleep outside the lock to allow other operations
            if not job:
                time.sleep(5)

        except Exception as e:
            logging.error(f"Worker thread error: {e}", exc_info=True)
            
            # NEW: Send failure status to Rails if we have the image_core_id
            if image_core_id is not None:
                try:
                    status_job_details = {"image_core_id": image_core_id, "status": 5}
                    status_sender(status_job_details, APP_URL)
                    logging.info(f"Sent failure status for image_core_id: {image_core_id}")
                except Exception as status_error:
                    logging.error(f"Failed to send failure status: {status_error}")
            
            # NEW: Remove failed job from queue to prevent infinite retries
            if conn and job_id is not None:
                try:
                    with lock:
                        cursor = conn.cursor()
                        cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
                        conn.commit()
                        logging.info(f"Removed failed job {job_id} from queue")
                except Exception as db_error:
                    logging.error(f"Failed to remove job from queue: {db_error}")
            
            # Close connection on error
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass
            
            # Sleep before continuing
            time.sleep(5)
```

**Key changes**:
1. Track `job_id` and `image_core_id` outside try block
2. Send status=5 on exception
3. Remove failed job from queue (prevent infinite retries)
4. Better error logging

---

## Test Implementation

### Test File
`playwright/tests/failure-recovery.spec.ts`

### Page Object Additions
May need to extend `ImageCoresPage` or `ImagePathsPage` with:
- `async waitForStatus(imageId: number, expectedStatus: string, timeout?: number)`
- `async getStatusForImage(imageId: number): Promise<string>`
- `async hasFailedBadge(imageId: number): Promise<boolean>`

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { ImagePathsPage } from '../pages/settings/image-paths.page';
import { ImageCoresPage } from '../pages/image-cores.page';
import { resetTestDatabase } from '../utils/db-setup';
import {
  addTestImage,
  cleanupTestImages,
  fileExists,
  getMemeFilePath
} from '../utils/filesystem-helpers';

/**
 * Failure Recovery E2E Test
 * 
 * Validates that the system gracefully handles mixed success/failure scenarios
 * when processing multiple images, ensuring:
 * - Worker continues after failures
 * - Successful images get descriptions
 * - Failed images show correct status
 * - No system crashes or queue corruption
 */

test.describe('Failure Recovery in Batch Processing', () => {
  let imagePathsPage: ImagePathsPage;
  let imageCoresPage: ImageCoresPage;

  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    imagePathsPage = new ImagePathsPage(page);
    imageCoresPage = new ImageCoresPage(page);
  });

  test.afterEach(async () => {
    await cleanupTestImages();
  });

  test('should handle mixed success and failure in batch processing', async ({ page }) => {
    // STEP 1: Setup - Create test directory with 4 images
    console.log('Setting up test images...');
    
    const testDir = 'test_failure_recovery';
    
    // Create 2 images that will succeed
    await addTestImage(testDir, 'success_1.jpg');
    await addTestImage(testDir, 'success_2.jpg');
    
    // Create 2 images that will fail (special naming triggers TestImageToText to raise)
    await addTestImage(testDir, 'image_fail.jpg');     // Will raise Exception
    await addTestImage(testDir, 'broken_invalid.png'); // Will raise FileNotFoundError
    
    // Verify all files exist
    expect(fileExists(getMemeFilePath(testDir, 'success_1.jpg'))).toBeTruthy();
    expect(fileExists(getMemeFilePath(testDir, 'success_2.jpg'))).toBeTruthy();
    expect(fileExists(getMemeFilePath(testDir, 'image_fail.jpg'))).toBeTruthy();
    expect(fileExists(getMemeFilePath(testDir, 'broken_invalid.png'))).toBeTruthy();
    
    // STEP 2: Create image path (triggers processing)
    console.log('Creating image path to trigger processing...');
    await imagePathsPage.goto();
    await imagePathsPage.createPath(testDir);
    
    // Should see success message
    const flashMessage = await imagePathsPage.waitForFlashMessage();
    expect(flashMessage).toContain('succesfully created');
    
    // STEP 3: Navigate to index and monitor processing
    console.log('Navigating to index to monitor processing...');
    await imageCoresPage.gotoRoot();
    
    // Should see 4 images in various states
    let memeCount = await imageCoresPage.getMemeCount();
    expect(memeCount).toBe(4);
    
    // STEP 4: Wait for batch processing to complete
    // Note: 4 images × 1 second each = ~4 seconds + overhead
    console.log('Waiting for batch processing to complete...');
    
    // Wait for all processing to finish (max 15 seconds)
    // Check every 1 second for status updates
    let allProcessed = false;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (!allProcessed && attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      attempts++;
      
      // Check if any images still show "processing" or "in_queue" status
      const processingBadges = page.locator('.bg-emerald-500:has-text("processing"), .bg-amber-500:has-text("in_queue")');
      const processingCount = await processingBadges.count();
      
      if (processingCount === 0) {
        allProcessed = true;
        console.log(`All processing complete after ${attempts} seconds`);
      } else {
        console.log(`Still processing: ${processingCount} images remaining...`);
      }
    }
    
    expect(allProcessed).toBe(true);
    
    // STEP 5: Verify final states
    console.log('Verifying final states...');
    
    // Should have 2 failed images (red badges with "failed")
    const failedBadges = page.locator('.bg-red-500:has-text("failed")');
    const failedCount = await failedBadges.count();
    expect(failedCount).toBe(2);
    console.log(`Found ${failedCount} failed images ✓`);
    
    // Should have 2 successful images with "generate description" button
    // (status=3/done shows the button to regenerate)
    const generateButtons = page.locator('form[action*="generate_description"]');
    const successCount = await generateButtons.count();
    expect(successCount).toBe(2);
    console.log(`Found ${successCount} successful images ✓`);
    
    // STEP 6: Verify successful images have descriptions
    console.log('Verifying successful images have descriptions...');
    
    // Click first success image to view details
    const firstSuccessCard = page.locator('div[id^="image_core_card_"]:has(form[action*="generate_description"])').first();
    await firstSuccessCard.click();
    await page.waitForLoadState('networkidle');
    
    // Should see description on show page
    const description = await imageCoresPage.getDescriptionValue();
    expect(description).toBeTruthy();
    expect(description).toMatch(/Test description for (success_1|success_2)/);
    console.log(`First successful image description: "${description}" ✓`);
    
    // Navigate back to index
    await imageCoresPage.gotoRoot();
    
    // STEP 7: Verify failed images have no descriptions
    console.log('Verifying failed images have no descriptions...');
    
    // Click first failed image to view details
    const firstFailedCard = page.locator('div[id^="image_core_card_"]:has(.bg-red-500:has-text("failed"))').first();
    await firstFailedCard.click();
    await page.waitForLoadState('networkidle');
    
    // Should see failed status badge
    const failedBadge = page.locator('.bg-red-500:has-text("failed")');
    expect(await failedBadge.count()).toBe(1);
    console.log('Failed image shows failed badge ✓');
    
    // Description should be empty or default
    const failedDescription = await imageCoresPage.getDescriptionValue();
    expect(failedDescription).toBeFalsy();
    console.log('Failed image has no description ✓');
    
    // Navigate back to index
    await imageCoresPage.gotoRoot();
    
    // STEP 8: Verify no system crashes
    console.log('Verifying system stability...');
    
    // Index page should still be responsive
    memeCount = await imageCoresPage.getMemeCount();
    expect(memeCount).toBe(4);
    
    // Can still interact with UI (e.g., open settings)
    await imagePathsPage.goto();
    const heading = await imagePathsPage.getHeading();
    expect(heading).toBe('Image Paths');
    console.log('System remains stable after mixed success/failure ✓');
    
    console.log('\n✅ All assertions passed!');
  });
});
```

---

## Test Data Setup

### Directory Structure
```
meme_search/meme_search_app/public/memes/test_failure_recovery/
├── success_1.jpg      # Will succeed
├── success_2.jpg      # Will succeed
├── image_fail.jpg     # Will fail (Exception)
└── broken_invalid.png # Will fail (FileNotFoundError)
```

### File Creation
Use existing `addTestImage()` helper from `playwright/utils/filesystem-helpers.ts`:
```typescript
await addTestImage('test_failure_recovery', 'success_1.jpg');
await addTestImage('test_failure_recovery', 'success_2.jpg');
await addTestImage('test_failure_recovery', 'image_fail.jpg');
await addTestImage('test_failure_recovery', 'broken_invalid.png');
```

---

## UI Elements to Assert

### Failed State UI Elements
**Location**: `app/views/image_cores/_generate_status.html.erb` (lines 36-39)

```erb
<% when "failed" %>
  <div class="bg-red-500 hover w-auto py-1 px-2 rounded-2xl text-center text-sm">
    failed
  </div>
```

**Selector**: `.bg-red-500:has-text("failed")`

### Success State UI Elements
**Location**: Same file (lines 25-31)

```erb
<% when "done" %>
  <%= form_with(url: generate_description_image_core_path(img_id), local: true) do |form| %>
    <% form.submit "generate description 🪄", class: "bg-blue-500 border hover hover:bg-cyan-500 cursor-pointer w-auto py-1 px-2 rounded-2xl"%>
  <% end %>
```

**Selector**: `form[action*="generate_description"]`

### Processing State UI Elements
**In-queue**: `.bg-amber-500:has-text("in_queue")`
**Processing**: `.bg-emerald-500:has-text("processing")`

---

## Assertions Checklist

- [ ] 4 images created successfully in filesystem
- [ ] 4 images appear in UI after path creation
- [ ] All images process within 15 seconds
- [ ] 2 images end in "failed" state (red badge)
- [ ] 2 images end in "done" state (generate button visible)
- [ ] Successful images have descriptions matching pattern `Test description for <filename>`
- [ ] Failed images have no descriptions
- [ ] System remains stable (no crashes)
- [ ] Index page remains responsive
- [ ] Settings pages remain accessible

---

## Implementation Order

### Phase 1: Worker Enhancement (Required)
1. ✅ Modify `jobs.py` to send status=5 on processing errors
2. ✅ Add job removal from queue on failure
3. ✅ Add unit tests for failure status sending
4. ✅ Run existing Python tests to ensure no regressions

### Phase 2: Test Model Enhancement (Required)
1. ✅ Extend `TestImageToText.extract()` with failure patterns
2. ✅ Add unit tests for failure patterns
3. ✅ Verify integration tests still pass

### Phase 3: E2E Test Implementation
1. ✅ Create `failure-recovery.spec.ts`
2. ✅ Implement test setup (4 images: 2 success, 2 failure)
3. ✅ Implement monitoring logic (wait for processing)
4. ✅ Implement verification assertions
5. ✅ Add cleanup logic

### Phase 4: Page Object Extensions (If Needed)
1. ✅ Add `waitForStatus()` helper
2. ✅ Add `getStatusForImage()` helper
3. ✅ Add `hasFailedBadge()` helper

### Phase 5: Validation
1. ✅ Run E2E test locally
2. ✅ Run full E2E suite to ensure no regressions
3. ✅ Run in CI environment
4. ✅ Document test in README

---

## Risks & Mitigations

### Risk 1: Race Conditions
**Description**: WebSocket updates may not arrive before assertions
**Mitigation**: Use polling with timeout (15 seconds max)

### Risk 2: Test Flakiness
**Description**: Timing issues with 1-second delays
**Mitigation**: 
- Use `waitForTimeout()` strategically
- Check for absence of "processing" badges
- Add retry logic for assertions

### Risk 3: Infinite Retry Loop
**Description**: If job removal fails, job could retry forever
**Mitigation**: 
- Ensure transaction commit in error handler
- Add logging for job removal
- Add test to verify job is removed from queue

### Risk 4: Impact on Other Tests
**Description**: Changes to `TestImageToText` could break existing tests
**Mitigation**:
- Only trigger failures on specific filename patterns
- Run full test suite before committing
- Default behavior remains unchanged

---

## Alternative Approaches

### Alternative 1: Extend Test Model with Environment Variable
**Implementation**:
```python
def extract(self, image_path):
    self.time.sleep(1)
    filename = self.Path(image_path).stem
    
    # Check environment variable for failure mode
    if os.getenv('TEST_FAILURE_MODE') == 'enabled':
        if "_fail" in filename:
            raise Exception(f"Simulated failure for {filename}")
    
    return f"Test description for {filename}"
```

**Pros**: More explicit control, doesn't affect other tests
**Cons**: Requires environment variable management, more complex

### Alternative 2: Separate Test Model Class
**Implementation**: Create `TestImageToTextWithFailures` class

**Pros**: Complete isolation from existing model
**Cons**: Need to modify model_selector, more code duplication

### Alternative 3: Mock at Controller Level
**Implementation**: Intercept `/add_job` requests in E2E test

**Pros**: No changes to Python codebase
**Cons**: Doesn't test actual worker error handling, complex to implement

**Verdict**: Original approach (Option A) is cleanest and most straightforward.

---

## Success Criteria

### Must Have
- [ ] Test passes consistently (3/3 runs locally)
- [ ] Test passes in CI environment
- [ ] Worker sends status=5 on processing errors
- [ ] Failed jobs removed from queue
- [ ] UI correctly displays failed state
- [ ] Successful images still get descriptions
- [ ] No system crashes or hangs

### Nice to Have
- [ ] Test completes in under 30 seconds
- [ ] Detailed logging for debugging
- [ ] Screenshots of failed state in test artifacts
- [ ] Performance metrics (processing time per image)

---

## Open Questions

1. **Should failed jobs support retry?**
   - Current plan: No, remove immediately
   - Alternative: Add retry_count column, retry N times before marking failed
   - Decision: Start with no retry (simpler), can add later if needed

2. **Should we test different failure types?**
   - Exception (general processing failure)
   - FileNotFoundError (missing file)
   - IOError (permission denied)
   - Decision: Start with 2 types, expand if valuable

3. **Should UI show failure reason?**
   - Current: Just shows "failed" badge
   - Enhancement: Show error message from Python worker
   - Decision: Out of scope for this test, but good future feature

4. **How to handle partial failures in embeddings?**
   - Scenario: Description succeeds but embedding generation fails
   - Current: Not tested
   - Decision: Future test, separate concern

---

## Next Steps

1. Review plan with team
2. Get approval for `jobs.py` changes (worker enhancement)
3. Get approval for `TestImageToText` changes
4. Implement Phase 1 (Worker Enhancement)
5. Implement Phase 2 (Test Model Enhancement)
6. Run unit tests to verify no regressions
7. Implement Phase 3 (E2E Test)
8. Run full E2E suite
9. Document test in `playwright/README.md`
10. Submit PR with:
    - Worker enhancement
    - Test model enhancement
    - E2E test
    - Updated documentation

---

## References

- Worker code: `meme_search/image_to_text_generator/app/jobs.py`
- Test model: `meme_search/image_to_text_generator/app/model_init.py`
- Rails model: `meme_search/meme_search_app/app/models/image_core.rb`
- UI partial: `meme_search/meme_search_app/app/views/image_cores/_generate_status.html.erb`
- Existing E2E tests: `playwright/tests/`
- Unit tests: `meme_search/image_to_text_generator/tests/unit/test_jobs.py`

---

## Appendix A: Unit Test for Worker Failure Handling

**File**: `meme_search/image_to_text_generator/tests/unit/test_jobs.py`

Add new test to `TestProcessJobs` class:

```python
@patch('jobs.sqlite3.connect')
@patch('jobs.proccess_job')
@patch('jobs.description_sender')
@patch('jobs.status_sender')
@patch('jobs.time.sleep')
@patch('jobs.logging')
def test_process_jobs_sends_failed_status_on_exception(
    self, mock_logging, mock_sleep, mock_status_sender,
    mock_desc_sender, mock_proccess_job, mock_connect
):
    """Test worker sends status=5 (failed) when job processing fails"""
    # Setup
    mock_conn = Mock()
    mock_cursor = Mock()
    
    # One job that will fail, then empty queue
    mock_cursor.fetchone.side_effect = [
        (1, 42, "bad.jpg", "test"),
        None
    ]
    
    mock_conn.cursor.return_value = mock_cursor
    mock_connect.return_value = mock_conn
    
    # Job processing raises exception
    mock_proccess_job.side_effect = Exception("Image processing failed")
    
    mock_sleep.side_effect = [None, KeyboardInterrupt()]
    
    # Capture status values
    captured_statuses = []
    def capture_status(status_dict, url):
        captured_statuses.append(status_dict["status"])
    mock_status_sender.side_effect = capture_status
    
    # Execute
    try:
        process_jobs("test.db", "http://localhost:3000/")
    except KeyboardInterrupt:
        pass
    
    # Assert
    # Should send status=2 (processing), then status=5 (failed)
    assert mock_status_sender.call_count == 2
    assert captured_statuses == [2, 5], f"Expected [2, 5] (processing → failed), got {captured_statuses}"
    
    # Failed job should be removed from queue
    mock_cursor.execute.assert_any_call("DELETE FROM jobs WHERE id = ?", (1,))
    
    # Error should be logged
    mock_logging.error.assert_called()
```

---

## Appendix B: Unit Test for Test Model Failures

**File**: `meme_search/image_to_text_generator/tests/unit/test_model_init.py`

Add new test class:

```python
class TestImageToTextFailurePatterns:
    """Test suite for TestImageToText failure simulation"""
    
    def test_extract_success_normal_filename(self):
        """Test normal filename succeeds"""
        model = TestImageToText()
        result = model.extract("/path/to/normal_image.jpg")
        assert result == "Test description for normal_image"
    
    def test_extract_raises_exception_on_fail_pattern(self):
        """Test filename with '_fail' raises Exception"""
        model = TestImageToText()
        with pytest.raises(Exception, match="Simulated processing failure"):
            model.extract("/path/to/image_fail.jpg")
    
    def test_extract_raises_filenotfound_on_invalid_pattern(self):
        """Test filename with '_invalid' raises FileNotFoundError"""
        model = TestImageToText()
        with pytest.raises(FileNotFoundError, match="Simulated invalid file"):
            model.extract("/path/to/broken_invalid.png")
    
    def test_extract_success_with_fail_substring_in_middle(self):
        """Test '_fail' pattern must be in basename, not full path"""
        model = TestImageToText()
        # Should fail - '_fail' in basename
        with pytest.raises(Exception):
            model.extract("/path/to/image_fail.jpg")
        
        # Should succeed - '_fail' only in directory name
        result = model.extract("/fail_directory/normal_image.jpg")
        assert result == "Test description for normal_image"
```

---

**END OF PLAN**
