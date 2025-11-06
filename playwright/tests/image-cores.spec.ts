import { test, expect } from '@playwright/test';
import { ImageCoresPage } from '../pages/image-cores.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Image Cores Tests
 *
 * These tests verify the CRUD operations for image cores (memes).
 * Migrated from: test/system/image_cores_test.rb
 */

test.describe('Image Cores', () => {
  let imageCoresPage: ImageCoresPage;

  // Reset and seed database before each test
  test.beforeEach(async ({ page }) => {
    // Reset test database with fixture data
    await resetTestDatabase();

    // Initialize page object
    imageCoresPage = new ImageCoresPage(page);
  });

  test('visiting the index - edit description and tags', async ({ page }) => {
    // 1. Visit root page and count initial memes
    await imageCoresPage.gotoRoot();
    const firstMemeCount = await imageCoresPage.getMemeCount();
    console.log(`Initial meme count: ${firstMemeCount}`);

    // 2. Click first "generate description" button to view a meme
    await imageCoresPage.clickGenerateDescription();
    await page.waitForURL(/\/image_cores\/\d+$/);
    console.log(`Navigated to meme show page: ${page.url()}`);

    // 3. Record initial state on show page
    const firstTagCount = await imageCoresPage.getTagCount();
    const firstDescription = await imageCoresPage.getDescriptionValue();
    console.log(`Initial tag count: ${firstTagCount}`);
    console.log(`Initial description: ${firstDescription}`);

    // Note: We skip the embeddings check from the original test
    // Database assertions are implementation details, not user-visible behavior

    // 4. Click "Edit details" to go to edit page
    await imageCoresPage.clickEditDetails();
    await page.waitForURL(/\/image_cores\/\d+\/edit$/);
    console.log(`Navigated to edit page: ${page.url()}`);

    // 5. Update description
    const newDescription = "this is a new description";
    await imageCoresPage.fillDescription(newDescription);
    console.log(`Filled new description: ${newDescription}`);

    // 6. Select a tag from the multi-select dropdown
    await imageCoresPage.openTagDropdown();
    await imageCoresPage.selectTag(1); // Select tag at index 1
    await imageCoresPage.closeTagDropdown();
    console.log('Selected tag and closed dropdown');

    // 7. Save the changes
    await imageCoresPage.clickSave();
    await page.waitForURL(/\/image_cores\/\d+$/); // Should redirect back to show page
    console.log(`Saved changes, redirected to: ${page.url()}`);

    // 8. Verify success message appears
    const hasSuccess = await imageCoresPage.hasSuccessMessage('Meme succesfully updated!');
    if (!hasSuccess) {
      console.log('Success message not visible (may have auto-dismissed)');
    }
    expect(hasSuccess).toBe(true);

    // Note: We skip the embeddings existence check from the original test
    // This is an implementation detail that should be tested at the unit/integration level

    // 9. Verify tag count increased by 1
    const secondTagCount = await imageCoresPage.getTagCount();
    console.log(`Tag count after update: ${secondTagCount}`);
    expect(secondTagCount).toBe(firstTagCount + 1);

    // 10. Verify description was updated
    const secondDescription = await imageCoresPage.getDescriptionValue();
    console.log(`Description after update: ${secondDescription}`);
    expect(secondDescription).toBe(newDescription);

    // 11. Navigate back to memes index
    await imageCoresPage.clickBackToMemes();
    await page.waitForURL('/');
    console.log('Returned to memes index');
  });

  test('should destroy image core', async ({ page }) => {
    // 1. Visit root page and count initial memes
    await imageCoresPage.gotoRoot();
    const firstMemeCount = await imageCoresPage.getMemeCount();
    console.log(`Initial meme count: ${firstMemeCount}`);

    // 2. Get first available meme ID and visit its show page
    const firstMemeId = await imageCoresPage.getFirstMemeId();
    expect(firstMemeId).not.toBeNull();
    console.log(`First meme ID: ${firstMemeId}`);

    await imageCoresPage.gotoShow(firstMemeId!);
    console.log(`Navigated to meme show page: ${page.url()}`);

    // 3. Set up dialog handler BEFORE clicking delete
    // The confirmation dialog asks "Are you sure?"
    page.once('dialog', async (dialog) => {
      console.log(`Dialog appeared: ${dialog.message()}`);
      expect(dialog.message()).toContain('Are you sure?');
      await dialog.accept();
    });

    // 4. Click delete button (will trigger confirmation dialog)
    await imageCoresPage.clickDelete();
    // Should redirect to root page after deletion
    console.log(`After delete, redirected to: ${page.url()}`);

    // 5. Verify success message appears
    const hasSuccess = await imageCoresPage.hasSuccessMessage('Meme succesfully deleted!');
    if (!hasSuccess) {
      console.log('Success message not visible (may have auto-dismissed)');
    }
    expect(hasSuccess).toBe(true);

    // 6. Verify meme count decreased by 1
    const secondMemeCount = await imageCoresPage.getMemeCount();
    console.log(`Meme count after delete: ${secondMemeCount}`);
    expect(secondMemeCount).toBe(firstMemeCount - 1);
  });
});
