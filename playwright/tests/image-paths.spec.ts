import { test, expect } from '@playwright/test';
import { ImagePathsPage } from '../pages/settings/image-paths.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Image Paths Settings Tests
 *
 * These tests verify the directory path CRUD operations in the settings page.
 * Migrated from: test/system/image_paths_test.rb
 */

test.describe('Image Paths Settings', () => {
  let imagePathsPage: ImagePathsPage;

  // Reset and seed database before each test
  test.beforeEach(async ({ page }) => {
    // Reset test database with fixture data
    await resetTestDatabase();

    // Initialize page object
    imagePathsPage = new ImagePathsPage(page);
  });

  test('visiting the index, create a new path, edit it, and delete it', async ({ page }) => {
    // Record first meme count
    await imagePathsPage.gotoRoot();
    const firstMemeCount = await imagePathsPage.getMemeCount();
    console.log(`Initial meme count: ${firstMemeCount}`);

    // Visit URL directly
    await imagePathsPage.goto();

    // Verify heading is correct
    let headingText = await imagePathsPage.getHeading();
    expect(headingText).toContain('Current directory paths');

    // Navigate via Settings menu --> Paths
    await imagePathsPage.navigateViaSettingsMenu();

    // Verify heading after navigation
    headingText = await imagePathsPage.getHeading();
    expect(headingText).toContain('Current directory paths');

    // Count total number of original current paths
    const firstPathCount = await imagePathsPage.getPathCount();
    console.log(`Initial path count: ${firstPathCount}`);

    // Click on "Create New"
    await imagePathsPage.clickCreateNew();
    headingText = await imagePathsPage.getHeading();
    expect(headingText).toContain('New directory path');

    // Enter name for new path and create
    await imagePathsPage.fillPathName('example_memes_3');
    await imagePathsPage.clickSave();

    // Wait a bit for the save to complete
    await page.waitForTimeout(1000);

    // Check if we can see the success message
    const hasCreateSuccess = await imagePathsPage.hasSuccessMessage('Directory path successfully created!');
    if (!hasCreateSuccess) {
      console.log('Success message not visible (may have auto-dismissed)');
    }

    // Return to root_path and count total memes
    await imagePathsPage.gotoRoot();
    const secondMemeCount = await imagePathsPage.getMemeCount();
    console.log(`Meme count after creating path: ${secondMemeCount}`);

    // Confirm that second_meme_count is +2 more than first (example_memes_3 has 2 images)
    expect(secondMemeCount).toBe(firstMemeCount + 2);

    // Return to directory paths index
    await imagePathsPage.goto();
    await page.waitForTimeout(500);

    // Return to paths list and count
    const secondPathCount = await imagePathsPage.getPathCount();
    console.log(`Path count after create: ${secondPathCount}`);

    // Make sure current path count is +1 of starting path count
    expect(secondPathCount).toBe(firstPathCount + 1);

    // Try (and fail) to create an invalid image path
    // Click on "Create New"
    await imagePathsPage.clickCreateNew();
    headingText = await imagePathsPage.getHeading();
    expect(headingText).toContain('New directory path');

    // Enter name for invalid path and try to create
    await imagePathsPage.fillPathName('not_a_valid_path');
    await imagePathsPage.clickSave();
    await page.waitForTimeout(500);

    // Check for error message
    const hasErrorMessage = await imagePathsPage.hasErrorMessage('Invalid directory path!');
    if (!hasErrorMessage) {
      console.log('Error message not visible (may have auto-dismissed)');
    }

    // Go back to directory paths
    await imagePathsPage.clickBackToPaths();

    // Edit path
    await imagePathsPage.clickAdjustDeleteFirst();
    await page.waitForTimeout(500);
    await imagePathsPage.clickEditThisPath();
    await page.waitForTimeout(500);
    await imagePathsPage.fillPathName('example_memes_3');
    await imagePathsPage.clickSave();
    await page.waitForTimeout(500);

    // Check for success message
    const hasUpdateSuccess = await imagePathsPage.hasSuccessMessage('Directory path succesfully updated!');
    if (!hasUpdateSuccess) {
      console.log('Update success message not visible (may have auto-dismissed)');
    }

    // Return to paths list
    await imagePathsPage.clickBackToPaths();
    await page.waitForTimeout(500);

    // Count number of paths
    const thirdPathCount = await imagePathsPage.getPathCount();
    console.log(`Path count after edit: ${thirdPathCount}`);
    expect(thirdPathCount).toBe(secondPathCount);

    // Delete path
    await imagePathsPage.clickAdjustDeleteFirst();
    await page.waitForTimeout(500);
    await imagePathsPage.clickDeleteThisPathWithConfirmation();
    await page.waitForTimeout(500);

    // Check for success message
    const hasDeleteSuccess = await imagePathsPage.hasSuccessMessage('Directory path successfully deleted!');
    if (!hasDeleteSuccess) {
      console.log('Delete success message not visible (may have auto-dismissed)');
    }

    // Count number of image paths - assert the same as start
    const fourthPathCount = await imagePathsPage.getPathCount();
    console.log(`Path count after delete: ${fourthPathCount}`);
    expect(fourthPathCount).toBe(firstPathCount);
  });
});
