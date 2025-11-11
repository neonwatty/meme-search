# E2E Test Plan: Real-Time WebSocket Updates During Batch Processing

**Status**: Planning Phase  
**Created**: 2025-11-10  
**Test Type**: End-to-End (Playwright)  
**Estimated Duration**: 15-20 seconds per test run

---

## Overview

This document provides a detailed implementation plan for an E2E test that validates ActionCable WebSocket broadcasts during batch image processing. The test will verify that real-time UI updates work correctly as the Python service processes multiple images sequentially.

### Test Objectives

1. Verify ActionCable channels broadcast status updates to all connected clients
2. Confirm UI updates reflect status transitions (not_started → in_queue → processing → done)
3. Validate descriptions appear in real-time as they're generated
4. Ensure batch operations broadcast updates for each image independently
5. Test WebSocket reliability under sequential processing loads

---

## Architecture Context

### ActionCable Channels

**ImageStatusChannel** (`app/channels/image_status_channel.rb`):
- Stream name: `"image_status_channel"`
- Broadcasts: `{ div_id: "status-image-core-id-#{id}", status_html: rendered_partial }`
- Triggered by: Python service calling `/status_receiver` webhook

**ImageDescriptionChannel** (`app/channels/image_description_channel.rb`):
- Stream name: `"image_description_channel"`
- Broadcasts: `{ div_id: "description-image-core-id-#{id}", description: text }`
- Triggered by: Python service calling `/description_receiver` webhook

### Client-Side JavaScript

**Status Channel** (`app/javascript/channels/image_status_channel.js`):
```javascript
received(data) {
  const statusDiv = document.getElementById(data.div_id);
  if (statusDiv) {
    statusDiv.innerHTML = data.status_html;
  }
}
```

**Description Channel** (`app/javascript/channels/image_description_channel.js`):
```javascript
received(data) {
  const statusDiv = document.getElementById(data.div_id);
  if (statusDiv) {
    statusDiv.innerHTML = data.description;
  }
}
```

### Status Enum Values

- `0` = `not_started` (blue "generate description" button visible)
- `1` = `in_queue` (amber badge, "cancel" button visible)
- `2` = `processing` (emerald badge visible)
- `3` = `done` (blue "generate description" button returns)
- `4` = `removing` (red badge)
- `5` = `failed` (red badge)

### Test Model Behavior

**TestImageToText** (`image_to_text_generator/app/model_init.py`):
- Fixed **1-second delay** per image (`time.sleep(1)`)
- Returns: `f"Test description for {filename}"`
- No GPU/model loading required
- Deterministic output for assertions

### UI Elements to Monitor

**Status Container**:
- ID pattern: `div#status-image-core-id-{image_core_id}`
- Contains form buttons and status badges
- Updates via `statusDiv.innerHTML = data.status_html`

**Description Textarea**:
- ID pattern: `textarea#description-image-core-id-{image_core_id}`
- Disabled/read-only
- Updates via `statusDiv.innerHTML = data.description`

**Status Badges/Buttons**:
- Not started: `form > input[value="generate description 🪄"]` (blue, clickable)
- In queue: `div.bg-amber-500` containing text "in_queue"
- Processing: `div.bg-emerald-500` containing text "processing"
- Done: Returns to "generate description 🪄" button

---

## Test Implementation Plan

### Test File Structure

**Location**: `playwright/tests/realtime-websocket.spec.ts`

**Page Object**: `playwright/pages/realtime-batch.page.ts` (new)

**Dependencies**:
- `@playwright/test` (test runner, expect)
- `playwright/utils/db-setup.ts` (resetTestDatabase)
- `playwright/utils/test-helpers.ts` (waitForTurboStream, getVisibleCount)

### Test Suite Structure

