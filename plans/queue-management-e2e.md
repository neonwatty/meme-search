# E2E Test Plan: Job Queue Management with Multiple Concurrent Jobs

**Status**: Draft  
**Created**: 2025-11-10  
**Target**: Playwright E2E Test Suite  
**Estimated Duration**: 10-15 seconds per test run

---

## Overview

This plan details the implementation of a comprehensive E2E test that validates the Python job queue's ability to handle multiple concurrent image processing jobs. The test will verify FIFO (First-In-First-Out) queue behavior, correct queue length reporting, and proper status transitions as jobs are added, processed, and completed.

---

## Context & Architecture

### System Components

1. **Rails App** (localhost:3000 in test mode)
   - `ImageCore` model with status enum: `not_started`, `in_queue`, `processing`, `done`, `removing`, `failed`
   - `ImageCoresController` sends HTTP requests to Python service at `http://image_to_text_generator:8000`
   - Receives WebSocket broadcasts via ActionCable channels (`ImageStatusChannel`, `ImageDescriptionChannel`)

2. **Python FastAPI Service** (localhost:8000)
   - `POST /add_job` - Adds job to SQLite queue, sends status update (status=1: in_queue)
   - `GET /check_queue` - Returns `{"queue_length": N}`
   - `DELETE /remove_job/{id}` - Removes job from queue, sends status update (status=0: not_started)
   - Background worker thread processes jobs sequentially (FIFO)
   - Uses `test` model in test mode (simulates processing with minimal delay)

3. **Job Processing Flow**
   ```
   Rails -> POST /add_job -> Python adds to queue (status=1)
   Python worker picks job -> Processing (status=2)
   Python completes -> Sends description + status update (status=3)
   Rails receives webhook -> Updates DB + broadcasts to clients
   ```

### Test Model Behavior

When Python service runs with `testing` argument (as in CI), the `test` model is used:
- **No actual AI model inference** (mocked)
- **Fast processing**: ~1 second per job (vs 10-60s for real models)
- **Predictable output**: Returns fixed test description
- **Enables testing queue behavior** without expensive model downloads

---

## Test Objectives

### Primary Goals

1. **Concurrent Job Addition**: Verify queue correctly handles rapid addition of 10+ jobs
2. **Queue Length Tracking**: Verify `/check_queue` reports accurate counts at all stages
3. **FIFO Processing**: Verify jobs process in order (first added = first processed)
4. **Status Transitions**: Verify images transition through status lifecycle correctly
5. **Queue Draining**: Verify queue reaches zero after all jobs complete
6. **Edge Cases**: Test empty queue, single job, and large batch scenarios

### Success Criteria

- All 10+ jobs successfully queued without errors
- Queue length decreases monotonically (N → N-1 → N-2 → ... → 0)
- Jobs process in submission order
- Final queue length = 0
- All images reach `done` status (status=3)
- Test completes in ~10-15 seconds (1s/job × 10 jobs + overhead)

---

## Implementation Approach

### Strategy: Hybrid API + UI Testing

**Rationale**: Direct API calls for queue verification, UI for job triggering and status monitoring

**Why not pure UI?**
- Queue state is internal (not visible in UI)
- Need programmatic access to `/check_queue` endpoint
- More reliable than inferring queue state from UI changes

**Why not pure API?**
- Want to test real user workflow (triggering jobs via UI)
- Validates integration between Rails and Python services
- Tests ActionCable real-time updates

---

## Detailed Test Specification

### Test 1: Queue Management with 10 Concurrent Jobs

**File**: `playwright/tests/job-queue-management.spec.ts`

#### Setup Phase (2-3 seconds)

1. **Reset test database**
   ```typescript
   await resetTestDatabase();
   ```

2. **Create 10 test images without descriptions**
   - Use Rails fixtures or API to create `ImageCore` records
   - Set `description = null` and `status = 0` (not_started)
   - Associate with test `ImagePath` (e.g., `example_memes_1`)
   - Store image IDs for later verification

   **Implementation Options**:
   
   **Option A: Database Seeding** (Recommended)
   ```typescript
   // Modify test/fixtures/image_cores.yml to include 10 images without descriptions
   // resetTestDatabase() will load these automatically
   ```

   **Option B: Programmatic Creation**
   ```typescript
   // Create helper in utils/api-helpers.ts
   async function createImageCoreViaAPI(data: {
     name: string,
     image_path_id: number,
     description?: string
   }): Promise<number> {
     // POST to /image_cores endpoint
     // Return created ID
   }
   ```

#### Execution Phase (10-12 seconds)

