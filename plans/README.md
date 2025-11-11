# E2E Test Implementation Plans

This directory contains detailed implementation plans for 5 new E2E tests that leverage the enhanced `TestImageToText` dummy model for comprehensive testing of batch image processing features.

## Overview

All plans utilize the enhanced test model which:
- Returns deterministic output: `"Test description for {filename}"`
- Has a fixed 1-second processing delay (realistic but fast)
- Requires no ML model downloads or GPU inference
- Enables predictable assertions in E2E tests

## Test Plans

### 1. [Bulk Description Generation](./bulk-description-generation-e2e.md) (37KB)
**Purpose**: Validate bulk description generation for multiple images without descriptions

**Key Features**:
- Filter to images without embeddings (`has_embeddings=false`)
- Queue 5-10 images simultaneously
- Monitor status transitions: `not_started` → `in_queue` → `processing` → `done`
- Verify deterministic descriptions match expected pattern
- Validate WebSocket real-time updates via ActionCable

**Test Duration**: ~60-90 seconds (for 10 images)

**Implementation Complexity**: Medium
- Requires Page Object Model: `BulkDescriptionGenerationPage`
- Uses existing filtering and status monitoring patterns
- Full test spec included with all assertions

---

### 2. [Path-Specific Batch Operations](./path-specific-batch-e2e.md) (23KB)
**Purpose**: Validate selective batch processing for images within a specific path

**Key Features**:
- Setup 3 ImagePaths with mixed description states
- Trigger batch generation for Path A only
- Verify **path isolation** - Paths B & C remain unchanged
- Test selective processing (skip images with existing descriptions)
- Validate embeddings created only for targeted images

**Test Duration**: ~20-30 seconds (for 5 images)

**Implementation Complexity**: High
- **Backend work required**: New `batch_generate` controller action
- Requires UI button for path-specific triggers
- Critical assertions for path isolation

**Implementation Prerequisites**:
1. Rails controller action: `ImagePathsController#batch_generate`
2. Route: `POST /settings/image_paths/:id/batch_generate`
3. UI button placement (index or show page)

---

### 3. [Real-Time WebSocket Updates](./realtime-websocket-e2e.md) (31KB)
**Purpose**: Validate ActionCable broadcasts during batch processing

**Key Features**:
- Monitor real-time status transitions with 1-second observable delays
- Verify WebSocket frame inspection (ActionCable message structure)
- Test description content delivery via `ImageDescriptionChannel`
- Validate status updates via `ImageStatusChannel`
- Test batch processing (3 images) with sequential monitoring

**Test Duration**:
- Single image: 3-5 seconds
- Batch of 3: 15-20 seconds

**Implementation Complexity**: Medium-High
- Requires WebSocket monitoring via Playwright
- Includes 3 complete test implementations
- Polling strategy for async updates (100ms intervals)

**Key Technical Details**:
- Status transitions: `not_started(0)` → `in_queue(1)` → `processing(2)` → `done(3)`
- DOM elements: `status-image-core-id-{id}`, `description-image-core-id-{id}`
- Turbo Stream waits: 500ms + networkidle

---

### 4. [Queue Management](./queue-management-e2e.md) (23KB)
**Purpose**: Validate Python job queue with multiple concurrent jobs

**Key Features**:
- **Hybrid approach**: Direct API calls + UI interactions
- Test 10 concurrent job additions
- Verify FIFO processing order
- Monitor queue size decrease (monotonic)
- Test edge cases: empty queue, single job, 20-job stress test

**Test Duration**:
- Main test (10 jobs): ~12-15 seconds
- Stress test (20 jobs): ~20-25 seconds

**Implementation Complexity**: Medium
- Requires new utility: `api-helpers.ts` with functions:
  - `checkQueueLength()` - Poll Python `/check_queue` endpoint
  - `waitForQueueSize()` - Wait for specific queue size
  - `addJobToQueue()` - Direct API call for testing
- Includes 4 test cases with full implementation

**Key Endpoints**:
- `GET http://localhost:8000/check_queue` - Python queue state
- `POST http://localhost:8000/add_job` - Add job to queue

---

### 5. [Failure Recovery](./failure-recovery-e2e.md) (27KB)
**Purpose**: Validate system behavior when some jobs fail

**Key Features**:
- Process batch with 2 successes + 2 failures
- Verify worker continues after exceptions
- Validate failed images show status=5 (failed) with red badge
- Ensure successful images still get descriptions
- Test system stability (no crashes)

**Test Duration**: ~10-12 seconds (for 4 images)

**Implementation Complexity**: High
- **Backend work required**:
  1. Python worker (`jobs.py`) must send status=5 on failure
  2. Test model enhancement to trigger failures on specific patterns