```typescript
import { test, expect } from '@playwright/test';
import { RealtimeBatchPage } from '../pages/realtime-batch.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Real-Time WebSocket E2E Tests
 *
 * Validates ActionCable broadcasts during batch image processing.
 * Uses test model with 1-second delay to observe status transitions.
 */
test.describe('Real-Time WebSocket Updates', () => {
  let batchPage: RealtimeBatchPage;

  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    batchPage = new RealtimeBatchPage(page);
    await batchPage.goto();
  });

  test('should broadcast status updates during batch processing', async ({ page }) => {
    // Test implementation (see detailed flow below)
  });

  test('should broadcast descriptions as they are generated', async ({ page }) => {
    // Test implementation (see detailed flow below)
  });

  test('should handle multiple images in sequence', async ({ page }) => {
    // Test implementation (see detailed flow below)
  });
});
```

---

## Page Object Design

### File: `playwright/pages/realtime-batch.page.ts`

```typescript
import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Real-Time Batch Processing Tests
 *
 * Provides methods to monitor WebSocket updates during image processing.
 */
export class RealtimeBatchPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to root page with images
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get status badge/button for specific image
   * @param imageId - ImageCore ID
   */
  getStatusContainer(imageId: number): Locator {
    return this.page.locator(`#status-image-core-id-${imageId}`);
  }

  /**
   * Get description textarea for specific image
   * @param imageId - ImageCore ID
   */
  getDescriptionTextarea(imageId: number): Locator {
    return this.page.locator(`#description-image-core-id-${imageId}`);
  }

  /**
   * Click "generate description" button for specific image
   * @param imageId - ImageCore ID
   */
  async triggerGeneration(imageId: number): Promise<void> {
    const statusContainer = this.getStatusContainer(imageId);
    const button = statusContainer.locator('input[value="generate description 🪄"]');
    await button.click();
    await this.page.waitForTimeout(100); // Initial request
  }

  /**
   * Wait for status to change to specific value
   * @param imageId - ImageCore ID
   * @param statusText - Expected status text ("in_queue", "processing", etc.)
   * @param timeout - Max wait time (default: 5000ms)
   */
  async waitForStatus(
    imageId: number,
    statusText: string,
    timeout: number = 5000
  ): Promise<void> {
    const statusContainer = this.getStatusContainer(imageId);
    const statusBadge = statusContainer.locator(`text="${statusText}"`);
    await statusBadge.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for "generate description" button to return (done status)
   * @param imageId - ImageCore ID
   * @param timeout - Max wait time (default: 5000ms)
   */
  async waitForDoneStatus(imageId: number, timeout: number = 5000): Promise<void> {
    const statusContainer = this.getStatusContainer(imageId);
    const button = statusContainer.locator('input[value="generate description 🪄"]');
    await button.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get current status text
   * @param imageId - ImageCore ID
   * @returns Status text or null if not found
   */
  async getStatusText(imageId: number): Promise<string | null> {
    const statusContainer = this.getStatusContainer(imageId);
    const text = await statusContainer.textContent();
    return text?.trim() || null;
  }

  /**
   * Get description text
   * @param imageId - ImageCore ID
   * @returns Description text
   */
  async getDescriptionText(imageId: number): Promise<string> {
    const textarea = this.getDescriptionTextarea(imageId);
    const text = await textarea.inputValue();
    return text.trim();
  }

  /**
   * Get all visible image IDs on the page
   * @returns Array of ImageCore IDs
   */
  async getVisibleImageIds(): Promise<number[]> {
    const cards = this.page.locator('div[id^="image_core_card_"]:visible');
    const count = await cards.count();
    const ids: number[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const id = await card.getAttribute('id');
      if (id) {
        const match = id.match(/image_core_card_(\d+)/);
        if (match) {
          ids.push(parseInt(match[1], 10));
        }
      }
    }

    return ids;
  }

  /**
   * Check if status is "not_started" (button visible)
   * @param imageId - ImageCore ID
   */
  async isNotStarted(imageId: number): Promise<boolean> {
    const statusContainer = this.getStatusContainer(imageId);
    const button = statusContainer.locator('input[value="generate description 🪄"]');
    const count = await button.count();
    return count > 0 && await button.isVisible();
  }

  /**
   * Check if status is "in_queue"
   * @param imageId - ImageCore ID
   */
  async isInQueue(imageId: number): Promise<boolean> {
    const statusContainer = this.getStatusContainer(imageId);
    const badge = statusContainer.locator('div.bg-amber-500', { hasText: 'in_queue' });
    return await badge.isVisible().catch(() => false);
  }

  /**
   * Check if status is "processing"
   * @param imageId - ImageCore ID
   */
  async isProcessing(imageId: number): Promise<boolean> {
    const statusContainer = this.getStatusContainer(imageId);
    const badge = statusContainer.locator('div.bg-emerald-500', { hasText: 'processing' });
    return await badge.isVisible().catch(() => false);
  }

  /**
   * Check if status is "done" (button returned)
   * @param imageId - ImageCore ID
   */
  async isDone(imageId: number): Promise<boolean> {
    return await this.isNotStarted(imageId); // Same UI as not_started
  }

  /**
   * Monitor status changes with polling
   * Returns when expected status is reached or timeout occurs
   * @param imageId - ImageCore ID
   * @param checkFn - Function that returns true when desired state is reached
   * @param pollInterval - Polling interval in ms (default: 100ms)
   * @param timeout - Max wait time in ms (default: 5000ms)
   */
  async pollForCondition(
    imageId: number,
    checkFn: (page: RealtimeBatchPage) => Promise<boolean>,
    pollInterval: number = 100,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await checkFn(this)) {
        return;
      }
      await this.page.waitForTimeout(pollInterval);
    }
    throw new Error(`Condition not met within ${timeout}ms for image ${imageId}`);
  }
}
```

---

## Test Implementation Details

### Test 1: Status Transitions (Single Image)

**Goal**: Verify complete status lifecycle for one image

**Test Flow**:

```typescript
test('should broadcast status updates during single image processing', async ({ page }) => {
  // 1. Setup: Get first visible image ID
  const imageIds = await batchPage.getVisibleImageIds();
  expect(imageIds.length).toBeGreaterThan(0);
  const imageId = imageIds[0];

  // 2. Verify initial state: not_started
  expect(await batchPage.isNotStarted(imageId)).toBe(true);
  const initialDescription = await batchPage.getDescriptionText(imageId);
  console.log(`Image ${imageId} initial description: "${initialDescription}"`);

  // 3. Trigger generation
  await batchPage.triggerGeneration(imageId);
  console.log(`Triggered generation for image ${imageId}`);

  // 4. Verify transition to "in_queue" (via WebSocket)
  // Allow 2 seconds for Rails → Python → WebSocket round trip
  await batchPage.pollForCondition(
    imageId,
    async (page) => await page.isInQueue(imageId),
    100,
    2000
  );
  console.log(`Image ${imageId} entered queue`);
  expect(await batchPage.isInQueue(imageId)).toBe(true);

  // 5. Verify transition to "processing" (via WebSocket)
  // Test model has 1-second delay, allow 2 seconds buffer
  await batchPage.pollForCondition(
    imageId,
    async (page) => await page.isProcessing(imageId),
    100,
    3000
  );
  console.log(`Image ${imageId} is processing`);
  expect(await batchPage.isProcessing(imageId)).toBe(true);

  // 6. Verify transition to "done" (via WebSocket)
  // Processing takes 1 second, allow 2 seconds for completion + WebSocket
  await batchPage.pollForCondition(
    imageId,
    async (page) => await page.isDone(imageId),
    100,
    3000
  );
  console.log(`Image ${imageId} completed processing`);
  expect(await batchPage.isDone(imageId)).toBe(true);

  // 7. Verify description was updated (via WebSocket)
  const finalDescription = await batchPage.getDescriptionText(imageId);
  console.log(`Image ${imageId} final description: "${finalDescription}"`);
  expect(finalDescription).not.toBe(initialDescription);
  expect(finalDescription).toContain('Test description for'); // TestImageToText format

  // Total expected duration: ~3-5 seconds
});
```

**Timing Analysis**:
- Trigger → In Queue: ~200-500ms (Rails → Python → WebSocket)
- In Queue → Processing: ~100-300ms (Python picks up job)
- Processing → Done: ~1000-1200ms (1s model delay + WebSocket)
- **Total**: ~3-5 seconds per image

**Assertions**:
- ✅ Initial state is `not_started`
- ✅ Status changes to `in_queue` within 2s
- ✅ Status changes to `processing` within 3s
- ✅ Status changes to `done` within 3s (from processing)
- ✅ Description is non-empty and contains expected format
- ✅ Description differs from initial value

---

### Test 2: Description Updates (WebSocket Content)

**Goal**: Verify description broadcasts contain correct data

**Test Flow**:

```typescript
test('should broadcast descriptions with correct content', async ({ page }) => {
  // 1. Get first image without description
  const imageIds = await batchPage.getVisibleImageIds();
  const imageId = imageIds[0];

  // 2. Record initial description
  const initialDescription = await batchPage.getDescriptionText(imageId);

  // 3. Trigger generation
  await batchPage.triggerGeneration(imageId);

  // 4. Wait for "done" status (implies description was broadcast)
  await batchPage.pollForCondition(
    imageId,
    async (page) => await page.isDone(imageId),
    100,
    8000 // Allow full processing cycle
  );

  // 5. Verify description was updated
  const finalDescription = await batchPage.getDescriptionText(imageId);
  expect(finalDescription).not.toBe(initialDescription);

  // 6. Verify description matches TestImageToText format
  // TestImageToText returns: "Test description for {filename}"
  expect(finalDescription).toMatch(/^Test description for \w+$/);
  console.log(`Verified description format: "${finalDescription}"`);

  // 7. Verify textarea was updated in DOM (not just JavaScript variable)
  const textareaValue = await batchPage.getDescriptionTextarea(imageId).inputValue();
  expect(textareaValue).toBe(finalDescription);
});
```

**Assertions**:
- ✅ Description changes from initial value
- ✅ Description matches TestImageToText format
- ✅ Description persists in DOM (textarea value)
- ✅ WebSocket update modified actual DOM element

---

### Test 3: Batch Processing (Multiple Images)

**Goal**: Verify broadcasts work for multiple images processed sequentially

**Test Flow**:

```typescript
test('should handle multiple images in batch sequence', async ({ page }) => {
  // 1. Get first 3 images (or however many are visible)
  const imageIds = await batchPage.getVisibleImageIds();
  const testImageIds = imageIds.slice(0, Math.min(3, imageIds.length));
  expect(testImageIds.length).toBeGreaterThan(1); // Need at least 2 for batch test

  console.log(`Testing batch processing with ${testImageIds.length} images: ${testImageIds}`);

  // 2. Trigger all images for generation
  for (const imageId of testImageIds) {
    expect(await batchPage.isNotStarted(imageId)).toBe(true);
    await batchPage.triggerGeneration(imageId);
    await page.waitForTimeout(200); // Space out requests
  }

  console.log(`Triggered generation for all ${testImageIds.length} images`);

  // 3. Verify first image reaches "in_queue" first
  await batchPage.pollForCondition(
    testImageIds[0],
    async (page) => await page.isInQueue(testImageIds[0]),
    100,
    2000
  );
  console.log(`Image ${testImageIds[0]} entered queue first`);

  // 4. Wait for all images to complete
  // Each image takes ~3-5 seconds, sequential processing
  const totalTimeout = testImageIds.length * 6000; // 6s per image buffer

  for (const imageId of testImageIds) {
    console.log(`Waiting for image ${imageId} to complete...`);
    await batchPage.pollForCondition(
      imageId,
      async (page) => await page.isDone(imageId),
      200,
      totalTimeout
    );

    // Verify description was set
    const description = await batchPage.getDescriptionText(imageId);
    expect(description).toContain('Test description for');
    console.log(`Image ${imageId} completed with description: "${description}"`);
  }

  // 5. Verify all images completed successfully
  for (const imageId of testImageIds) {
    expect(await batchPage.isDone(imageId)).toBe(true);

    const description = await batchPage.getDescriptionText(imageId);
    expect(description).not.toBe('');
    expect(description).toMatch(/^Test description for \w+$/);
  }

  console.log(`All ${testImageIds.length} images completed successfully`);

  // Total duration: ~15-20 seconds for 3 images
});
```

**Timing Analysis** (3 images):
- Image 1: 0s → 3-5s
- Image 2: 3-5s → 6-10s
- Image 3: 6-10s → 9-15s
- **Total**: ~15-20 seconds

**Assertions**:
- ✅ All images start in `not_started` state
- ✅ First image enters queue first
- ✅ Each image completes full status cycle
- ✅ Each image receives correct description
- ✅ All descriptions match TestImageToText format
- ✅ No race conditions between broadcasts

---

## Playwright WebSocket Monitoring

### Observing WebSocket Messages

Playwright provides APIs to monitor WebSocket traffic:

```typescript
// Option 1: Listen to WebSocket frames
page.on('websocket', ws => {
  console.log(`WebSocket opened: ${ws.url()}`);
  ws.on('framesent', frame => console.log('→ SENT:', frame.payload));
  ws.on('framereceived', frame => console.log('← RECEIVED:', frame.payload));
  ws.on('close', () => console.log('WebSocket closed'));
});

