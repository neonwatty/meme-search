# Bulk Description Generation E2E Test - Implementation Plan

**Status**: Planning  
**Created**: 2025-11-10  
**Test Type**: E2E Integration Test (Playwright)  
**Estimated Duration**: ~60-90 seconds (10 images × 1s processing + overhead)

---

## Overview

This E2E test validates the bulk description generation workflow for multiple images without descriptions. It tests the complete pipeline from UI filtering to Python service processing to WebSocket updates, ensuring the system can handle batch operations correctly.

---

## Test Scenario

**Goal**: Generate descriptions for multiple images (5-10) that don't currently have descriptions, and verify all receive correct AI-generated descriptions with proper status updates throughout the process.

**Key Features Being Tested**:
- Filtering images without descriptions (`has_embeddings=false`)
- Bulk triggering of description generation
- Queue management (status transitions: not_started → in_queue → processing → done)
- Real-time WebSocket updates via ActionCable
- Python test model deterministic output validation
- Turbo Stream DOM updates

---

## Prerequisites & Test Environment

### Services Required
- **Rails app**: Running on port 3000 in test mode
- **Python service**: Running on port 8000 with test model
- **PostgreSQL**: With pgvector extension enabled
- **Test Model**: Python "test" model (1-second delay, deterministic output)

### Test Model Behavior
```python
# From model_init.py:44-50
def extract(self, image_path):
    self.time.sleep(1)  # Fixed 1-second delay
    filename = self.Path(image_path).stem
    return f"Test description for {filename}"
```

**Key Properties**:
- **Deterministic**: Output is `"Test description for {filename}"` (e.g., "Test description for test_image")
- **Fixed Delay**: Always 1 second per image
- **No ML Inference**: No model download or GPU required

### Database State
- Start with fresh test database (via `resetTestDatabase()`)
- Seed includes images with `status: 0` (not_started) and no descriptions
- Embeddings checkbox filter: `has_embeddings=false` shows images without descriptions

---

## Implementation Strategy

### Phase 1: Setup & Preparation

#### 1.1 Create Page Object Model Class

**File**: `playwright/pages/bulk-description-generation.page.ts`

**Responsibilities**:
- Navigate to filtered view (images without descriptions)
- Trigger bulk description generation
- Monitor status updates for multiple images
- Verify final descriptions

**Key Locators**:
```typescript
// Filter controls (reuse IndexFilterPage patterns)
readonly filterButton: Locator;
readonly embeddingsCheckbox: Locator;
readonly applyFiltersButton: Locator;

// Meme cards
readonly memeCards: Locator;  // 'div[id^="image_core_card_"]:visible'

// Status indicators for each card
statusLocator(imageId: number): Locator {
  return page.locator(`#status-image-core-id-${imageId}`);
}

// Description areas
descriptionLocator(imageId: number): Locator {
  return page.locator(`#description-image-core-id-${imageId}`);
}

// Generate buttons
generateButton(imageId: number): Locator {
  return page.locator(`[action*="/image_cores/${imageId}/generate_description"] button`);
}
```

**Key Methods**:
```typescript
// Setup: Filter to images without descriptions
async filterToNoDescriptions(): Promise<void>

// Get list of image IDs that need descriptions
async getImageIdsWithoutDescriptions(): Promise<number[]>

// Trigger generation for a specific image
async triggerGenerationForImage(imageId: number): Promise<void>

// Trigger generation for multiple images in sequence
async triggerBulkGeneration(imageIds: number[]): Promise<void>

// Wait for status transition (with timeout)
async waitForStatus(imageId: number, status: string, timeout?: number): Promise<void>

// Get current status text
async getStatusText(imageId: number): Promise<string>

// Get description text (after generation completes)
async getDescriptionText(imageId: number): Promise<string>

// Wait for all images to reach "done" status
async waitForAllCompleted(imageIds: number[], timeout?: number): Promise<void>
```

#### 1.2 Create Test Spec File

**File**: `playwright/tests/bulk-description-generation.spec.ts`

**Structure**:
```typescript
import { test, expect } from '@playwright/test';
import { BulkDescriptionGenerationPage } from '../pages/bulk-description-generation.page';
import { resetTestDatabase } from '../utils/db-setup';

test.describe('Bulk Description Generation', () => {
  let bulkGenPage: BulkDescriptionGenerationPage;

  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    bulkGenPage = new BulkDescriptionGenerationPage(page);
    
    // Navigate and filter setup
    await bulkGenPage.goto();
    await bulkGenPage.filterToNoDescriptions();
  });

  test('generate descriptions for multiple images', async ({ page }) => {
    // Test implementation (see Phase 2)
  });
});
```

---

### Phase 2: Test Flow Implementation

#### Step 1: Filter to Images Without Descriptions

**Action**:
```typescript
// Navigate to root page
await bulkGenPage.goto();

