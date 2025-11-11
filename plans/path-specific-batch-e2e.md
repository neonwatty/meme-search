# Path-Specific Batch Description Generation E2E Test - Implementation Plan

## Overview

This document outlines the implementation plan for an E2E test that validates path-specific batch description generation functionality. The test will verify that users can generate descriptions for all images within a specific directory path, while ensuring images in other paths remain unchanged.

## Test Objectives

1. **Path Isolation**: Verify that batch generation only affects images in the selected path
2. **Selective Processing**: Confirm that only images without descriptions are processed
3. **Queue Management**: Validate proper queuing and status updates for path-filtered images
4. **Real-time Updates**: Ensure WebSocket broadcasts update the UI correctly
5. **Data Integrity**: Verify other paths and their images remain completely unchanged

## Architecture Context

### Rails Models
- **ImageCore**: Main meme entity with `description`, `status`, and `image_path_id`
- **ImagePath**: Directory paths (e.g., `example_memes_1`, `example_memes_2`)
- **ImageEmbedding**: 384-dim vectors created after description generation
- **Status Enum**: `0=not_started`, `1=in_queue`, `2=processing`, `3=done`, `4=removing`, `5=failed`

### Test Model Behavior
- Test environment uses a mock model that returns: `"Test description for {filename}"`
- Each generation has a 1-second delay to simulate processing
- Deterministic output enables precise assertions

### Current Flow (Single Image)
1. User clicks "generate description" button on image
2. Rails calls Python `/add_job` endpoint
3. Python processes and calls back to Rails webhooks (`description_receiver`, `status_receiver`)
4. Rails broadcasts WebSocket updates to all clients
5. Status changes: `not_started` → `in_queue` → `processing` → `done`

## Test Scenario Design

### Setup Requirements

**Test Fixtures** (modify existing fixtures):
```yaml
# image_paths.yml
path_a:
  id: 10
  name: "batch_test_path_a"
  
path_b:
  id: 11
  name: "batch_test_path_b"
  
path_c:
  id: 12
  name: "batch_test_path_c"

# image_cores.yml
# Path A: 3 images (2 without descriptions, 1 with)
batch_a1:
  image_path_id: 10
  name: "image_a1.jpg"
  description: ""  # Should be generated
  status: "not_started"
  
batch_a2:
  image_path_id: 10
  name: "image_a2.jpg"
  description: ""  # Should be generated
  status: "not_started"
  
batch_a3:
  image_path_id: 10
  name: "image_a3.jpg"
  description: "Already has description"  # Should NOT be regenerated
  status: "done"

# Path B: 2 images (both without descriptions)
batch_b1:
  image_path_id: 11
  name: "image_b1.jpg"
  description: ""  # Should remain unchanged
  status: "not_started"
  
batch_b2:
  image_path_id: 11
  name: "image_b2.jpg"
  description: ""  # Should remain unchanged
  status: "not_started"

# Path C: 1 image (without description)
batch_c1:
  image_path_id: 12
  name: "image_c1.jpg"
  description: ""  # Should remain unchanged
  status: "not_started"
```

### Expected Behavior

**When batch generating for Path A**:
- ✅ 2 images should be queued (batch_a1, batch_a2)
- ✅ 1 image should be skipped (batch_a3 - already has description)
- ❌ Path B images should remain untouched
- ❌ Path C images should remain untouched

## Page Object Model Design

### New Page Object: `BatchGenerationPage`

**File**: `playwright/pages/settings/batch-generation.page.ts`