// Option 2: Monitor network for WebSocket upgrade
page.on('request', request => {
  if (request.url().includes('cable')) {
    console.log('ActionCable request:', request.method(), request.url());
  }
});

page.on('response', response => {
  if (response.url().includes('cable')) {
    console.log('ActionCable response:', response.status());
  }
});
```

**Usage in Tests**:

```typescript
test('should monitor WebSocket messages during processing', async ({ page }) => {
  // Setup WebSocket listener
  const wsMessages: any[] = [];
  page.on('websocket', ws => {
    if (ws.url().includes('cable')) {
      console.log('ActionCable WebSocket connected');
      ws.on('framereceived', frame => {
        try {
          const data = JSON.parse(frame.payload);
          console.log('WebSocket message:', data);
          wsMessages.push(data);
        } catch (e) {
          // Not JSON, ignore
        }
      });
    }
  });

  // Navigate to page (establishes WebSocket)
  await batchPage.goto();

  // Trigger processing
  const imageIds = await batchPage.getVisibleImageIds();
  const imageId = imageIds[0];
  await batchPage.triggerGeneration(imageId);

  // Wait for completion
  await batchPage.waitForDoneStatus(imageId, 8000);

  // Verify WebSocket messages were received
  console.log(`Received ${wsMessages.length} WebSocket messages`);
  expect(wsMessages.length).toBeGreaterThan(0);

  // Optionally assert on message structure
  const statusMessages = wsMessages.filter(m => m.div_id?.includes('status-image-core-id'));
  expect(statusMessages.length).toBeGreaterThan(0);
  console.log('Status messages:', statusMessages);
});
```

---

## Timing Considerations

### Expected Durations

| Operation | Duration | Reason |
|-----------|----------|--------|
| Trigger → In Queue | 200-500ms | Rails POST → Python `/add_job` → Webhook → ActionCable |
| In Queue → Processing | 100-300ms | Python background worker picks up job |
| Processing → Done | 1000-1200ms | TestImageToText 1s delay + webhook + ActionCable |
| **Total per image** | **3-5 seconds** | End-to-end cycle |
| **Batch of 3 images** | **15-20 seconds** | Sequential processing |

### Wait Strategies

**Polling Strategy** (Recommended):
```typescript
// Poll every 100ms, timeout after 5s
await batchPage.pollForCondition(
  imageId,
  async (page) => await page.isProcessing(imageId),
  100,  // poll interval
  5000  // timeout
);
```

**Advantages**:
- Detects state changes immediately (100ms granularity)
- Fails fast with clear timeout error
- Works regardless of WebSocket timing variations

**Locator Wait Strategy** (Alternative):
```typescript
// Playwright waits for element to become visible
await batchPage.waitForStatus(imageId, 'processing', 5000);
```

**Avoid Fixed Waits**:
```typescript
// ❌ Bad - arbitrary wait
await page.waitForTimeout(3000);