// Open filter slideover
await bulkGenPage.openFilters();

// Uncheck embeddings to show images without descriptions
await bulkGenPage.uncheckEmbeddings();

// Apply filters
await bulkGenPage.applyFilters();

// Wait for Turbo Stream updates
await page.waitForTimeout(500);
await page.waitForLoadState('networkidle');
```

**Expected Result**:
- Filter slideover closes
- Page shows only images with `has_embeddings=false`
- Should see 5-10 image cards with "generate description" buttons

**Assertions**:
```typescript
const imageCount = await bulkGenPage.getMemeCount();
expect(imageCount).toBeGreaterThanOrEqual(5);
expect(imageCount).toBeLessThanOrEqual(10);

// Verify all have "not_started" status
for (const imageId of imageIds) {
  const status = await bulkGenPage.getStatusText(imageId);
  expect(status).toMatch(/generate description/i);
}
```

---

#### Step 2: Collect Image IDs

**Action**:
```typescript
const imageIds = await bulkGenPage.getImageIdsWithoutDescriptions();
console.log(`Found ${imageIds.length} images without descriptions: ${imageIds.join(', ')}`);
```

**Expected Result**:
- Array of 5-10 image IDs
- Each ID corresponds to an `ImageCore` record with `status: 0` and no description

**Implementation Note**:
```typescript
async getImageIdsWithoutDescriptions(): Promise<number[]> {
  const cards = this.page.locator('div[id^="image_core_card_"]:visible');
  const count = await cards.count();
  const ids: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const idAttr = await card.getAttribute('id');
    if (idAttr) {
      const match = idAttr.match(/image_core_card_(\d+)/);
      if (match) ids.push(parseInt(match[1], 10));
    }
  }
  
  return ids;
}
```

---

#### Step 3: Trigger Bulk Description Generation

**Action** (Sequential Triggering):
```typescript
// Trigger generation for all images in sequence
for (const imageId of imageIds) {
  await bulkGenPage.triggerGenerationForImage(imageId);
  
  // Small delay between triggers to avoid race conditions
  await page.waitForTimeout(100);
  
  console.log(`Triggered generation for image ${imageId}`);
}
```

**Expected Behavior**:
- Each click submits a form via `POST /image_cores/:id/generate_description`
- Rails controller updates status to `in_queue` (status: 1)
- Rails sends request to Python service: `POST http://image_to_text_generator:8000/add_job`
- Python service adds job to SQLite queue
- ActionCable broadcasts status update via `ImageStatusChannel`
- UI updates via Turbo Stream

**Assertions** (Immediate):
```typescript
// Wait for all to transition to "in_queue" status
for (const imageId of imageIds) {
  await bulkGenPage.waitForStatus(imageId, 'in_queue', 5000);
  
  const status = await bulkGenPage.getStatusText(imageId);
  expect(status).toBe('in_queue');
}

console.log('✅ All images queued successfully');
```

---

#### Step 4: Monitor Processing Status

**Action** (Passive Monitoring):
```typescript
// The Python background worker processes jobs automatically
// We just need to wait and observe status transitions:
// in_queue → processing → done

// Wait for first image to start processing
await bulkGenPage.waitForStatus(imageIds[0], 'processing', 10000);
console.log(`Image ${imageIds[0]} started processing`);
```

**Expected Behavior**:
- Python worker thread calls `process_job()` from `jobs.py`
- Status updates broadcast via ActionCable
- Each image takes ~1 second to process (test model)
- Status transitions: `in_queue` → `processing` → `done`

**WebSocket Flow**:
```
Python → POST /image_cores/status_receiver
  ↓
Rails → ActionCable.server.broadcast "image_status_channel"
  ↓
Browser → JavaScript consumer receives update
  ↓
Turbo Stream updates DOM with new status HTML
```

**Optional Monitoring** (for debugging):
```typescript
// Poll status every 500ms to observe transitions
const statusLog: Record<number, string[]> = {};

const pollInterval = setInterval(async () => {
  for (const imageId of imageIds) {
    const status = await bulkGenPage.getStatusText(imageId);
    if (!statusLog[imageId]) statusLog[imageId] = [];
    if (statusLog[imageId][statusLog[imageId].length - 1] !== status) {
      statusLog[imageId].push(status);
      console.log(`Image ${imageId}: ${status}`);
    }
  }
}, 500);

// Stop polling when done
await bulkGenPage.waitForAllCompleted(imageIds, 60000);
clearInterval(pollInterval);
```

