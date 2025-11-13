import { test, expect } from '@playwright/test';
import { IndexFilterPage } from '../pages/index-filter.page';
import { BulkProgressPage } from '../pages/bulk-progress.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Bulk Description Generation Tests
 *
 * Tests for the bulk description generation feature that allows users to
 * queue multiple images for AI description generation at once.
 *
 * Feature components:
 * - Filter panel with bulk button
 * - Real-time progress overlay
 * - Session + localStorage persistence
 * - Cancel functionality
 *
 * Note: These tests require the Python image_to_text_generator service
 * to be running on port 8000.
 */
test.describe('Bulk Description Generation', () => {
  let indexFilterPage: IndexFilterPage;
  let bulkProgressPage: BulkProgressPage;

  test.beforeEach(async ({ page }) => {
    // Reset database to known state
    await resetTestDatabase();

    // Initialize page objects
    indexFilterPage = new IndexFilterPage(page);
    bulkProgressPage = new BulkProgressPage(page);

    // Navigate to root page
    await indexFilterPage.gotoRoot();
  });

  test('should show bulk button with correct count in filter panel', async ({ page }) => {
    // Open filters then close to see the bulk button (it's outside the dialog)
    await indexFilterPage.openFilters();
    await indexFilterPage.closeWithoutFiltering();

    // Get count (fixture should have images without descriptions)
    const count = await indexFilterPage.getImagesWithoutDescriptionsCount();
    console.log(`Found ${count} images without descriptions`);

    // Verify count is reasonable
    expect(count).toBeGreaterThanOrEqual(0);

    // If count > 0, button should be enabled
    if (count > 0) {
      const isEnabled = await indexFilterPage.isBulkGenerateButtonEnabled();
      expect(isEnabled).toBe(true);

      // Verify button text includes count
      const buttonText = await indexFilterPage.bulkGenerateButton.textContent();
      expect(buttonText).toContain(`Generate All (${count})`);
    } else {
      // If count = 0, button should be disabled
      const isEnabled = await indexFilterPage.isBulkGenerateButtonEnabled();
      expect(isEnabled).toBe(false);
    }
  });

  test('should dismiss confirmation dialog and not start operation', async ({ page }) => {
    // Open filters then close to access bulk button
    await indexFilterPage.openFilters();
    await indexFilterPage.closeWithoutFiltering();

    // Get initial count
    const countBefore = await indexFilterPage.getImagesWithoutDescriptionsCount();

    // Skip test if no images to process
    if (countBefore === 0) {
      console.log('No images without descriptions, skipping test');
      return;
    }

    // Click bulk generate but dismiss dialog
    await indexFilterPage.clickBulkGenerate(false);

    // Wait a moment
    await page.waitForTimeout(1000);

    // Verify overlay does NOT appear
    const isOverlayVisible = await bulkProgressPage.isVisible();
    expect(isOverlayVisible).toBe(false);

    // Verify count unchanged
    const countAfter = await indexFilterPage.getImagesWithoutDescriptionsCount();
    expect(countAfter).toBe(countBefore);
  });

  test('should start bulk operation and show progress overlay', async ({ page }) => {
    // Open filters then close to access bulk button
    await indexFilterPage.openFilters();
    await indexFilterPage.closeWithoutFiltering();

    // Get count
    const count = await indexFilterPage.getImagesWithoutDescriptionsCount();

    // Skip test if no images to process
    if (count === 0) {
      console.log('No images without descriptions, skipping test');
      return;
    }

    console.log(`Starting bulk generation for ${count} images`);

    // Click bulk generate and confirm
    await indexFilterPage.clickBulkGenerate(true);

    // Wait for progress overlay to appear
    await bulkProgressPage.waitForOverlay(5000);
    expect(await bulkProgressPage.isVisible()).toBe(true);

    // Verify initial state
    const initialCounts = await bulkProgressPage.getStatusCounts();
    expect(initialCounts.total).toBe(count);
    console.log(`Initial counts:`, initialCounts);

    // Verify model name is displayed
    const modelName = await bulkProgressPage.getModelName();
    expect(modelName).toBeTruthy();
    expect(modelName).not.toBe('Unknown');
    console.log(`Model: ${modelName}`);
  });

  test.skip('should update progress in real-time', async ({ page }) => {
    // Open filters then close to access bulk button
    await indexFilterPage.openFilters();
    await indexFilterPage.closeWithoutFiltering();

    // Get count
    const count = await indexFilterPage.getImagesWithoutDescriptionsCount();

    // Skip test if no images to process
    if (count === 0) {
      console.log('No images without descriptions, skipping test');
      return;
    }

    // Start bulk operation
    await indexFilterPage.clickBulkGenerate(true);
    await bulkProgressPage.waitForOverlay();

    // Take 3 snapshots over 9 seconds
    const snapshots: Array<{ progress: number; counts: any; timestamp: number }> = [];

    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(3000); // Wait 3 seconds between snapshots
      snapshots.push({
        progress: await bulkProgressPage.getProgress(),
        counts: await bulkProgressPage.getStatusCounts(),
        timestamp: Date.now(),
      });
      console.log(`Snapshot ${i + 1}:`, snapshots[i]);
    }

    // Verify progress is non-decreasing
    expect(snapshots[1].progress).toBeGreaterThanOrEqual(snapshots[0].progress);
    expect(snapshots[2].progress).toBeGreaterThanOrEqual(snapshots[1].progress);

    // Verify done count increases or stays same (never decreases)
    expect(snapshots[2].counts.done).toBeGreaterThanOrEqual(snapshots[0].counts.done);

    // Verify active counts (processing + inQueue) decrease or stay same
    const active0 = snapshots[0].counts.processing + snapshots[0].counts.inQueue;
    const active2 = snapshots[2].counts.processing + snapshots[2].counts.inQueue;
    expect(active2).toBeLessThanOrEqual(active0);
  });

  test('should toggle minimize/expand state', async ({ page }) => {
    // Open filters then close to access bulk button
    await indexFilterPage.openFilters();
    await indexFilterPage.closeWithoutFiltering();

    // Get count
    const count = await indexFilterPage.getImagesWithoutDescriptionsCount();

    // Skip test if no images to process
    if (count === 0) {
      console.log('No images without descriptions, skipping test');
      return;
    }

    // Start bulk operation
    await indexFilterPage.clickBulkGenerate(true);
    await bulkProgressPage.waitForOverlay();

    // Initially expanded
    expect(await bulkProgressPage.content.isVisible()).toBe(true);
    expect(await bulkProgressPage.isMinimized()).toBe(false);

    // Minimize
    await bulkProgressPage.toggleMinimize();
    expect(await bulkProgressPage.content.isVisible()).toBe(false);
    expect(await bulkProgressPage.isMinimized()).toBe(true);

    // Expand
    await bulkProgressPage.toggleMinimize();
    expect(await bulkProgressPage.content.isVisible()).toBe(true);
    expect(await bulkProgressPage.isMinimized()).toBe(false);
  });

  test.skip('should close overlay and allow reopening', async ({ page }) => {
    // Open filters then close to access bulk button
    await indexFilterPage.openFilters();
    await indexFilterPage.closeWithoutFiltering();

    // Get count
    const count = await indexFilterPage.getImagesWithoutDescriptionsCount();

    // Skip test if no images to process
    if (count === 0) {
      console.log('No images without descriptions, skipping test');
      return;
    }

    // Start bulk operation
    await indexFilterPage.clickBulkGenerate(true);
    await bulkProgressPage.waitForOverlay();

    // Close overlay
    await bulkProgressPage.close();
    expect(await bulkProgressPage.isVisible()).toBe(false);

    // Verify operation continues - localStorage still active
    const localStorageActive = await page.evaluate(() => {
      return localStorage.getItem('bulkProgressActive') === 'true';
    });
    expect(localStorageActive).toBe(true);

    // Reload page - overlay should re-appear
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify overlay re-appears
    await bulkProgressPage.waitForOverlay(5000);
    expect(await bulkProgressPage.isVisible()).toBe(true);
  });

  test('should filter by tags and queue only filtered images', async ({ page }) => {
    // Open filters
    await indexFilterPage.openFilters();

    // Apply tag filter
    await indexFilterPage.openTagToggle();
    await indexFilterPage.checkTag(0);

    // Uncheck embeddings to see images without descriptions
    await indexFilterPage.uncheckEmbeddings();

    // Close filters to access bulk button
    await indexFilterPage.closeWithoutFiltering();

    // Wait for filter state to settle
    await page.waitForTimeout(500);

    // Get filtered count
    const filteredCount = await indexFilterPage.getImagesWithoutDescriptionsCount();
    console.log(`Filtered count: ${filteredCount}`);

    // Skip test if no images match filter
    if (filteredCount === 0) {
      console.log('No filtered images without descriptions, skipping test');
      return;
    }

    // Start bulk operation
    await indexFilterPage.clickBulkGenerate(true);
    await bulkProgressPage.waitForOverlay();

    // Verify total matches filtered count
    const counts = await bulkProgressPage.getStatusCounts();
    expect(counts.total).toBe(filteredCount);
    console.log(`Operation queued ${counts.total} images (matches filtered count)`);
  });

  test.skip('should complete operation and auto-reload page', async ({ page }) => {
    // Open filters
    await indexFilterPage.openFilters();

    // Get count
    const count = await indexFilterPage.getImagesWithoutDescriptionsCount();

    // Skip test if no images or too many (would take too long)
    if (count === 0 || count > 3) {
      console.log(`Count is ${count}, skipping completion test (too slow)`);
      return;
    }

    // Start bulk operation
    await indexFilterPage.clickBulkGenerate(true);
    await bulkProgressPage.waitForOverlay();

    // Wait for completion (up to 2 minutes for small batch)
    await bulkProgressPage.waitForCompletion(120000);

    // Verify final state
    const finalCounts = await bulkProgressPage.getStatusCounts();
    expect(finalCounts.done + finalCounts.failed).toBe(finalCounts.total);
    expect(finalCounts.processing).toBe(0);
    expect(finalCounts.inQueue).toBe(0);

    // Verify progress is 100%
    const finalProgress = await bulkProgressPage.getProgress();
    expect(finalProgress).toBe(100);

    // Verify success message appears
    expect(await bulkProgressPage.hasSuccessMessage()).toBe(true);

    // Wait for auto-reload (5 second delay + 5 second buffer)
    await page.waitForURL('/', { timeout: 15000 });

    // After reload, overlay should be gone
    expect(await bulkProgressPage.isVisible()).toBe(false);

    // Verify localStorage cleared
    const localStorageActive = await page.evaluate(() => {
      return localStorage.getItem('bulkProgressActive') === 'true';
    });
    expect(localStorageActive).toBe(false);
  });

  test.skip('should cancel operation mid-process', async ({ page }) => {
    // This test is skipped because it requires a larger batch of images
    // to ensure cancellation happens mid-process (not after completion).
    // The default fixtures may not have enough images.

    // Open filters
    await indexFilterPage.openFilters();

    // Get count
    const count = await indexFilterPage.getImagesWithoutDescriptionsCount();

    // Need at least 5 images to test cancellation
    if (count < 5) {
      console.log(`Count is ${count}, need at least 5 images for cancel test`);
      return;
    }

    // Start bulk operation
    await indexFilterPage.clickBulkGenerate(true);
    await bulkProgressPage.waitForOverlay();

    // Wait for 1-2 images to complete
    await page.waitForTimeout(5000);

    // Get counts before cancel
    const countsBeforeCancel = await bulkProgressPage.getStatusCounts();
    console.log('Counts before cancel:', countsBeforeCancel);

    // Cancel operation
    await bulkProgressPage.cancel();

    // Wait for page reload
    await page.waitForURL('/', { timeout: 10000 });

    // Verify some images remain unprocessed
    await indexFilterPage.openFilters();
    const remainingCount = await indexFilterPage.getImagesWithoutDescriptionsCount();
    console.log(`Remaining count after cancel: ${remainingCount}`);

    expect(remainingCount).toBeGreaterThan(0);
    expect(remainingCount).toBeLessThan(count);
  });
});