3. **Trigger all 10 jobs rapidly**
   
   **Approach**: Click "Generate description" button for each image via UI
   
   ```typescript
   const imageIds: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
   
   // Navigate to root page
   await imageCoresPage.gotoRoot();
   
   // Trigger all jobs in quick succession
   for (const id of imageIds) {
     await page.goto(`/image_cores/${id}`);
     await imageCoresPage.clickGenerateDescription();
     // Don't wait for processing, just queue the job
   }
   ```

4. **Verify initial queue state**
   
   ```typescript
   // Call Python API directly using fetch/axios
   const queueResponse = await fetch('http://localhost:8000/check_queue');
   const queueData = await queueResponse.json();
   
   expect(queueData.queue_length).toBe(10);
   console.log('✅ All 10 jobs queued');
   ```

5. **Monitor queue as jobs process**
   
   ```typescript
   // Poll queue length every 500ms
   const queueSizes: number[] = [];
   let currentSize = 10;
   
   while (currentSize > 0) {
     await page.waitForTimeout(500);
     
     const response = await fetch('http://localhost:8000/check_queue');
     const data = await response.json();
     currentSize = data.queue_length;
     
     queueSizes.push(currentSize);
     console.log(`Queue size: ${currentSize}`);
   }
   ```

6. **Verify monotonic decrease**
   
   ```typescript
   // Queue should decrease: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
   // Allow some missed polls, but ensure decreasing trend
   for (let i = 1; i < queueSizes.length; i++) {
     expect(queueSizes[i]).toBeLessThanOrEqual(queueSizes[i-1]);
   }
   ```

#### Verification Phase (2-3 seconds)

7. **Verify final queue state**
   
   ```typescript
   const finalResponse = await fetch('http://localhost:8000/check_queue');
   const finalData = await finalResponse.json();
   
   expect(finalData.queue_length).toBe(0);
   console.log('✅ Queue fully drained');
   ```

8. **Verify all images completed**
   
   ```typescript
   // Check database: all images should have status=3 (done) and descriptions
   for (const id of imageIds) {
     await page.goto(`/image_cores/${id}`);
     
     // Verify status badge shows "Done"
     const statusBadge = page.locator('[data-status="done"]');
     await expect(statusBadge).toBeVisible();
     
     // Verify description was generated (not empty)
     const description = await imageCoresPage.getDescriptionValue();
     expect(description.length).toBeGreaterThan(0);
   }
   ```

9. **Verify FIFO processing order** (Optional, Advanced)
   
   ```typescript
   // Track which jobs completed first by monitoring status changes
   // Implementation note: Would require capturing timestamps or
   // monitoring ActionCable broadcasts in real-time
   // Consider this a stretch goal for initial implementation
   ```

---

### Test 2: Edge Case - Empty Queue

**Purpose**: Verify `/check_queue` handles empty queue correctly

```typescript
test('check empty queue returns zero', async ({ page }) => {
  await resetTestDatabase();
  
  const response = await fetch('http://localhost:8000/check_queue');
  const data = await response.json();
  
  expect(data).toEqual({ queue_length: 0 });
});
```

---

### Test 3: Edge Case - Single Job

**Purpose**: Verify single job processes correctly without race conditions

```typescript
test('single job processes successfully', async ({ page }) => {
  await resetTestDatabase();
  const imageCoresPage = new ImageCoresPage(page);
  
  // Create one image without description
  const imageId = 1;
  
  // Queue job
  await page.goto(`/image_cores/${imageId}`);
  await imageCoresPage.clickGenerateDescription();
  
  // Verify queued
  let queueResponse = await fetch('http://localhost:8000/check_queue');
  let queueData = await queueResponse.json();
  expect(queueData.queue_length).toBe(1);
  
  // Wait for processing (max 3 seconds)
  await page.waitForTimeout(3000);
  
  // Verify queue empty
  queueResponse = await fetch('http://localhost:8000/check_queue');
  queueData = await queueResponse.json();
  expect(queueData.queue_length).toBe(0);
  
  // Verify image status
  await page.goto(`/image_cores/${imageId}`);
  const statusBadge = page.locator('[data-status="done"]');
  await expect(statusBadge).toBeVisible();
});
```

---

### Test 4: Large Batch (20 Jobs)

**Purpose**: Stress test queue with larger workload

```typescript
test('processes 20 jobs in order', async ({ page }) => {
  // Similar to Test 1 but with 20 images
  // Expected duration: ~20-25 seconds
  // Verify queue handles larger batches without issues
});
```

**Note**: Mark as slow test or skip in CI if runtime exceeds acceptable limits