// ✅ Good - poll for condition
await batchPage.pollForCondition(...);
```

### Buffer Times

- **In Queue**: 2s timeout (should be <500ms, buffer for slow CI)
- **Processing**: 3s timeout (should be <300ms, buffer for queue depth)
- **Done**: 3s timeout from processing (1s model + 2s buffer)
- **Total**: 8s timeout for full cycle (3-5s expected + 3-5s buffer)

---

## Race Condition Handling

### Potential Race Conditions

1. **Status Update Ordering**:
   - Python may send status webhooks out of order
   - ActionCable broadcasts are async
   - UI updates may not reflect exact processing state

2. **Description Before Status**:
   - Description webhook may arrive before "done" status
   - Textarea may update before button reappears

3. **Multiple Images**:
   - Broadcasts for different images may interleave
   - DOM updates must target correct `div_id`

### Mitigation Strategies

**1. Polling vs. Event Listening**:
```typescript
// ✅ Poll for actual DOM state (handles out-of-order updates)
await batchPage.pollForCondition(
  imageId,
  async (page) => await page.isDone(imageId)
);

// ❌ Don't rely on specific WebSocket message order
// (messages may arrive in any order)
```

**2. Verify Final State, Not Transitions**:
```typescript
// ✅ Good - verify final state reached
expect(await batchPage.isDone(imageId)).toBe(true);
expect(await batchPage.getDescriptionText(imageId)).not.toBe('');