- Requires UI updates to display failure state

**Implementation Prerequisites**:

1. **Worker Enhancement** (Required):
```python
# jobs.py - Add status=5 on exception
except Exception as e:
    status_sender(image_core_id, rails_port, status=5)  # Send failed status
    remove_job(image_core_id)  # Clean up queue
```

2. **Test Model Enhancement** (Required):
```python
# model_init.py - Add failure patterns
class TestImageToText:
    def extract(self, image_path):
        filename = self.Path(image_path).stem

        # Trigger failures for specific patterns
        if "_fail" in filename:
            raise Exception(f"Simulated failure for {filename}")
        if "_invalid" in filename:
            raise FileNotFoundError(f"File not found: {filename}")

        # Success case
        self.time.sleep(1)
        return f"Test description for {filename}"
```

3. **UI Enhancement** (If not exists):
   - Display failed status badge (red)
   - Show error message/tooltip

---

## Implementation Priority

Based on complexity and dependencies:

### Phase 1: Foundation Tests (No Backend Changes)
1. **Bulk Description Generation** - Core functionality, most valuable
2. **Real-Time WebSocket Updates** - Validates critical ActionCable behavior
3. **Queue Management** - Tests Python service directly

### Phase 2: Backend-Dependent Tests
4. **Path-Specific Batch Operations** - Requires new controller action
5. **Failure Recovery** - Requires worker + model enhancements

---

## Common Patterns Across All Tests

### Test Setup
```typescript
beforeEach(async ({ page }) => {
  await resetTestDatabase();
  // Setup fixtures...
});
```

### Status Monitoring
```typescript
// Poll for status changes
async waitForStatus(imageId: number, expectedStatus: string): Promise<void> {
  await expect(this.page.locator(`#status-image-core-id-${imageId}`))
    .toContainText(expectedStatus, { timeout: 5000 });
}
```

### Turbo Stream Handling
```typescript
// Wait for Turbo Stream updates
await page.waitForTimeout(500);
await page.waitForLoadState('networkidle');
```

### Description Verification
```typescript
// Verify deterministic output
const description = await page.locator(`#description-image-core-id-${imageId}`).textContent();
expect(description).toBe(`Test description for ${filename}`);
```

---

## Running the Tests

### Prerequisites
```bash
# Rails test server on port 3000
cd meme_search/meme_search_app && bin/rails test:server

# PostgreSQL with pgvector (via Docker)
docker compose up db

# Install Playwright browsers
npx playwright install chromium
```

### Execute Individual Tests
```bash
# Bulk description generation
npm run test:e2e -- bulk-description-generation

# Path-specific batch
npm run test:e2e -- path-specific-batch

# Real-time WebSocket
npm run test:e2e -- realtime-websocket

# Queue management
npm run test:e2e -- queue-management

# Failure recovery
npm run test:e2e -- failure-recovery
```

### Execute All New Tests
```bash
npm run test:e2e -- bulk path realtime queue failure
```

---

## CI/CD Integration

All tests designed for GitHub Actions CI:

```yaml
# .github/workflows/pro-app-test.yml
- name: Run E2E Tests (Batch Operations)
  env:
    TEST_MODEL: test  # Use dummy model in CI
  run: |
    npm run test:e2e -- bulk path realtime queue failure
```

**Expected CI Duration**:
- All 5 tests sequentially: ~3-5 minutes
- Parallel execution: ~2 minutes

---

## Test Model Configuration

### Local Development (Observe Real-Time Updates)
```bash
# Use test model with 1-second delay
TEST_MODEL=test npm run test:e2e:ui
```

### CI (Fast Execution)
```bash
# Same model, no additional setup needed
TEST_MODEL=test npm run test:e2e
```

---

## Success Criteria

Each test plan includes:
- ✅ Complete Page Object Model implementation
- ✅ Full test spec with all assertions
- ✅ Error handling and edge cases
- ✅ Debugging guidance
- ✅ CI/CD integration instructions
- ✅ Expected test duration
- ✅ Success validation checklist

---

## Next Steps

1. **Review Plans**: Read through each plan to understand scope and dependencies
2. **Prioritize**: Start with Phase 1 tests (no backend changes required)
3. **Backend Work**: For Phase 2 tests, implement required controller actions and worker enhancements
4. **Implement Tests**: Follow Page Object Model patterns from plans
5. **Validate**: Run locally with UI mode first (`npm run test:e2e:ui`)
6. **CI Integration**: Add to GitHub Actions workflow

---

## Questions or Issues?

Each plan includes:
- **Troubleshooting** sections for common issues
- **Alternative Approaches** for complex scenarios
- **Code Examples** for all implementations

Refer to individual plan files for detailed guidance.