---

## Implementation Details

### File Structure

```
playwright/
├── tests/
│   └── job-queue-management.spec.ts    # New test file
├── pages/
│   └── image-cores.page.ts             # Existing, reuse methods
├── utils/
│   ├── db-setup.ts                     # Existing
│   ├── api-helpers.ts                  # NEW: Python API helpers
│   └── test-helpers.ts                 # Existing
```

### New Helper: API Utilities

**File**: `playwright/utils/api-helpers.ts`

```typescript
import type { APIResponse } from '@playwright/test';

/**
 * Python FastAPI service base URL
 */
const PYTHON_API_URL = 'http://localhost:8000';

/**
 * Check the current queue length in the Python service
 * 
 * @returns Queue length (number of pending jobs)
 */
export async function checkQueueLength(): Promise<number> {
  const response = await fetch(`${PYTHON_API_URL}/check_queue`);
  
  if (!response.ok) {
    throw new Error(`Failed to check queue: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.queue_length;
}

/**
 * Poll queue until it reaches target size or timeout
 * 
 * @param targetSize - Expected queue size (usually 0 for fully processed)
 * @param timeoutMs - Maximum wait time (default: 30000ms)
 * @param pollIntervalMs - Polling frequency (default: 500ms)
 * @returns Array of observed queue sizes
 */
export async function waitForQueueSize(
  targetSize: number,
  timeoutMs: number = 30000,
  pollIntervalMs: number = 500
): Promise<number[]> {
  const startTime = Date.now();
  const queueSizes: number[] = [];
  
  while (Date.now() - startTime < timeoutMs) {
    const size = await checkQueueLength();
    queueSizes.push(size);
    
    console.log(`[Queue Poll] Size: ${size}, Target: ${targetSize}`);
    
    if (size === targetSize) {
      console.log(`✅ Queue reached target size: ${targetSize}`);
      return queueSizes;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  throw new Error(
    `Timeout: Queue did not reach size ${targetSize} within ${timeoutMs}ms. ` +
    `Last size: ${queueSizes[queueSizes.length - 1]}`
  );
}

/**
 * Add a job directly via Python API (bypasses Rails UI)
 * Useful for setup/testing
 * 
 * @param imageCoreId - ImageCore database ID
 * @param imagePath - Path to image file (relative to /app/public/memes/)
 * @param model - Model name (use 'test' for testing)
 */
export async function addJobToQueue(
  imageCoreId: number,
  imagePath: string,
  model: string = 'test'
): Promise<void> {
  const response = await fetch(`${PYTHON_API_URL}/add_job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_core_id: imageCoreId,
      image_path: imagePath,
      model: model,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add job: ${response.statusText}`);
  }
  
  console.log(`✅ Added job for ImageCore ${imageCoreId}`);
}

/**
 * Remove a job directly via Python API
 * 
 * @param imageCoreId - ImageCore database ID
 */
export async function removeJobFromQueue(imageCoreId: number): Promise<void> {
  const response = await fetch(`${PYTHON_API_URL}/remove_job/${imageCoreId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to remove job: ${response.statusText}`);
  }
  
  console.log(`✅ Removed job for ImageCore ${imageCoreId}`);
}

/**
 * Wait for Python service to be ready
 * Call this in global setup if needed
 */
export async function waitForPythonService(timeoutMs: number = 10000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/`);
      if (response.ok) {
        console.log('✅ Python service is ready');
        return;
      }
    } catch (error) {
      // Service not ready, keep trying
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Python service not ready after ${timeoutMs}ms`);
}
```

---

### Test Fixture Updates

**File**: `meme_search/meme_search_app/test/fixtures/image_cores.yml`

Add 10 images without descriptions for queue testing:

```yaml
# Existing fixtures...

# Queue test images (no descriptions)
queue_test_1:
  id: 101
  name: queue_test_1.jpg
  image_path: example_memes_1
  description: null
  status: 0  # not_started

queue_test_2:
  id: 102
  name: queue_test_2.jpg
  image_path: example_memes_1
  description: null
  status: 0

# ... (continue for queue_test_3 through queue_test_10)
```

**Alternative**: Dynamically create images via Rails API helper (more flexible but slower)

---

## Testing Strategy

### Prerequisites

1. **Rails test server running**:
   ```bash
   cd meme_search/meme_search_app
   mise exec -- bin/rails server -e test -p 3000
   ```

2. **Python service running in test mode**:
   ```bash
   cd meme_search/image_to_text_generator
   python app/app.py testing
   ```
   
   Note: The `testing` argument ensures:
   - Uses test SQLite database (`tests/db/job_queue.db`)
   - Uses `test` model (fast, mocked)
   - Connects to `localhost:3000` for webhooks

3. **PostgreSQL with pgvector** (Docker):
   ```bash
   docker compose up -d
   ```

### Running the Tests

```bash
# Run all queue management tests
npm run test:e2e -- job-queue-management.spec.ts

