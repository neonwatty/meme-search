import { test, expect } from '@playwright/test';
import { ImageUploadsPage } from '../pages/image-uploads.page';
import { ImagePathsPage } from '../pages/settings/image-paths.page';
import { resetTestDatabase } from '../utils/db-setup';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Image Uploads Tests
 *
 * These tests verify the drag-and-drop image upload functionality.
 * Tests file upload, validation, and integration with ImagePath scanning.
 */

test.describe('Image Uploads', () => {
  let imageUploadsPage: ImageUploadsPage;
  let imagePathsPage: ImagePathsPage;
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  const testInvalidPath = path.join(__dirname, '../fixtures/test-file.txt');

  // Setup test fixtures
  test.beforeAll(async () => {
    // Create test fixtures directory if it doesn't exist
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a simple test image (1x1 pixel JPEG)
    const jpegBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';
    fs.writeFileSync(testImagePath, Buffer.from(jpegBase64, 'base64'));

    // Create a test text file (invalid type)
    fs.writeFileSync(testInvalidPath, 'This is not an image');
  });

  // Cleanup test fixtures
  test.afterAll(async () => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    if (fs.existsSync(testInvalidPath)) {
      fs.unlinkSync(testInvalidPath);
    }
  });

  // Reset database before each test
  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    imageUploadsPage = new ImageUploadsPage(page);
    imagePathsPage = new ImagePathsPage(page);
  });

  test('should display upload page with drag-drop zone', async ({ page }) => {
    await imageUploadsPage.goto();

    // Verify page heading
    const heading = await imageUploadsPage.getHeading();
    expect(heading).toContain('Upload Images');

    // Verify dropzone is visible
    const dropzoneVisible = await imageUploadsPage.isDropzoneVisible();
    expect(dropzoneVisible).toBe(true);

    // Verify upload button is disabled initially
    const uploadButtonDisabled = await imageUploadsPage.isUploadButtonDisabled();
    expect(uploadButtonDisabled).toBe(true);
  });

  test('should upload a single image file', async ({ page }) => {
    await imageUploadsPage.goto();

    // Upload test image
    await imageUploadsPage.uploadFile(testImagePath);

    // Wait for preview to appear
    await page.waitForTimeout(500);

    // Verify preview is shown
    const previewCount = await imageUploadsPage.getPreviewCount();
    expect(previewCount).toBe(1);

    // Verify upload button is enabled
    const uploadButtonDisabled = await imageUploadsPage.isUploadButtonDisabled();
    expect(uploadButtonDisabled).toBe(false);

    // Click upload button
    await imageUploadsPage.clickUpload();

    // Wait for upload to complete
    await page.waitForTimeout(1000);

    // Verify success message
    const hasSuccess = await imageUploadsPage.hasSuccessMessage();
    expect(hasSuccess).toBe(true);
  });

  test('should upload multiple image files', async ({ page }) => {
    await imageUploadsPage.goto();

    // Upload multiple test images (using the same file multiple times for simplicity)
    await imageUploadsPage.uploadFile(testImagePath);
    await page.waitForTimeout(200);
    await imageUploadsPage.uploadFile(testImagePath);

    // Wait for previews to appear
    await page.waitForTimeout(500);

    // Verify preview count
    const previewCount = await imageUploadsPage.getPreviewCount();
    expect(previewCount).toBeGreaterThanOrEqual(1); // May deduplicate same filename

    // Click upload
    await imageUploadsPage.clickUpload();

    // Wait for upload
    await page.waitForTimeout(1000);

    // Verify success
    const hasSuccess = await imageUploadsPage.hasSuccessMessage();
    expect(hasSuccess).toBe(true);
  });

  test('should show error for invalid file type', async ({ page }) => {
    await imageUploadsPage.goto();

    // Try to upload text file
    await imageUploadsPage.uploadFile(testInvalidPath);

    // Wait briefly
    await page.waitForTimeout(500);

    // Should show error message about invalid file type
    const hasError = await imageUploadsPage.hasErrorMessage();
    expect(hasError).toBe(true);

    // Upload button should remain disabled
    const uploadButtonDisabled = await imageUploadsPage.isUploadButtonDisabled();
    expect(uploadButtonDisabled).toBe(true);
  });

  test('should create direct-uploads ImagePath automatically', async ({ page }) => {
    await imageUploadsPage.goto();

    // Upload and submit
    await imageUploadsPage.uploadFile(testImagePath);
    await page.waitForTimeout(500);
    await imageUploadsPage.clickUpload();
    await page.waitForTimeout(1000);

    // Navigate to ImagePaths settings
    await imagePathsPage.goto();
    await page.waitForTimeout(500);

    // Search for direct-uploads path
    const paths = await imagePathsPage.getAllPathNames();
    const hasDirectUploads = paths.some((name: string) => name.includes('direct-uploads'));
    expect(hasDirectUploads).toBe(true);
  });

  test('should allow removing files before upload', async ({ page }) => {
    await imageUploadsPage.goto();

    // Upload file
    await imageUploadsPage.uploadFile(testImagePath);
    await page.waitForTimeout(500);

    // Verify preview exists
    let previewCount = await imageUploadsPage.getPreviewCount();
    expect(previewCount).toBe(1);

    // Remove file
    await imageUploadsPage.removeFirstPreview();
    await page.waitForTimeout(300);

    // Verify preview is removed
    previewCount = await imageUploadsPage.getPreviewCount();
    expect(previewCount).toBe(0);

    // Upload button should be disabled again
    const uploadButtonDisabled = await imageUploadsPage.isUploadButtonDisabled();
    expect(uploadButtonDisabled).toBe(true);
  });

  test('should navigate from upload page to other pages', async ({ page }) => {
    await imageUploadsPage.goto();

    // Click "Back to Images" link
    await page.click('text=Back to Images');
    await page.waitForTimeout(500);

    // Should be at root path
    await expect(page).toHaveURL('/');
  });

  test('should display Upload link in navigation', async ({ page }) => {
    // Navigate to root page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that Upload link is visible in navigation
    const uploadLink = page.locator('#upload_images');
    await expect(uploadLink).toBeVisible();
    await expect(uploadLink).toHaveText('Upload');

    // Check that it has the correct href
    await expect(uploadLink).toHaveAttribute('href', '/image_uploads/new');

    // Click the link and verify navigation
    await uploadLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/image_uploads/new');

    // Verify we're on the upload page
    const heading = await imageUploadsPage.getHeading();
    expect(heading).toContain('Upload Images');
  });
});