```typescript
import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Batch Description Generation
 * 
 * Handles interactions with batch generation UI on Image Paths settings page.
 */
export class BatchGenerationPage {
  readonly page: Page;
  readonly heading: Locator;
  
  // Path-specific batch generation buttons
  // (Assumes UI will have "Generate All" buttons per path)
  
  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
  }

  /**
   * Navigate to Image Paths settings page
   */
  async goto(): Promise<void> {
    await this.page.goto('/settings/image_paths');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to specific ImagePath show page
   * @param pathId - ImagePath database ID
   */
  async gotoPathShow(pathId: number): Promise<void> {
    await this.page.goto(`/settings/image_paths/${pathId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Generate Descriptions" button for a specific path
   * (Location TBD based on UI implementation)
   * 
   * Option 1: Button on index page per path card
   * Option 2: Button on show page for the path
   * 
   * @param pathName - ImagePath name (e.g., "batch_test_path_a")
   */
  async clickBatchGenerateForPath(pathName: string): Promise<void> {
    // Find the path card and click generate button
    const pathCard = this.page.getByText(`/public/memes/${pathName}`)
      .locator('..')
      .locator('..')
      .locator('..')
      .locator('..');
    
    const generateButton = pathCard.getByRole('button', { 
      name: /Generate.*Descriptions?/i 
    });
    
    await generateButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for all queued images to finish processing
   * Polls status until all move to "done" or timeout
   * 
   * @param expectedCount - Number of images expected to process
   * @param timeoutMs - Maximum wait time (default: 30s for 10 images @ 1s each)
   */
  async waitForBatchComplete(expectedCount: number, timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      // Count images still processing (in_queue or processing status)
      const processingCount = await this.page.locator('div.bg-amber-500, div.bg-emerald-500')
        .filter({ hasText: /in_queue|processing/ })
        .count();
      
      if (processingCount === 0) {
        console.log('Batch processing complete');
        return;
      }
      
      console.log(`Still processing ${processingCount} images...`);
      await this.page.waitForTimeout(1000);
    }
    
    throw new Error(`Batch processing timeout after ${timeoutMs}ms`);
  }

  /**
   * Get description text for a specific image by name
   * @param imageName - ImageCore name (e.g., "image_a1.jpg")
   */
  async getImageDescription(imageName: string): Promise<string> {
    // Navigate to root and search for the image
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    
    // Find image by name and get its description
    const imageCard = this.page.locator(`div[id^="image_core_"]`)
      .filter({ hasText: imageName })
      .first();
    
    const description = await imageCard.locator('[id^="description-image-core-id-"]')
      .textContent();
    
    return description?.trim() || '';
  }

  /**
   * Get status for a specific image by name
   * @param imageName - ImageCore name
   * @returns Status string (e.g., "not_started", "done")
   */
  async getImageStatus(imageName: string): Promise<string> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    
    const imageCard = this.page.locator(`div[id^="image_core_"]`)
      .filter({ hasText: imageName })
      .first();
    
    const statusDiv = imageCard.locator('[id^="status-image-core-id-"]');
    const statusText = await statusDiv.textContent();
    
    // Parse status from text content
    if (statusText?.includes('not started')) return 'not_started';
    if (statusText?.includes('in_queue')) return 'in_queue';
    if (statusText?.includes('processing')) return 'processing';
    if (statusText?.includes('done')) return 'done';
    if (statusText?.includes('failed')) return 'failed';
    
    return 'unknown';
  }

  /**
   * Count images with descriptions in a specific path
   * @param pathId - ImagePath database ID
   */
  async countImagesWithDescriptions(pathId: number): Promise<number> {
    // Query via index page with path filter
    await this.page.goto(`/?selected_path_names=path_${pathId}&has_embeddings=false`);
    await this.page.waitForLoadState('networkidle');
    
    // Count images that have non-empty descriptions
    // (This is a placeholder - adjust based on actual DOM structure)
    const imagesWithDesc = await this.page.locator('div[id^="image_core_"]')
      .filter({ has: this.page.locator('[id^="description-image-core-id-"]').filter({ hasNotText: /^\s*$/ }) })
      .count();
    
    return imagesWithDesc;
  }

  /**
   * Verify path isolation - check that images from other paths weren't touched
   * @param pathNames - Array of path names that should remain unchanged
   */
  async verifyPathsUntouched(pathNames: string[]): Promise<boolean> {
    for (const pathName of pathNames) {
      // Check each path's images still have empty descriptions
      const images = await this.getImagesForPath(pathName);
      
      for (const image of images) {
        const description = await this.getImageDescription(image);
        if (description && description.length > 0) {
          console.error(`Path isolation violated: ${image} in ${pathName} has description: ${description}`);
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Get all image names for a specific path
   * @param pathName - ImagePath name
   */
  async getImagesForPath(pathName: string): Promise<string[]> {
    // Navigate to path show page and extract image names
    // (Implementation depends on how path show page displays images)
    return [];  // Placeholder
  }

  /**
   * Check for success flash message
   */
  async hasSuccessMessage(message: string): Promise<boolean> {
    const alertDiv = this.page.locator('[data-controller="alert"]', { hasText: message });
    try {
      await alertDiv.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
```

## Test Implementation

**File**: `playwright/tests/batch-generation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { BatchGenerationPage } from '../pages/settings/batch-generation.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Batch Description Generation Tests
 * 
 * These tests verify path-specific batch description generation functionality.
 * Tests ensure:
 * - Only images from selected path are processed
 * - Images with existing descriptions are skipped
 * - Other paths remain completely unchanged
 */

test.describe('Batch Description Generation', () => {
  let batchPage: BatchGenerationPage;

  // Reset and seed database before each test
  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    batchPage = new BatchGenerationPage(page);
  });

  test('generate descriptions for all images in specific path', async ({ page }) => {
    /**
     * Test Flow:
     * 1. Setup: Verify initial state (3 paths, mixed description states)
     * 2. Trigger: Click batch generate for Path A only
     * 3. Wait: Monitor queue until all images processed
     * 4. Verify: Check Path A images received descriptions
     * 5. Verify: Check Path B and C images remain unchanged
     */

    // ============================================
    // STEP 1: VERIFY INITIAL STATE
    // ============================================
    
    console.log('Step 1: Verifying initial state...');
    
    // Path A: 2 images without descriptions, 1 with
    let descA1 = await batchPage.getImageDescription('image_a1.jpg');
    let descA2 = await batchPage.getImageDescription('image_a2.jpg');
    let descA3 = await batchPage.getImageDescription('image_a3.jpg');
    
    expect(descA1).toBe('');  // Empty
    expect(descA2).toBe('');  // Empty
    expect(descA3).toContain('Already has description');  // Pre-existing
    
    // Path B: 2 images without descriptions
    let descB1 = await batchPage.getImageDescription('image_b1.jpg');
    let descB2 = await batchPage.getImageDescription('image_b2.jpg');
    
    expect(descB1).toBe('');
    expect(descB2).toBe('');
    
    // Path C: 1 image without description
    let descC1 = await batchPage.getImageDescription('image_c1.jpg');
    expect(descC1).toBe('');
    
    console.log('✅ Initial state verified');

    // ============================================
    // STEP 2: TRIGGER BATCH GENERATION FOR PATH A
    // ============================================
    
    console.log('Step 2: Triggering batch generation for Path A...');
    
    await batchPage.goto();  // Navigate to Image Paths settings
    await batchPage.clickBatchGenerateForPath('batch_test_path_a');
    
    // Wait for initial request to complete
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Batch generation triggered');

    // ============================================
    // STEP 3: WAIT FOR PROCESSING TO COMPLETE
    // ============================================
    
    console.log('Step 3: Waiting for batch processing to complete...');
    
    // Expected: 2 images will be processed (image_a1, image_a2)
    // image_a3 should be skipped (already has description)
    // Time estimate: 2 images × 1 second = ~2-3 seconds
    await batchPage.waitForBatchComplete(2, 15000);
    
    console.log('✅ Batch processing complete');

    // ============================================
    // STEP 4: VERIFY PATH A RESULTS
    // ============================================
    
    console.log('Step 4: Verifying Path A results...');
    
    // Verify descriptions were generated with expected format
    descA1 = await batchPage.getImageDescription('image_a1.jpg');
    descA2 = await batchPage.getImageDescription('image_a2.jpg');
    descA3 = await batchPage.getImageDescription('image_a3.jpg');
    
    expect(descA1).toBe('Test description for image_a1.jpg');
    expect(descA2).toBe('Test description for image_a2.jpg');
    expect(descA3).toContain('Already has description');  // Should be unchanged
    
    // Verify statuses updated to "done"
    const statusA1 = await batchPage.getImageStatus('image_a1.jpg');
    const statusA2 = await batchPage.getImageStatus('image_a2.jpg');
    
    expect(statusA1).toBe('done');
    expect(statusA2).toBe('done');
    
    console.log('✅ Path A results verified');

    // ============================================
    // STEP 5: VERIFY PATH ISOLATION (CRITICAL)
    // ============================================
    
    console.log('Step 5: Verifying path isolation...');
    
    // Path B images should remain completely unchanged
    descB1 = await batchPage.getImageDescription('image_b1.jpg');
    descB2 = await batchPage.getImageDescription('image_b2.jpg');
    
    expect(descB1).toBe('');
    expect(descB2).toBe('');
    
    const statusB1 = await batchPage.getImageStatus('image_b1.jpg');
    const statusB2 = await batchPage.getImageStatus('image_b2.jpg');
    
    expect(statusB1).toBe('not_started');
    expect(statusB2).toBe('not_started');
    
    // Path C images should remain completely unchanged
    descC1 = await batchPage.getImageDescription('image_c1.jpg');
    expect(descC1).toBe('');
    
    const statusC1 = await batchPage.getImageStatus('image_c1.jpg');
    expect(statusC1).toBe('not_started');
    
    console.log('✅ Path isolation verified - other paths untouched');

    // ============================================
    // STEP 6: VERIFY EMBEDDINGS CREATED (OPTIONAL)
    // ============================================
    
    console.log('Step 6: Verifying embeddings created...');
    
    // After description generation, embeddings should be auto-created
    // This is an implementation detail, but validates full flow
    // (Could query database or check via filter UI)
    
    console.log('✅ Test complete');
  });

  test('batch generation skips images that already have descriptions', async ({ page }) => {
    /**
     * Focused test to verify selective processing logic
     * All images in Path A have descriptions - none should be queued
     */

    console.log('Test: Verify selective processing...');
    
    // TODO: Create fixtures where all images have descriptions
    // Trigger batch generation
    // Verify no images were queued (queue count = 0)
    // Verify descriptions remain unchanged
  });

  test('batch generation handles multiple paths independently', async ({ page }) => {
    /**
     * Test concurrent/sequential batch generation for different paths
     * Verifies queue management and path isolation under load
     */

    console.log('Test: Multiple path batch generation...');
    
    // Trigger batch for Path A
    await batchPage.clickBatchGenerateForPath('batch_test_path_a');
    await page.waitForTimeout(500);
    
    // Trigger batch for Path B (before Path A completes)
    await batchPage.clickBatchGenerateForPath('batch_test_path_b');
    
    // Wait for both to complete
    await batchPage.waitForBatchComplete(4, 20000);  // 2 from A + 2 from B
    
    // Verify both paths processed correctly
    // Verify Path C still untouched
  });
});
```

## Implementation Prerequisites

### Backend Requirements

**New Controller Action** (likely in `Settings::ImagePathsController`):

```ruby
# POST /settings/image_paths/:id/batch_generate
def batch_generate
  @image_path = ImagePath.find(params[:id])
  
  # Find all images in this path without descriptions
  images_to_process = @image_path.image_cores
    .where(description: ['', nil])
    .where.not(status: ['in_queue', 'processing'])
  
  queued_count = 0
  
  images_to_process.each do |image_core|
    # Update status
    image_core.update(status: 1)  # in_queue
    
    # Get current model
    current_model = ImageToText.find_by(current: true)
    
    # Send to Python service
    uri = URI("http://image_to_text_generator:8000/add_job")
    http = Net::HTTP.new(uri.host, uri.port)
    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    
    data = {
      image_core_id: image_core.id,
      image_path: "#{image_core.image_path.name}/#{image_core.name}",
      model: current_model.name
    }
    request.body = data.to_json
    
    response = http.request(request)
    queued_count += 1 if response.is_a?(Net::HTTPSuccess)
  end
  
  respond_to do |format|
    flash[:notice] = "Queued #{queued_count} #{'image'.pluralize(queued_count)} for description generation."
    format.html { redirect_to [:settings, :image_paths], status: :see_other }
  end
end
```

**Route Addition** (`config/routes.rb`):

```ruby
namespace :settings do
  resources :image_paths do
    member do
      post :rescan
      post :batch_generate  # NEW
    end
  end
end
```

### Frontend Requirements

**UI Button** (add to `app/views/settings/image_paths/index.html.erb` or `show.html.erb`):

```erb
<!-- Option 1: Button on index page per path card -->
<%= button_to "Generate All Descriptions", 
    batch_generate_settings_image_path_path(image_path), 
    method: :post, 
    class: "inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-sm font-medium" %>

<!-- Option 2: Button on show page -->
<%= button_to "Generate Descriptions for All Images", 
    batch_generate_settings_image_path_path(@image_path), 
    method: :post, 
    class: "w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold" %>
```

## Test Execution Strategy

### Test Data Requirements

1. **Modify fixtures** (`test/fixtures/image_cores.yml`, `test/fixtures/image_paths.yml`)
2. **Ensure filesystem** has matching test images in:
   - `public/memes/batch_test_path_a/` (3 images)
   - `public/memes/batch_test_path_b/` (2 images)
   - `public/memes/batch_test_path_c/` (1 image)

### Test Execution

```bash
# Run single test
npm run test:e2e -- batch-generation.spec.ts

# Run with UI for debugging
npm run test:e2e:ui -- batch-generation.spec.ts

# Run with headed browser
npx playwright test batch-generation.spec.ts --headed
```

### Expected Timeline

- **Processing Time**: ~2-3 seconds per test (2 images × 1s delay + overhead)
- **Timeout Safety**: Set to 15-30 seconds to account for CI slowness
- **Parallel Execution**: Tests should be isolated via `resetTestDatabase()`

## Key Assertions Checklist

### Path A (Selected Path)
- ✅ Images without descriptions receive generated text
- ✅ Images with descriptions remain unchanged
- ✅ Status updates: `not_started` → `in_queue` → `processing` → `done`
- ✅ Embeddings created after description generation
- ✅ Flash message confirms queue count

### Path B & C (Other Paths)
- ✅ All images remain with empty descriptions
- ✅ All statuses remain `not_started`
- ✅ No embeddings created
- ✅ No status broadcasts received

### Queue Management
- ✅ Only images from selected path added to queue
- ✅ Queue processes in order
- ✅ WebSocket broadcasts received only for queued images

## Edge Cases to Consider

1. **Empty Path**: Path with no images → flash message "0 images queued"
2. **All Described**: Path where all images have descriptions → skip all
3. **Mixed States**: Some images `in_queue` when batch triggered → skip those
4. **Large Batch**: 20+ images → verify no memory/queue issues (future test)
5. **Network Failure**: Python service offline → proper error handling

## Rails Pattern Gotchas

Based on existing E2E tests, watch for:

1. **Turbo Streams**: Wait 500ms + `networkidle` after async updates
2. **Status Indicators**: Target correct CSS classes for status divs
3. **Flash Messages**: May auto-dismiss quickly, check within 3s
4. **WebSocket Timing**: Description/status broadcasts may arrive out of order
5. **Database Reset**: Use `resetTestDatabase()` in `beforeEach` for isolation

## Success Criteria

### Functional
- ✅ Test passes 100% of the time locally
- ✅ Test passes in CI environment
- ✅ No false positives/negatives
- ✅ Clear console logging for debugging

### Code Quality
- ✅ Follows existing Page Object Model patterns
- ✅ Uses existing helpers (`waitForTurboStream`, etc.)
- ✅ Properly typed (TypeScript)
- ✅ Well-documented with inline comments

### Coverage
- ✅ Validates path-specific filtering
- ✅ Confirms selective processing (skip existing descriptions)
- ✅ Verifies path isolation (other paths untouched)
- ✅ Tests real-time UI updates

## Future Enhancements

1. **Performance Testing**: Large batches (100+ images)
2. **Error Handling**: Network failures, model errors
3. **Cancellation**: Stop batch processing mid-flight
4. **Progress Indicators**: Real-time progress bar
5. **Filtering**: Batch generate only untagged images, etc.

## Related Files

### Test Files
- `playwright/tests/batch-generation.spec.ts` (NEW)
- `playwright/pages/settings/batch-generation.page.ts` (NEW)
- `playwright/tests/image-paths.spec.ts` (reference)
- `playwright/tests/image-cores.spec.ts` (reference)

### Fixtures
- `meme_search/meme_search_app/test/fixtures/image_paths.yml` (modify)
- `meme_search/meme_search_app/test/fixtures/image_cores.yml` (modify)

### Backend
- `meme_search/meme_search_app/app/controllers/settings/image_paths_controller.rb` (add action)
- `meme_search/meme_search_app/config/routes.rb` (add route)

### Frontend
- `meme_search/meme_search_app/app/views/settings/image_paths/index.html.erb` (add button)
- `meme_search/meme_search_app/app/views/settings/image_paths/show.html.erb` (add button)

## Notes

- This plan assumes a new `batch_generate` action will be added to the backend
- UI placement (index vs show page) should be decided based on UX requirements
- The test model's deterministic output enables precise E2E validation
- Path isolation is the **critical assertion** - failure here indicates serious bug
- Consider adding unit tests for the `batch_generate` controller action separately

---

**Document Version**: 1.0  
**Created**: 2025-11-10  
**Purpose**: Implementation guide for path-specific batch E2E testing