---

#### Step 5: Wait for Completion

**Action**:
```typescript
// Wait for all images to reach "done" status
// Timeout: 60 seconds (10 images × 1s each + 50s buffer for queue/network delays)
await bulkGenPage.waitForAllCompleted(imageIds, 60000);

console.log('✅ All images processed successfully');
```

**Implementation**:
```typescript
async waitForAllCompleted(imageIds: number[], timeout = 60000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    let allDone = true;
    
    for (const imageId of imageIds) {
      const status = await this.getStatusText(imageId);
      if (status !== 'done' && !status.includes('generate description')) {
        allDone = false;
        break;
      }
    }
    
    if (allDone) {
      console.log(`All ${imageIds.length} images completed in ${Date.now() - startTime}ms`);
      return;
    }
    
    // Wait 500ms before next check
    await this.page.waitForTimeout(500);
  }
  
  throw new Error(`Timeout: Not all images completed within ${timeout}ms`);
}
```

**Expected Result**:
- All images have status "done" (visible as "generate description" button again)
- Each image took ~1 second to process
- Total time: ~10-15 seconds for 10 images (sequential processing)

---

#### Step 6: Verify Descriptions

**Action**:
```typescript
// Navigate to each image's show page and verify description
for (const imageId of imageIds) {
  await bulkGenPage.gotoImageShow(imageId);
  await page.waitForLoadState('networkidle');
  
  const description = await bulkGenPage.getDescriptionText(imageId);
  console.log(`Image ${imageId} description: "${description}"`);
  
  // Verify description matches test model output pattern
  expect(description).toMatch(/^Test description for \w+$/);
  
  // Navigate back to index
  await bulkGenPage.gotoRoot();
}

console.log('✅ All descriptions verified');
```

**Expected Description Format**:
```
Image ID 1, filename "meme1.jpg" → "Test description for meme1"
Image ID 2, filename "funny_cat.png" → "Test description for funny_cat"
Image ID 3, filename "test_image.jpg" → "Test description for test_image"
```

**Alternative: Verify from Index Page**:
```typescript
// If descriptions are visible on index page (in cards)
for (const imageId of imageIds) {
  const descriptionPreview = await bulkGenPage.getDescriptionPreviewFromCard(imageId);
  expect(descriptionPreview).toContain('Test description for');
}
```

---

#### Step 7: Verify Embeddings Created

**Action**:
```typescript
// Re-apply filter to show only images WITH embeddings
await bulkGenPage.openFilters();
await bulkGenPage.checkEmbeddings();  // Now check it (was unchecked before)
await bulkGenPage.applyFilters();

// Should now see the same images (they have embeddings after description generation)
const newCount = await bulkGenPage.getMemeCount();
expect(newCount).toBe(imageIds.length);

console.log('✅ Embeddings created for all images');
```

**Expected Behavior**:
- Rails `ImageCore#refresh_description_embeddings` was called after description update
- `ImageEmbedding` records created with 384-dimensional vectors
- Images now show up when filtering by `has_embeddings=true`

---

### Phase 3: Error Handling & Edge Cases

#### 3.1 Handle Slow Processing

**Scenario**: One image takes longer than expected

**Solution**:
```typescript
// Individual timeout per image
async waitForStatus(imageId: number, status: string, timeout = 10000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const currentStatus = await this.getStatusText(imageId);
    if (currentStatus === status) return;
    
    await this.page.waitForTimeout(500);
  }
  
  throw new Error(
    `Timeout: Image ${imageId} did not reach status "${status}" within ${timeout}ms`
  );
}
```

#### 3.2 Handle Failed Jobs

**Scenario**: Python service returns error status

**Solution**:
```typescript
// Check for "failed" status
const status = await bulkGenPage.getStatusText(imageId);
if (status === 'failed') {
  throw new Error(`Image ${imageId} failed to generate description`);
}
```

#### 3.3 Handle WebSocket Disconnection

**Scenario**: ActionCable connection drops during processing

**Solution**:
```typescript
// Fallback: Poll via page reload if WebSocket seems stuck
async waitForStatusWithFallback(imageId: number, status: string): Promise<void> {
  try {
    await this.waitForStatus(imageId, status, 5000);
  } catch (error) {
    // Reload page to get fresh state
    console.log('WebSocket may be stuck, reloading page...');
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    
    // Check status again
    const currentStatus = await this.getStatusText(imageId);
    if (currentStatus !== status) {
      throw error;
    }
  }
}
```

