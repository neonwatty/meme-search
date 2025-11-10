import { test, expect } from '@playwright/test';
import { IndexFilterPage } from '../pages/index-filter.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Index Filter Tests
 *
 * These tests verify the filter slideover functionality on the root page.
 * Tests cover:
 * - Opening/closing the slideover (button, Escape key)
 * - Tag filtering
 * - Path filtering
 * - Embeddings filtering
 * - Applying filters and verifying results
 *
 * Migrated from: test/system/index_filter_test.rb
 */

test.describe('Index Filter', () => {
  let indexFilterPage: IndexFilterPage;

  // Reset and seed database before each test
  test.beforeEach(async ({ page }) => {
    // Reset test database with fixture data
    await resetTestDatabase();

    // Initialize page object
    indexFilterPage = new IndexFilterPage(page);

    // Navigate to root and verify initial state
    await indexFilterPage.gotoRoot();

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Additional stabilization time

    // Ensure slideover is closed (in case it's left open from previous test)
    if (await indexFilterPage.isSlideoverVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Verify initial meme count (matches Capybara setup assertion)
    const initialCount = await indexFilterPage.getMemeCount();
    expect(initialCount).toBe(4);
  });

  /**
   * Test 1: Open filter slideover and close with Escape key
   * Migrated from: lines 13-34
   */
  test('open filters and press escape', async ({ page }) => {
    // Verify slideover is initially hidden
    expect(await indexFilterPage.isSlideoverVisible()).toBe(false);

    // Open the filter slideover
    await indexFilterPage.openFilters();

    // Verify slideover is now visible
    expect(await indexFilterPage.isSlideoverVisible()).toBe(true);

    // Press Escape to close
    await indexFilterPage.closeWithEscape();

    // Verify slideover is hidden again
    expect(await indexFilterPage.isSlideoverVisible()).toBe(false);

    // Verify meme count unchanged
    const finalCount = await indexFilterPage.getMemeCount();
    expect(finalCount).toBe(4);
  });

  /**
   * Test 2: Open filter slideover and close with "Close without filtering" button
   * Migrated from: lines 36-57
   */
  test('click Close without filtering button', async ({ page }) => {
    // Verify slideover is initially hidden
    expect(await indexFilterPage.isSlideoverVisible()).toBe(false);

    // Open the filter slideover
    await indexFilterPage.openFilters();

    // Verify slideover is now visible
    expect(await indexFilterPage.isSlideoverVisible()).toBe(true);

    // Click "Close without filtering" button
    await indexFilterPage.closeWithoutFiltering();

    // Verify slideover is hidden
    expect(await indexFilterPage.isSlideoverVisible()).toBe(false);

    // Verify meme count unchanged
    const finalCount = await indexFilterPage.getMemeCount();
    expect(finalCount).toBe(4);
  });

  /**
   * Test 3: Select all tags, uncheck embeddings, and verify filtered results
   * Migrated from: lines 59-86
   *
   * Expected behavior:
   * - Initial count: 4 memes
   * - Check both tag_0 and tag_1
   * - Uncheck embeddings (since no memes have embeddings initially)
   * - Final count: 3 memes (1 meme filtered out)
   */
  test('check all tags and verify changes', async ({ page }) => {
    // Open filters
    await indexFilterPage.openFilters();

    // Verify slideover is visible
    expect(await indexFilterPage.isSlideoverVisible()).toBe(true);

    // Open tag dropdown
    await indexFilterPage.openTagToggle();

    // Check both tags
    await indexFilterPage.checkTag(0);
    await indexFilterPage.checkTag(1);

    // Note: In the Capybara test, tag toggle is NOT closed here
    // (it stays open)

    // Uncheck embeddings checkbox
    await indexFilterPage.uncheckEmbeddings();

    // Apply filters
    await indexFilterPage.applyFilters();

    // Verify count decreased by 1 (from 4 to 3)
    const finalCount = await indexFilterPage.getMemeCount();
    expect(finalCount).toBe(3);
  });

  /**
   * Test 4: Select one tag, uncheck embeddings, and verify filtered results
   * Migrated from: lines 88-111
   *
   * Expected behavior:
   * - Initial count: 4 memes
   * - Check only tag_0
   * - Uncheck embeddings
   * - Final count: 2 memes (2 memes filtered out)
   */
  test('check one tag and verify changes', async ({ page }) => {
    // Open filters
    await indexFilterPage.openFilters();

    // Verify slideover is visible
    expect(await indexFilterPage.isSlideoverVisible()).toBe(true);

    // Open tag dropdown
    await indexFilterPage.openTagToggle();

    // Check only tag_0
    await indexFilterPage.checkTag(0);

    // Close tag dropdown (matches Capybara test)
    await indexFilterPage.closeTagToggle();

    // Uncheck embeddings checkbox
    await indexFilterPage.uncheckEmbeddings();

    // Apply filters
    await indexFilterPage.applyFilters();

    // Verify count decreased by 2 (from 4 to 2)
    const finalCount = await indexFilterPage.getMemeCount();
    expect(finalCount).toBe(2);
  });

  /**
   * Test 5: Keep embeddings checked (default) and verify zero results
   * Migrated from: lines 113-128
   *
   * Expected behavior:
   * - Initial count: 4 memes
   * - Keep embeddings checkbox checked (default state)
   * - Apply filters
   * - Final count: 0 memes (no memes have embeddings initially)
   */
  test('keep embeddings checked and verify zero results', async ({ page }) => {
    // Open filters
    await indexFilterPage.openFilters();

    // Verify slideover is visible
    expect(await indexFilterPage.isSlideoverVisible()).toBe(true);

    // Verify embeddings is checked by default
    expect(await indexFilterPage.isEmbeddingsChecked()).toBe(true);

    // Apply filters without changing anything
    await indexFilterPage.applyFilters();

    // No memes have embeddings initially, so count should be 0
    const finalCount = await indexFilterPage.getMemeCount();
    expect(finalCount).toBe(0);
  });

  /**
   * Test 6: Select one directory path, uncheck embeddings, and verify filtered results
   * Migrated from: lines 130-152
   *
   * Expected behavior:
   * - Initial count: 4 memes
   * - Uncheck path_1 (keeping path_0 checked)
   * - Uncheck embeddings
   * - Final count: 2 memes (2 memes filtered out)
   */
  test('check one directory path and verify changes', async ({ page }) => {
    // Open filters
    await indexFilterPage.openFilters();

    // Verify slideover is visible
    expect(await indexFilterPage.isSlideoverVisible()).toBe(true);

    // Open path dropdown
    await indexFilterPage.openPathToggle();

    // Uncheck path_1 (path_0 should remain checked)
    await indexFilterPage.uncheckPath(1);

    // Close path dropdown (matches Capybara test)
    await indexFilterPage.closePathToggle();

    // Uncheck embeddings checkbox
    await indexFilterPage.uncheckEmbeddings();

    // Apply filters
    await indexFilterPage.applyFilters();

    // Verify count decreased by 2 (from 4 to 2)
    const finalCount = await indexFilterPage.getMemeCount();
    expect(finalCount).toBe(2);
  });
});