// ⚠️ Risky - strict transition order may fail due to timing
// (Still valuable to test, but use generous timeouts)
await batchPage.waitForStatus(imageId, 'in_queue');
await batchPage.waitForStatus(imageId, 'processing');
await batchPage.waitForStatus(imageId, 'done');
```

**3. Use Unique Image IDs**:
```typescript
// ✅ Each image has unique DOM IDs
const imageIds = await batchPage.getVisibleImageIds();
for (const imageId of imageIds) {
  // No collision between different images
  await batchPage.waitForDoneStatus(imageId);
}
```

**4. Add Console Logging**:
```typescript
console.log(`Image ${imageId} current state: ${await batchPage.getStatusText(imageId)}`);
// Helps debug race conditions in CI logs
```

---

## Assertions Checklist

### Status Transition Assertions

- [ ] Initial state is `not_started` (button visible)
- [ ] Transitions to `in_queue` within 2s
- [ ] Transitions to `processing` within 3s
- [ ] Transitions to `done` within 3s (from processing)
- [ ] Final state shows "generate description" button again

### Description Assertions

- [ ] Initial description is empty or placeholder
- [ ] Description updates during/after processing
- [ ] Description matches expected format: `"Test description for {filename}"`
- [ ] Description persists in textarea DOM element
- [ ] Description is non-empty after completion

### Batch Processing Assertions

- [ ] All images start in `not_started`
- [ ] First triggered image enters queue first
- [ ] Each image completes independently
- [ ] Each image receives unique description
- [ ] No cross-contamination between image updates
- [ ] All images reach `done` status
- [ ] Batch completion time scales linearly (~3-5s per image)

### WebSocket Assertions

- [ ] WebSocket connection established on page load
- [ ] WebSocket messages received during processing
- [ ] Messages contain expected `div_id` format
- [ ] Messages contain status HTML or description text
- [ ] Multiple images receive separate broadcasts

---

## Test Data Setup

### Database Fixtures

**Requirement**: Test images without descriptions (status = 0)

**Approach**: Use existing `resetTestDatabase()` utility:

```typescript
test.beforeEach(async ({ page }) => {
  // Resets test DB with fixtures from db/seeds/test_seeds.rb
  await resetTestDatabase();

  // Fixture should include:
  // - ImageCore records with status = 0 (not_started)
  // - ImageCore records with description = "" or nil
  // - Associated ImagePath records
  // - Test model selected as current ImageToText
});
```

**Verify Fixture Data**:

```typescript
test('verify fixture data is correct', async ({ page }) => {
  await batchPage.goto();

  const imageIds = await batchPage.getVisibleImageIds();
  expect(imageIds.length).toBeGreaterThan(0);

  // Verify at least one image is in not_started state
  let hasNotStarted = false;
  for (const imageId of imageIds) {
    if (await batchPage.isNotStarted(imageId)) {
      hasNotStarted = true;
      break;
    }
  }
  expect(hasNotStarted).toBe(true);
});
```

---

## CI/CD Considerations

### GitHub Actions Integration

**Workflow**: `.github/workflows/pro-app-test.yml`

**Required Services**:
- PostgreSQL with pgvector (Docker)
- Rails test server (port 3000)
- Python image-to-text service (port 8000, test model)

**Test Model Configuration**:

Ensure CI uses test model to avoid GPU requirements:

```yaml
# In GitHub Actions workflow
- name: Set test model
  run: |
    cd meme_search/meme_search_app
    mise exec -- bin/rails runner "ImageToText.update_all(current: false); ImageToText.find_or_create_by(name: 'test').update(current: true)"