---

## Page Object Model Details

### BulkDescriptionGenerationPage Class

**File**: `playwright/pages/bulk-description-generation.page.ts`

```typescript
import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Bulk Description Generation functionality
 * 
 * Handles filtering to images without descriptions, triggering bulk generation,
 * monitoring status updates, and verifying final descriptions.
 */
export class BulkDescriptionGenerationPage {
  readonly page: Page;

  // Filter controls (reuse from IndexFilterPage)
  readonly openFiltersButton: Locator;
  readonly embeddingsCheckbox: Locator;
  readonly applyFiltersButton: Locator;
  readonly filterSlideover: Locator;

  // Meme cards
  readonly memeCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Filter controls
    this.openFiltersButton = page.getByRole('button', { name: 'Filters' });
    this.filterSlideover = page.locator('dialog[data-slideover-target="dialog"]');
    this.embeddingsCheckbox = page.locator('#has_embeddings_checkbox');
    this.applyFiltersButton = page.getByRole('button', { name: 'Apply Filters' });

    // Meme cards
    this.memeCards = page.locator('div[id^="image_core_card_"]:visible');
  }

  /**
   * Navigate to root page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to image show page
   */
  async gotoImageShow(imageId: number): Promise<void> {
    await this.page.goto(`/image_cores/${imageId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get count of visible meme cards
   */
  async getMemeCount(): Promise<number> {
    return await this.memeCards.count();
  }

  /**
   * Open the filter slideover
   */
  async openFilters(): Promise<void> {
    await this.openFiltersButton.click();
    await this.page.waitForTimeout(500);
    await this.filterSlideover.waitFor({ state: 'visible', timeout: 2000 });
  }

  /**
   * Uncheck embeddings checkbox (to show images WITHOUT descriptions)
   */
  async uncheckEmbeddings(): Promise<void> {
    await this.embeddingsCheckbox.uncheck();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check embeddings checkbox (to show images WITH descriptions)
   */
  async checkEmbeddings(): Promise<void> {
    await this.embeddingsCheckbox.check();
    await this.page.waitForTimeout(300);
  }

  /**
   * Apply filters and close slideover
   */
  async applyFilters(): Promise<void> {
    await this.applyFiltersButton.click();
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filter to show only images without descriptions
   */
  async filterToNoDescriptions(): Promise<void> {
    await this.openFilters();
    await this.uncheckEmbeddings();
    await this.applyFilters();
  }

  /**
   * Get list of image IDs from visible cards
   */
  async getImageIdsWithoutDescriptions(): Promise<number[]> {
    const count = await this.memeCards.count();
    const ids: number[] = [];

    for (let i = 0; i < count; i++) {
      const card = this.memeCards.nth(i);
      const idAttr = await card.getAttribute('id');
      
      if (idAttr) {
        const match = idAttr.match(/image_core_card_(\d+)/);
        if (match) {
          ids.push(parseInt(match[1], 10));
        }
      }
    }

    return ids;
  }

  /**
   * Get status locator for a specific image
   */
  statusLocator(imageId: number): Locator {
    return this.page.locator(`#status-image-core-id-${imageId}`);
  }

  /**
   * Get current status text for an image
   */
  async getStatusText(imageId: number): Promise<string> {
    const statusDiv = this.statusLocator(imageId);
    const text = await statusDiv.textContent();
    return text?.trim() || '';
  }

  /**
   * Get generate description button for an image
   */
  generateButton(imageId: number): Locator {
    // The button is inside a form with action="/image_cores/:id/generate_description"
    return this.page.locator(
      `form[action="/image_cores/${imageId}/generate_description"] input[type="submit"]`
    );
  }

  /**
   * Trigger description generation for a specific image
   */
  async triggerGenerationForImage(imageId: number): Promise<void> {
    const button = this.generateButton(imageId);
    await button.click();
    
    // Wait for Turbo Stream update
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Trigger bulk generation for multiple images
   */
  async triggerBulkGeneration(imageIds: number[]): Promise<void> {
    for (const imageId of imageIds) {
      await this.triggerGenerationForImage(imageId);
      await this.page.waitForTimeout(100); // Small delay between triggers
    }
  }

  /**
   * Wait for a specific status on an image
   */
  async waitForStatus(
    imageId: number, 
    status: string, 
    timeout = 10000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentStatus = await this.getStatusText(imageId);
      
      if (currentStatus === status) {
        return;
      }

      await this.page.waitForTimeout(500);
    }

    throw new Error(
      `Timeout: Image ${imageId} did not reach status "${status}" within ${timeout}ms`
    );
  }

  /**
   * Wait for all images to complete processing
   */
  async waitForAllCompleted(imageIds: number[], timeout = 60000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      let allDone = true;

      for (const imageId of imageIds) {
        const status = await this.getStatusText(imageId);
        
        // Status is "done" when the generate button appears again
        if (!status.includes('generate description')) {
          allDone = false;
          break;
        }
      }

      if (allDone) {
        const duration = Date.now() - startTime;
        console.log(`✅ All ${imageIds.length} images completed in ${duration}ms`);
        return;
      }

      await this.page.waitForTimeout(500);
    }

    throw new Error(
      `Timeout: Not all images completed within ${timeout}ms`
    );
  }

  /**
   * Get description text from image show page
   */
  async getDescriptionText(imageId: number): Promise<string> {
    // On show page, description is in a paragraph
    const descPara = this.page.locator('label:has-text("Description") + div p').first();
    const text = await descPara.textContent();
    return text?.trim() || '';
  }

  /**
   * Get description preview from index page card
   */
  async getDescriptionPreviewFromCard(imageId: number): Promise<string> {
    const card = this.page.locator(`#image_core_card_${imageId}`);
    const descDiv = card.locator('[id^="description-image-core-id-"]');
    const text = await descDiv.textContent();
    return text?.trim() || '';
  }
}
```

---

## Test Spec Implementation

**File**: `playwright/tests/bulk-description-generation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { BulkDescriptionGenerationPage } from '../pages/bulk-description-generation.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Bulk Description Generation Tests
 *
 * Tests the complete workflow for generating descriptions for multiple images:
 * - Filter to images without descriptions
 * - Trigger bulk generation (5-10 images)
 * - Monitor real-time status updates via WebSocket
 * - Verify all descriptions generated correctly
 * - Verify embeddings created
 */
test.describe('Bulk Description Generation', () => {
  let bulkGenPage: BulkDescriptionGenerationPage;

  test.beforeEach(async ({ page }) => {
    // Reset test database with fixture data
    await resetTestDatabase();

    // Initialize page object
    bulkGenPage = new BulkDescriptionGenerationPage(page);

    // Navigate to root page
    await bulkGenPage.goto();
  });

  test('generate descriptions for multiple images without descriptions', async ({ page }) => {
    console.log('=== Starting Bulk Description Generation Test ===');

    // STEP 1: Filter to images without descriptions
    console.log('\n📋 STEP 1: Filter to images without descriptions');
    await bulkGenPage.filterToNoDescriptions();

    // Verify we have 5-10 images
    const initialCount = await bulkGenPage.getMemeCount();
    console.log(`Found ${initialCount} images without descriptions`);
    expect(initialCount).toBeGreaterThanOrEqual(5);
    expect(initialCount).toBeLessThanOrEqual(10);

    // STEP 2: Collect image IDs
    console.log('\n📝 STEP 2: Collect image IDs');
    const imageIds = await bulkGenPage.getImageIdsWithoutDescriptions();
    console.log(`Image IDs: ${imageIds.join(', ')}`);
    expect(imageIds.length).toBe(initialCount);

    // Verify all start with "not_started" status
    for (const imageId of imageIds) {
      const status = await bulkGenPage.getStatusText(imageId);
      expect(status).toMatch(/generate description/i);
    }

    // STEP 3: Trigger bulk generation
    console.log('\n🚀 STEP 3: Trigger bulk generation');
    await bulkGenPage.triggerBulkGeneration(imageIds);

    // STEP 4: Verify all queued
    console.log('\n⏳ STEP 4: Verify all images queued');
    for (const imageId of imageIds) {
      await bulkGenPage.waitForStatus(imageId, 'in_queue', 5000);
      console.log(`✓ Image ${imageId} queued`);
    }

    // STEP 5: Wait for processing to start
    console.log('\n⚙️  STEP 5: Monitor processing');
    await bulkGenPage.waitForStatus(imageIds[0], 'processing', 10000);
    console.log(`✓ First image (${imageIds[0]}) started processing`);

    // STEP 6: Wait for all to complete
    console.log('\n⏱️  STEP 6: Wait for all to complete');
    await bulkGenPage.waitForAllCompleted(imageIds, 60000);

    // STEP 7: Verify descriptions on show pages
    console.log('\n✅ STEP 7: Verify descriptions');
    for (const imageId of imageIds) {
      await bulkGenPage.gotoImageShow(imageId);
      
      const description = await bulkGenPage.getDescriptionText(imageId);
      console.log(`Image ${imageId}: "${description}"`);
      
      // Verify matches test model pattern: "Test description for {filename}"
      expect(description).toMatch(/^Test description for \w+$/);
      
      // Navigate back to index
      await bulkGenPage.goto();
    }

    // STEP 8: Verify embeddings created
    console.log('\n🔍 STEP 8: Verify embeddings created');
    await bulkGenPage.filterToNoDescriptions();
    
    // After generation, these images should have embeddings
    // So filtering to "no embeddings" should show 0 (or different images)
    const finalCount = await bulkGenPage.getMemeCount();
    console.log(`Images without descriptions after generation: ${finalCount}`);
    
    // The images we processed should no longer appear in "no embeddings" filter
    expect(finalCount).toBeLessThan(initialCount);

    console.log('\n=== ✅ Bulk Description Generation Test Complete ===');
  });

  test('handle slow processing with proper timeouts', async ({ page }) => {
    // Filter setup
    await bulkGenPage.filterToNoDescriptions();
    const imageIds = await bulkGenPage.getImageIdsWithoutDescriptions();
    
    // Take only first 3 for faster test
    const testIds = imageIds.slice(0, 3);
    
    // Trigger generation
    await bulkGenPage.triggerBulkGeneration(testIds);
    
    // Each image has individual timeout
    for (const imageId of testIds) {
      await bulkGenPage.waitForStatus(imageId, 'in_queue', 5000);
    }
    
    // Wait for completion with generous timeout
    await bulkGenPage.waitForAllCompleted(testIds, 30000);
    
    // Verify all completed
    for (const imageId of testIds) {
      const status = await bulkGenPage.getStatusText(imageId);
      expect(status).toMatch(/generate description/i);
    }
  });
});
```

---

## Async Operation Handling

### WebSocket Updates (ActionCable)

**Channels**:
1. **ImageStatusChannel**: Broadcasts status changes (not_started → in_queue → processing → done)
2. **ImageDescriptionChannel**: Broadcasts final description text

**JavaScript Consumer** (already in Rails app):
```javascript
// app/javascript/channels/image_status_channel.js
consumer.subscriptions.create("ImageStatusChannel", {
  received(data) {
    const element = document.getElementById(data.div_id);
    if (element) {
      element.outerHTML = data.status_html;
    }
  }
});
```

**Test Handling**:
- **No explicit WebSocket mocking needed**: Playwright runs against real Rails server with ActionCable
- **Wait Strategy**: Use `waitForTimeout(500) + waitForLoadState('networkidle')` after status changes
- **Fallback**: If WebSocket seems stuck, reload page to get fresh state

### Turbo Stream Updates

**Pattern**:
```ruby
# Rails broadcasts Turbo Stream updates
ActionCable.server.broadcast "image_status_channel", {
  div_id: "status-image-core-id-#{image_core.id}",
  status_html: rendered_partial
}
```

**Test Handling**:
```typescript
// Wait for Turbo Stream to update DOM
await page.waitForTimeout(500);  // Standard Turbo Stream wait
await page.waitForLoadState('networkidle');
```

---

## Timeout Considerations

### Expected Timings

**Per Image**:
- Queue submission: ~100ms
- Python test model processing: 1000ms (fixed)
- WebSocket broadcast: ~50ms
- DOM update: ~100ms
- **Total per image**: ~1250ms

**For 10 Images** (sequential processing):
- Total processing: ~12.5 seconds
- Network overhead: ~2-3 seconds
- **Expected total**: ~15 seconds

### Recommended Timeouts

```typescript
// Individual image status transition
waitForStatus(imageId, 'in_queue', 5000);  // 5 seconds

// First image starts processing
waitForStatus(imageIds[0], 'processing', 10000);  // 10 seconds

// All images complete
waitForAllCompleted(imageIds, 60000);  // 60 seconds (generous buffer)
```

### Timeout Strategies

1. **Per-Image Timeouts**: 5-10 seconds (individual status transitions)
2. **Bulk Completion Timeout**: 60 seconds (10 images × 1.5s each + 45s buffer)
3. **Fallback on Timeout**: Reload page and check final state

---

## Database State Management

### Test Database Setup

**Seed Data Requirements**:
```ruby
# db/seeds/test.rb (or equivalent)

# Create test images without descriptions
5.times do |i|
  ImageCore.create!(
    name: "test_image_#{i}.jpg",
    status: 0,  # not_started
    description: nil,  # No description
    image_path: ImagePath.first  # Valid path
  )
end

# No ImageEmbedding records for these images
```

**Reset Between Tests**:
```typescript
test.beforeEach(async ({ page }) => {
  // Full database reset (truncate + reseed)
  await resetTestDatabase();
  
  // Ensures:
  // - Fresh ImageCore records with status: 0
  // - No descriptions
  // - No embeddings
  // - Clean job queue in Python service
});
```

---

## Python Service Configuration

### Test Model Setup

**Environment Variable** (if needed):
```bash
# Set in .env.test
MODEL_NAME=test
```

**Or Configure in Rails**:
```ruby
# test/fixtures/image_to_texts.yml
test_model:
  name: "test"
  current: true
```

### Verify Python Service

**Startup Check**:
```typescript
test.beforeAll(async () => {
  // Optional: Verify Python service is running
  const response = await fetch('http://localhost:8000/check_queue');
  if (!response.ok) {
    throw new Error('Python service not running on port 8000');
  }
});
```

---

## Success Criteria

### Test Passes If:

1. ✅ **Filter Works**: Correctly shows 5-10 images without descriptions
2. ✅ **Bulk Trigger**: All images transition to `in_queue` status
3. ✅ **Processing**: At least one image reaches `processing` status
4. ✅ **Completion**: All images complete within 60 seconds
5. ✅ **Descriptions**: All descriptions match pattern `"Test description for {filename}"`
6. ✅ **Embeddings**: `ImageEmbedding` records created (verified by filter change)
7. ✅ **No Errors**: No failed status, no timeout errors

### Key Assertions

```typescript
// Initial state
expect(initialCount).toBeGreaterThanOrEqual(5);

// All queued
for (const id of imageIds) {
  expect(await getStatusText(id)).toBe('in_queue');
}

// All completed
for (const id of imageIds) {
  expect(await getStatusText(id)).toMatch(/generate description/i);
}

// Descriptions valid
for (const id of imageIds) {
  const desc = await getDescriptionText(id);
  expect(desc).toMatch(/^Test description for \w+$/);
}

// Embeddings created (implicit)
// - Filter to no embeddings shows fewer images than before
```

---

## Debugging & Troubleshooting

### Common Issues

#### Issue 1: Timeout Waiting for Status

**Symptoms**: `waitForStatus` times out

**Diagnosis**:
```typescript
// Add debug logging
async waitForStatus(imageId: number, status: string, timeout = 10000): Promise<void> {
  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < timeout) {
    const currentStatus = await this.getStatusText(imageId);
    
    if (currentStatus !== lastStatus) {
      console.log(`[${Date.now() - startTime}ms] Image ${imageId}: "${lastStatus}" → "${currentStatus}"`);
      lastStatus = currentStatus;
    }
    
    if (currentStatus === status) return;
    
    await this.page.waitForTimeout(500);
  }
  
  throw new Error(`Last status: "${lastStatus}", expected: "${status}"`);
}
```

**Solutions**:
- Check Python service logs
- Verify ActionCable connected
- Increase timeout
- Reload page to get fresh state

#### Issue 2: WebSocket Not Updating UI

**Symptoms**: Status stuck at `in_queue`, but descriptions appear later

**Diagnosis**:
```typescript
// Check if description exists despite status
const desc = await getDescriptionText(imageId);
console.log(`Description exists: ${desc !== ''}`);
```

**Solutions**:
```typescript
// Force reload to sync state
await page.reload();
await page.waitForLoadState('networkidle');
```

#### Issue 3: Python Service Offline

**Symptoms**: All images stuck at `in_queue`

**Diagnosis**:
```bash
# Check Python service
curl http://localhost:8000/check_queue
```

**Solutions**:
- Restart Python service
- Check Docker containers
- Verify port 8000 accessible

### Debug Mode

**Enhanced Logging**:
```typescript
test('debug bulk generation', async ({ page }) => {
  // Enable verbose logging
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  // Log all network requests
  page.on('request', req => console.log('→', req.method(), req.url()));
  page.on('response', res => console.log('←', res.status(), res.url()));
  
  // Run test with detailed logs
  await bulkGenPage.filterToNoDescriptions();
  const imageIds = await bulkGenPage.getImageIdsWithoutDescriptions();
  
  console.log(`\n=== Triggering generation for ${imageIds.length} images ===\n`);
  
  for (const imageId of imageIds) {
    console.log(`\n--- Image ${imageId} ---`);
    await bulkGenPage.triggerGenerationForImage(imageId);
    
    // Log status after each trigger
    const status = await bulkGenPage.getStatusText(imageId);
    console.log(`Status after trigger: "${status}"`);
  }
});
```

---

## Performance Considerations

### Sequential vs Parallel Processing

**Current Architecture**: Sequential
- Python worker processes jobs one at a time
- Order: first-in-first-out (FIFO)
- **Total Time**: 10 images × 1.25s = ~12.5 seconds

**Future Optimization**: Parallel (out of scope for this test)
- Multiple worker threads
- Concurrent processing
- **Total Time**: ~1-2 seconds (all at once)

### Test Optimization

**Option 1: Test Fewer Images**
```typescript
// Test with 5 instead of 10 for faster feedback
const imageIds = (await bulkGenPage.getImageIdsWithoutDescriptions()).slice(0, 5);
```

**Option 2: Reduce Test Model Delay**
```python
# In model_init.py (for faster testing)
def extract(self, image_path):
    self.time.sleep(0.5)  # Reduced from 1 second
    # ...
