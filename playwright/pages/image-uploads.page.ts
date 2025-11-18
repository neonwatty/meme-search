import { Page } from '@playwright/test';

/**
 * Page Object for Image Uploads page
 * Handles interactions with the drag-and-drop upload interface
 */
export class ImageUploadsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/image_uploads/new');
    await this.page.waitForLoadState('networkidle');
  }

  async getHeading(): Promise<string> {
    const heading = await this.page.locator('h1').first();
    return heading.textContent() || '';
  }

  async isDropzoneVisible(): Promise<boolean> {
    const dropzone = this.page.locator('[data-file-upload-target="dropzone"]');
    return dropzone.isVisible();
  }

  async isUploadButtonDisabled(): Promise<boolean> {
    const uploadButton = this.page.locator('[data-file-upload-target="uploadButton"]');
    return uploadButton.isDisabled();
  }

  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  async getPreviewCount(): Promise<number> {
    const preview = this.page.locator('[data-file-upload-target="preview"]');
    const items = preview.locator('> div');
    return items.count();
  }

  async clickUpload() {
    const uploadButton = this.page.locator('[data-file-upload-target="uploadButton"]');
    await uploadButton.click();
  }

  async hasSuccessMessage(): Promise<boolean> {
    const successMessage = this.page.locator('[data-file-upload-target="successMessage"]');
    const isVisible = await successMessage.isVisible();
    if (!isVisible) return false;

    // Check if it has content
    const text = await successMessage.textContent();
    return text !== null && text.length > 0;
  }

  async hasErrorMessage(): Promise<boolean> {
    const errorMessage = this.page.locator('[data-file-upload-target="errorMessage"]');
    const isVisible = await errorMessage.isVisible();
    if (!isVisible) return false;

    // Check if it has content
    const text = await errorMessage.textContent();
    return text !== null && text.length > 0;
  }

  async removeFirstPreview() {
    const removeButton = this.page.locator('[data-action="click->file-upload#removeFile"]').first();
    await removeButton.click();
  }

  async clickBackToImages() {
    await this.page.click('text=Back to Images');
  }
}