- name: Start Python service with test model
  run: |
    cd meme_search/image_to_text_generator
    export MODEL_NAME=test
    uvicorn app.app:app --host 0.0.0.0 --port 8000 &
```

### Timeout Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 30000, // 30s per test (batch test needs 20s)
  expect: {
    timeout: 10000, // 10s for assertions
  },
});

// In test file
test('batch processing', async ({ page }) => {
  // Override timeout for this specific test
  test.setTimeout(60000); // 60s for 3+ images
});
```

---

## Troubleshooting Guide

### Issue: WebSocket Not Connecting

**Symptoms**: No status updates, no description changes

**Debug Steps**:
```typescript
// Add listener to detect connection
page.on('websocket', ws => {
  console.log('WebSocket URL:', ws.url());
  console.log('WebSocket established:', ws.url().includes('cable'));
});

// Check console errors
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
```

**Solutions**:
- Verify Rails server running in test mode
- Check `cable.yml` configuration for test environment
- Ensure ActionCable is enabled in test env

### Issue: Status Stuck at "in_queue"

**Symptoms**: Never transitions to "processing"

**Debug Steps**:
```bash
# Check Python service logs
docker logs image_to_text_generator

# Verify job queue
curl http://localhost:8000/check_queue
```

**Solutions**:
- Verify Python service is running
- Check test model is selected
- Ensure background worker is started