```

---

## Future Enhancements

### Phase 2 Features (Out of Scope)

1. **Select All Checkbox**: UI to select/deselect all images
2. **Bulk Actions Bar**: Show count of selected, trigger button
3. **Progress Indicator**: "Processing 3 of 10..." with percentage
4. **Cancellation**: Cancel all in-queue jobs at once
5. **Error Recovery**: Retry failed jobs automatically
6. **Parallel Processing**: Multiple Python workers

### Additional Test Scenarios

1. **Cancel During Processing**: Click cancel on images in queue
2. **Mixed Status**: Some images in queue, some processing, some done
3. **Large Batch**: Test with 50-100 images
4. **Failure Handling**: Simulate Python service crash mid-processing
5. **Network Resilience**: Test with slow network conditions

---

## Checklist for Implementation

### Setup Phase
- [ ] Create `playwright/pages/bulk-description-generation.page.ts`
- [ ] Create `playwright/tests/bulk-description-generation.spec.ts`
- [ ] Verify test database seeds 5-10 images without descriptions
- [ ] Verify Python service running with "test" model

### Page Object Implementation
- [ ] Implement `filterToNoDescriptions()`
- [ ] Implement `getImageIdsWithoutDescriptions()`
- [ ] Implement `triggerGenerationForImage()`
- [ ] Implement `triggerBulkGeneration()`
- [ ] Implement `getStatusText()`
- [ ] Implement `waitForStatus()`
- [ ] Implement `waitForAllCompleted()`
- [ ] Implement `getDescriptionText()`

### Test Implementation
- [ ] Step 1: Filter to images without descriptions
- [ ] Step 2: Collect image IDs
- [ ] Step 3: Trigger bulk generation
- [ ] Step 4: Verify all queued
- [ ] Step 5: Monitor processing start
- [ ] Step 6: Wait for all completion
- [ ] Step 7: Verify descriptions
- [ ] Step 8: Verify embeddings created

### Validation
- [ ] Test passes with 5 images
- [ ] Test passes with 10 images
- [ ] Test completes within 60 seconds
- [ ] All assertions pass
- [ ] No flaky failures (run 3 times)

### Documentation
- [ ] Add JSDoc comments to page object methods
- [ ] Add test documentation header
- [ ] Update `playwright/README.md` with new test
- [ ] Add to CI/CD test count (16 → 17 tests)

---

## Estimated Effort

**Implementation Time**: 4-6 hours
- Page Object: 2 hours
- Test Spec: 1.5 hours
- Testing & Debugging: 1.5 hours
- Documentation: 1 hour

**Test Runtime**: 60-90 seconds
- Setup/teardown: 5 seconds
- Filter & collection: 5 seconds
- Bulk triggering: 5 seconds
- Processing (10 images): 15 seconds
- Verification: 30 seconds
- Buffer: 30 seconds

---

## Conclusion

This E2E test validates the complete bulk description generation workflow, ensuring the system can handle batch operations correctly with real-time updates. The test uses the Python "test" model for deterministic output and follows Playwright best practices with Page Object Model pattern, proper wait strategies, and comprehensive assertions.

**Key Strengths**:
- Tests full microservices pipeline (Rails → Python → WebSocket → UI)
- Validates real-time updates via ActionCable
- Deterministic test model ensures reliable assertions
- Proper timeout handling prevents flaky tests
- Page Object Model ensures maintainability

**Next Steps**:
1. Implement page object class
2. Implement test spec
3. Run locally to verify
4. Add to CI/CD pipeline
5. Update test count documentation (16 → 17 tests)

---

**Status**: Ready for Implementation  
**Risk Level**: Medium (depends on WebSocket stability)  
**Priority**: High (validates core batch processing functionality)