# Run with UI mode (recommended for development)
npm run test:e2e:ui -- job-queue-management.spec.ts

# Run specific test
npm run test:e2e -- --grep "10 concurrent jobs"
```

### Expected Output

```
Job Queue Management Tests

  ✓ check empty queue returns zero (1.2s)
  ✓ single job processes successfully (3.5s)
  ✓ processes 10 concurrent jobs in FIFO order (12.8s)
  ⊘ processes 20 jobs in order (skipped - slow test)

  3 passed (17.5s)
```

---

## Timing Analysis

### Test Duration Breakdown

**Test 1 (10 concurrent jobs)**: ~12-15 seconds
- Database reset: 2s
- Queue all jobs: 1s
- Processing (1s/job × 10): 10s
- Verification: 2s
- Buffer: 1s

**Test 2 (empty queue)**: ~1 second
- Database reset: 0.5s
- API call: 0.1s
- Assertions: 0.1s

**Test 3 (single job)**: ~3-4 seconds
- Database reset: 2s
- Queue + process: 1s
- Verification: 1s

**Test 4 (20 jobs)**: ~22-25 seconds (optional, mark as slow)

**Total suite runtime**: ~18-20 seconds (excluding slow tests)

---

## Assertions & Validations

### Queue State Assertions

```typescript
// Queue length is non-negative integer
expect(queueLength).toBeGreaterThanOrEqual(0);
expect(Number.isInteger(queueLength)).toBe(true);

// Queue decreases monotonically
for (let i = 1; i < queueSizes.length; i++) {
  expect(queueSizes[i]).toBeLessThanOrEqual(queueSizes[i-1]);
}

// Final queue is empty
expect(finalQueueLength).toBe(0);
```

### Image Status Assertions

```typescript
// Status transitions: not_started (0) → in_queue (1) → processing (2) → done (3)
const statusBadge = page.locator('[data-status="done"]');
await expect(statusBadge).toBeVisible({ timeout: 15000 });

// Description was generated
const description = await imageCoresPage.getDescriptionValue();
expect(description.length).toBeGreaterThan(0);
expect(description).not.toBe('');
```

### API Response Assertions

```typescript
// /check_queue returns correct structure
expect(response.ok).toBe(true);
expect(response.status).toBe(200);
expect(data).toHaveProperty('queue_length');
expect(typeof data.queue_length).toBe('number');
```

---

## Error Handling & Edge Cases

### Potential Issues

1. **Python service not running**
   - Symptom: Fetch fails with `ECONNREFUSED`
   - Solution: Check service is running, add `waitForPythonService()` to setup

2. **Jobs process too fast**
   - Symptom: Queue empties before first poll
   - Solution: Increase polling frequency (250ms instead of 500ms)

3. **Jobs process too slow**
   - Symptom: Test times out
   - Solution: Increase timeout, verify `test` model is being used

4. **Race conditions**
   - Symptom: Flaky test, intermittent failures
   - Solution: Add proper waits, use `waitForQueueSize()` helper

5. **Database state pollution**
   - Symptom: Tests pass individually but fail when run together
   - Solution: Ensure `resetTestDatabase()` runs before each test

### Timeout Configuration

```typescript
test('processes 10 concurrent jobs', async ({ page }) => {
  // Override default timeout for slow test
  test.setTimeout(30000); // 30 seconds
  
  // ... test implementation
});
```

---

## FIFO Order Verification (Advanced)

### Approach 1: Timestamp Tracking

**Limitation**: Python worker doesn't expose job start/end times via API

**Workaround**: Monitor Rails database or ActionCable broadcasts

```typescript
// Track completion order via database
const completionOrder: number[] = [];

const interval = setInterval(async () => {
  const response = await fetch('http://localhost:3000/image_cores.json');
  const images = await response.json();
  
  images.forEach((img: any) => {
    if (img.status === 3 && !completionOrder.includes(img.id)) {
      completionOrder.push(img.id);
    }
  });
}, 500);

// Wait for all to complete
await waitForQueueSize(0);
clearInterval(interval);