### Issue: Flaky Test (Intermittent Failures)

**Symptoms**: Test passes sometimes, fails randomly

**Debug Steps**:
```typescript
// Add extensive logging
console.log('Before trigger:', await batchPage.getStatusText(imageId));
await batchPage.triggerGeneration(imageId);
console.log('After trigger:', await batchPage.getStatusText(imageId));

// Increase timeouts
await batchPage.pollForCondition(imageId, checkFn, 100, 10000); // 10s timeout
```

**Solutions**:
- Increase poll intervals (100ms → 200ms)
- Increase timeouts (5s → 8s)
- Add `waitForLoadState('networkidle')` after actions

### Issue: Wrong Description Appears

**Symptoms**: Description doesn't match expected format

**Debug Steps**:
```typescript
const description = await batchPage.getDescriptionText(imageId);
console.log('Description:', description);
console.log('Expected format:', /^Test description for \w+$/);
console.log('Matches:', description.match(/^Test description for \w+$/));
```

**Solutions**:
- Verify test model is active (not a real model)
- Check ImageToText.current is set to 'test'
- Ensure Python service is using test model

---

## Success Criteria

### Test Must Demonstrate

- ✅ **WebSocket Connection**: ActionCable establishes connection on page load
- ✅ **Status Broadcasts**: All status transitions broadcast to client
- ✅ **Description Broadcasts**: Description text broadcasts when generated
- ✅ **DOM Updates**: Broadcasts trigger actual DOM changes
- ✅ **Multiple Images**: Batch processing broadcasts updates for each image
- ✅ **Timing Accuracy**: Updates occur within expected timeframes
- ✅ **No Failures**: All assertions pass consistently (not flaky)

