import { test, expect } from '@playwright/test';
import { ImagePathsPage } from '../pages/settings/image-paths.page';
import { resetTestDatabase } from '../utils/db-setup';
import {
  addTestImage,
  removeTestImage,
  cleanupTestImages,
  fileExists,
  getMemeFilePath,
  copyFile
} from '../utils/filesystem-helpers';

/**
 * Image Path Rescan Feature Tests
 *
 * These tests verify the rescan functionality that detects:
 * - Added images (new files in directory)
 * - Removed images (orphaned database records)
 * - Combined additions and removals
 * - No changes scenarios
 *
 * Test Coverage:
 * 1. Rescan with no changes shows "No changes detected"
 * 2. Add new image file, rescan shows "Added 1 new image"
 * 3. Remove image file, rescan shows "Removed 1 orphaned record"
 * 4. Add and remove files, rescan shows combined message
 * 5. Rescan empty directory shows "No changes detected"
 * 6. Multiple rescans don't create duplicates
 * 7. Rescan button exists and is clickable on index page
 * 8. Rescan button exists and is clickable on show page
 */

test.describe('Image Path Rescan Feature', () => {
  let imagePathsPage: ImagePathsPage;

  // Reset database before each test
  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    imagePathsPage = new ImagePathsPage(page);
  });

  // Clean up test images after each test
  test.afterEach(async () => {
    await cleanupTestImages();
  });

  /**
   * Test 1: Rescan with no changes shows "No changes detected"
   */
  test('rescan with no changes shows correct message', async ({ page }) => {
    // Create a path with test_valid_directory (has 1 image: test_image.jpg)
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_valid_directory');

    // Navigate back to index
    await imagePathsPage.goto();

    // Click rescan button
    await imagePathsPage.clickRescanOnIndex('test_valid_directory');

    // Wait for redirect to index page with flash message
    await page.waitForURL(/\/settings\/image_paths$/);

    // Verify flash message
    const flashMessage = await imagePathsPage.waitForFlashMessage();
    console.log(`Flash message: "${flashMessage}"`);

    expect(flashMessage.toLowerCase()).toContain('no changes detected');
  });

  /**
   * Test 2: Add new image file, rescan shows "Added 1 new image"
   */
  test('rescan detects newly added image file', async ({ page }) => {
    // Create a path with test_empty_directory (initially 0 images)
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_empty_directory');

    // Add a new test image to the directory
    const newImageName = 'new_test_image.jpg';
    await addTestImage('test_empty_directory', newImageName);

    // Verify file was created
    const filePath = getMemeFilePath('test_empty_directory', newImageName);
    expect(fileExists(filePath)).toBeTruthy();

    // Navigate back to index
    await imagePathsPage.goto();

    // Click rescan button
    await imagePathsPage.clickRescanOnIndex('test_empty_directory');

    // Wait for redirect
    await page.waitForURL(/\/settings\/image_paths$/);

    // Verify flash message shows added count
    const flashMessage = await imagePathsPage.waitForFlashMessage();
    console.log(`Flash message: "${flashMessage}"`);

    expect(flashMessage.toLowerCase()).toMatch(/added 1 new image/i);
  });

  /**
   * Test 3: Remove image file, rescan shows "Removed 1 orphaned record"
   */
  test('rescan detects removed image file (orphaned record)', async ({ page }) => {
    // Create a path with test_valid_directory (has 1 image: test_image.jpg)
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_valid_directory');

    // Remove the test image from filesystem
    await removeTestImage('test_valid_directory', 'test_image.jpg');

    // Verify file was removed
    const filePath = getMemeFilePath('test_valid_directory', 'test_image.jpg');
    expect(fileExists(filePath)).toBeFalsy();

    // Navigate back to index
    await imagePathsPage.goto();

    // Click rescan button
    await imagePathsPage.clickRescanOnIndex('test_valid_directory');

    // Wait for redirect
    await page.waitForURL(/\/settings\/image_paths$/);

    // Verify flash message shows removed count
    const flashMessage = await imagePathsPage.waitForFlashMessage();
    console.log(`Flash message: "${flashMessage}"`);

    expect(flashMessage.toLowerCase()).toMatch(/removed 1 orphaned record/i);

    // Note: cleanup will handle restoring test_image.jpg from example_memes
  });

  /**
   * Test 4: Add and remove files, rescan shows combined message
   */
  test('rescan detects both added and removed images', async ({ page }) => {
    // Create a path with test_valid_directory (has 1 image: test_image.jpg)
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_valid_directory');

    // Remove the original test image
    await removeTestImage('test_valid_directory', 'test_image.jpg');

    // Add a new test image with different name (copy from example_memes)
    const newImageName = 'brand_new_image.jpg';
    const sourcePath = getMemeFilePath('example_memes_1', 'all the fucks.jpg');
    const destPath = getMemeFilePath('test_valid_directory', newImageName);
    await copyFile(sourcePath, destPath);

    // Navigate back to index
    await imagePathsPage.goto();

    // Click rescan button
    await imagePathsPage.clickRescanOnIndex('test_valid_directory');

    // Wait for redirect
    await page.waitForURL(/\/settings\/image_paths$/);

    // Verify flash message shows both added and removed counts
    const flashMessage = await imagePathsPage.waitForFlashMessage();
    console.log(`Flash message: "${flashMessage}"`);

    // Should contain both "added" and "removed"
    expect(flashMessage.toLowerCase()).toMatch(/added 1 new image/i);
    expect(flashMessage.toLowerCase()).toMatch(/removed 1 orphaned record/i);

    // Note: cleanup will handle restoring test directory state
  });

  /**
   * Test 5: Rescan empty directory shows "No changes detected"
   */
  test('rescan empty directory shows no changes', async ({ page }) => {
    // Create a path with test_empty_directory (0 images)
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_empty_directory');

    // Navigate back to index
    await imagePathsPage.goto();

    // Click rescan button
    await imagePathsPage.clickRescanOnIndex('test_empty_directory');

    // Wait for redirect
    await page.waitForURL(/\/settings\/image_paths$/);

    // Verify flash message
    const flashMessage = await imagePathsPage.waitForFlashMessage();
    console.log(`Flash message: "${flashMessage}"`);

    expect(flashMessage.toLowerCase()).toContain('no changes detected');
  });

  /**
   * Test 6: Multiple rescans don't create duplicates
   */
  test('multiple rescans do not create duplicate records', async ({ page }) => {
    // Create a path with test_valid_directory (has 1 image: test_image.jpg)
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_valid_directory');

    // Get initial path count
    await imagePathsPage.goto();
    const initialCount = await imagePathsPage.getPathCount();

    // Perform multiple rescans
    for (let i = 0; i < 3; i++) {
      console.log(`Rescan iteration ${i + 1}`);
      await imagePathsPage.clickRescanOnIndex('test_valid_directory');

      // Wait for redirect
      await page.waitForURL(/\/settings\/image_paths$/);

      // Verify "no changes" message after first rescan
      if (i === 0) {
        const flashMessage = await imagePathsPage.waitForFlashMessage();
        expect(flashMessage.toLowerCase()).toContain('no changes detected');
      }

      // Wait a bit before next iteration
      await page.waitForTimeout(500);
    }

    // Verify path count hasn't changed
    const finalCount = await imagePathsPage.getPathCount();
    expect(finalCount).toBe(initialCount);

    console.log(`✅ Path count remained stable: ${finalCount}`);
  });

  /**
   * Test 7: Rescan button exists and is clickable on index page
   */
  test('rescan button is visible and clickable on index page', async ({ page }) => {
    // Create a path to ensure we have something to rescan
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_valid_directory');

    // Navigate back to index
    await imagePathsPage.goto();

    // Verify rescan button exists
    const hasRescanButton = await imagePathsPage.hasRescanButtonOnIndex();
    expect(hasRescanButton).toBeTruthy();

    // Click it and verify it works (should redirect)
    await imagePathsPage.clickRescanOnIndex('test_valid_directory');

    // Should redirect to index with flash message
    await page.waitForURL(/\/settings\/image_paths$/);

    const flashMessage = await imagePathsPage.waitForFlashMessage();
    expect(flashMessage.length).toBeGreaterThan(0);

    console.log(`✅ Rescan button on index page is functional`);
  });

  /**
   * Test 8: Rescan button exists and is clickable on show page
   */
  test('rescan button is visible and clickable on show page', async ({ page }) => {
    // Create a path
    await imagePathsPage.goto();
    await imagePathsPage.createPath('test_valid_directory');

    // Navigate to show page by clicking "Edit path"
    await imagePathsPage.goto();
    await imagePathsPage.clickAdjustDeleteFirst();
    await page.waitForTimeout(500);

    // Verify we're on show page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/settings\/image_paths\/\d+$/);

    // Verify rescan button exists
    const hasRescanButton = await imagePathsPage.hasRescanButtonOnShow();
    expect(hasRescanButton).toBeTruthy();

    // Click it and verify it works
    await imagePathsPage.clickRescanOnShow();

    // Should redirect to index with flash message
    await page.waitForURL(/\/settings\/image_paths$/);

    const flashMessage = await imagePathsPage.waitForFlashMessage();
    expect(flashMessage.length).toBeGreaterThan(0);
    expect(flashMessage.toLowerCase()).toContain('no changes detected');

    console.log(`✅ Rescan button on show page is functional`);
  });
});