// Verify completion order matches submission order
expect(completionOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
```

### Approach 2: Python Logging Analysis

**Limitation**: Requires parsing Python service logs

**Workaround**: Add `/job_history` endpoint to Python service (future enhancement)

```python
# Future enhancement to app.py
@app.get("/job_history")
def job_history():
    # Return list of processed jobs with timestamps
    return {"jobs": processed_jobs_log}
```

---

## Debugging & Troubleshooting

### Verbose Logging

```typescript
// Enable detailed queue monitoring
async function logQueueState() {
  const size = await checkQueueLength();
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Queue size: ${size}`);
  return size;
}

// Use in test
const queueSizes = [];
while (await logQueueState() > 0) {
  await page.waitForTimeout(500);
}
```

### Python Service Logs

```bash
# View Python service logs in real-time
cd meme_search/image_to_text_generator
python app/app.py testing 2>&1 | tee test.log
```

### Rails Logs

```bash
# View Rails test logs
tail -f meme_search/meme_search_app/log/test.log
```

### Playwright Trace

```bash
# Run with trace recording
npm run test:e2e -- --trace on

# View trace
npx playwright show-trace test-results/.../trace.zip
```

---

## Future Enhancements

### Phase 1 (Current Plan)
- ✅ Basic queue length verification
- ✅ Monotonic decrease validation
- ✅ Empty queue edge case
- ✅ Single job edge case

### Phase 2 (Future)
- ⬜ FIFO order verification with timestamps
- ⬜ Python API `/job_history` endpoint
- ⬜ Parallel job addition stress test
- ⬜ Queue persistence across service restarts

### Phase 3 (Advanced)
- ⬜ WebSocket monitoring (ActionCable real-time events)
- ⬜ Job cancellation during processing
- ⬜ Failed job retry logic
- ⬜ Queue priority levels

---

## Success Metrics

### Test Coverage
- ✅ Concurrent job addition (10+ jobs)
- ✅ Queue length accuracy
- ✅ Queue draining to zero
- ✅ Status transitions (not_started → in_queue → processing → done)
- ✅ Empty queue handling
- ✅ Single job handling
- ⬜ FIFO processing order (stretch goal)

### Performance
- ✅ Test completes in <20 seconds
- ✅ No timeouts or race conditions
- ✅ Reliable on CI/CD (GitHub Actions)

### Maintainability
- ✅ Clear test structure (AAA pattern: Arrange, Act, Assert)
- ✅ Reusable helpers (`api-helpers.ts`)
- ✅ Well-documented with JSDoc comments
- ✅ Follows existing Playwright conventions

---

## Integration with CI/CD

### GitHub Actions Workflow

**File**: `.github/workflows/pro-app-test.yml`

Add Python service startup:

```yaml
playwright-tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      # ... existing config
  
  steps:
    # ... existing steps
    
    - name: Start Python service in test mode
      run: |
        cd meme_search/image_to_text_generator
        python app/app.py testing &
        sleep 5  # Wait for service to start
      
    - name: Wait for Python service
      run: |
        timeout 30 bash -c 'until curl -f http://localhost:8000/; do sleep 1; done'
    
    - name: Run Playwright tests
      run: npm run test:e2e
```

---

## Rollout Plan

### Step 1: Setup (Day 1)
1. Create `playwright/utils/api-helpers.ts`
2. Add test fixtures or API helpers for image creation
3. Verify Python service runs in test mode locally

### Step 2: Implementation (Day 1-2)
1. Implement Test 1 (10 concurrent jobs)
2. Implement Test 2 (empty queue)
3. Implement Test 3 (single job)
4. Run locally and iterate

### Step 3: Validation (Day 2)
1. Run tests 10 times locally (check for flakiness)
2. Verify timing is consistent (~12-15s)
3. Test on clean environment

### Step 4: CI Integration (Day 2-3)
1. Update GitHub Actions workflow
2. Test on CI
3. Fix any CI-specific issues (timeouts, environment differences)

### Step 5: Documentation (Day 3)
1. Update `playwright/README.md` with queue testing examples
2. Add JSDoc comments to all helpers
3. Create troubleshooting guide

---

## Conclusion

This E2E test will provide comprehensive validation of the Python job queue's ability to handle concurrent image processing requests. By combining direct API access for queue state verification with UI-based job triggering, we achieve both reliability and real-world scenario coverage.

The test is designed to:
- Run quickly (~12-15 seconds for main test)
- Be maintainable and readable
- Catch regressions in queue management logic
- Validate the critical Rails ↔ Python integration

Upon completion, this test will join the existing 16 Playwright tests and strengthen confidence in the microservices architecture's reliability.

---

**Next Steps**: Review this plan, gather feedback, and proceed with implementation following the rollout schedule above.