### Performance Benchmarks

- Single image: 3-5 seconds (trigger → done)
- Batch of 3: 15-20 seconds (sequential processing)
- WebSocket latency: <500ms (Python webhook → UI update)

### Code Quality

- Page Object Model pattern used correctly
- All locators use semantic selectors (ID, role, text)
- Polling strategy handles async timing
- Console logging aids debugging
- Assertions are clear and descriptive
- Test is independent (database reset)

---

## Future Enhancements

### Phase 2: Advanced Scenarios

1. **Concurrent Clients**: Multiple browser tabs receiving same broadcasts
2. **Error Handling**: Test "failed" status broadcasts
3. **Cancel Operation**: Test "removing" status via cancel button
4. **Network Interruption**: Disconnect/reconnect WebSocket during processing
5. **Large Batch**: 10+ images to test queue depth

### Phase 3: Performance Testing

1. **WebSocket Latency**: Measure time from webhook to DOM update
2. **Broadcast Throughput**: How many broadcasts/second can UI handle?
3. **Memory Leaks**: Long-running tests to detect listener leaks

### Phase 4: Visual Regression

1. **Screenshot Comparisons**: Capture status badge visual changes
2. **Animation Timing**: Verify Turbo Stream animations complete
3. **Mobile Responsive**: Test WebSocket updates on mobile viewport

---

## References

### Related Files

- **ActionCable Channels**:
  - `/Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app/app/channels/image_status_channel.rb`
  - `/Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app/app/channels/image_description_channel.rb`

- **Client-Side JavaScript**:
  - `/Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app/app/javascript/channels/image_status_channel.js`
  - `/Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app/app/javascript/channels/image_description_channel.js`

- **Rails Controller**:
  - `/Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app/app/controllers/image_cores_controller.rb`

- **Test Model**:
  - `/Users/neonwatty/Desktop/meme-search/meme_search/image_to_text_generator/app/model_init.py` (TestImageToText class)

- **Existing E2E Tests**:
  - `/Users/neonwatty/Desktop/meme-search/playwright/tests/image-cores.spec.ts`
  - `/Users/neonwatty/Desktop/meme-search/playwright/README.md`

### Documentation

- **Playwright**: https://playwright.dev/docs/intro
- **ActionCable**: https://guides.rubyonrails.org/action_cable_overview.html
- **Turbo Streams**: https://turbo.hotwired.dev/handbook/streams

---

**End of Implementation Plan**

**Next Steps**:
1. Review plan with team
2. Implement `RealtimeBatchPage` page object
3. Write first test (single image status transitions)
4. Verify test passes locally
5. Add remaining tests (description, batch)
6. Integrate into CI/CD pipeline
