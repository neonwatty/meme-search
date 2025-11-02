import type { Page, Locator } from '@playwright/test';

export class ImageCoresPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
  }

  /**
   * Navigate to the root page (image cores index)
   */
  async gotoRoot(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific image core show page
   */
  async gotoShow(id: number): Promise<void> {
    await this.page.goto(`/image_cores/${id}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific image core edit page
   */
  async gotoEdit(id: number): Promise<void> {
    await this.page.goto(`/image_cores/${id}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get count of visible meme cards on the root page
   * Note: Only counts visible cards since the page has both list and grid views in the DOM
   */
  async getMemeCount(): Promise<number> {
    const memeCards = this.page.locator('div[id^="image_core_card_"]:visible');
    return await memeCards.count();
  }

  /**
   * Get count of tags displayed on the show page
   * Note: Glassmorphic UI displays tags as <span> elements with tag_detail_ prefix
   */
  async getTagCount(): Promise<number> {
    const tags = this.page.locator('span[id^="tag_detail_"]');
    return await tags.count();
  }

  /**
   * Click the first "generate description" button
   */
  async clickGenerateDescription(): Promise<void> {
    const button = this.page.getByRole('link', { name: /generate description/ }).first();
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Edit details" button on show page
   */
  async clickEditDetails(): Promise<void> {
    const button = this.page.getByRole('link', { name: 'Edit details' });
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Delete" button on show page
   * Note: This will trigger a confirmation dialog that must be handled separately
   */
  async clickDelete(): Promise<void> {
    const button = this.page.getByRole('button', { name: 'Delete' });
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Back to memes" button
   */
  async clickBackToMemes(): Promise<void> {
    const button = this.page.getByRole('link', { name: 'Back to memes' });
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in the description textarea on edit page
   */
  async fillDescription(text: string): Promise<void> {
    const textarea = this.page.locator('#image_core_update_description_area');
    await textarea.clear();
    await textarea.fill(text);
  }

  /**
   * Get the current value of the description on show page
   * Note: Glassmorphic UI displays description as <p> tag, not textarea
   */
  async getDescriptionValue(): Promise<string> {
    // On show page, description is in a paragraph within the description section
    const descriptionPara = this.page.locator('label:has-text("Description") + div p').first();
    const text = await descriptionPara.textContent();
    return text?.trim() || '';
  }

  /**
   * Open the tag selection dropdown on edit page
   */
  async openTagDropdown(): Promise<void> {
    await this.page.locator('#edit_image_core_edit_tags').click();
    // Wait for dropdown to become visible
    await this.page.waitForSelector('[data-multi-select-target="options"]:not(.hidden)', { timeout: 3000 });
  }

  /**
   * Select a tag by checking its checkbox
   * Note: Glassmorphic UI uses tag_edit_ prefix for edit page tag IDs
   * @param tagIndex - The index of the tag (0-based)
   */
  async selectTag(tagIndex: number): Promise<void> {
    const checkbox = this.page.locator(`#tag_edit_${tagIndex} input[type="checkbox"]`);
    await checkbox.check();
    await this.page.waitForTimeout(300); // Wait for checkbox state to update
  }

  /**
   * Close the tag dropdown by clicking the toggle again
   * Note: Glassmorphic UI uses multi-select controller that toggles on click
   */
  async closeTagDropdown(): Promise<void> {
    // Click the dropdown toggle to close it
    await this.page.locator('#edit_image_core_edit_tags').click();
    await this.page.waitForTimeout(300); // Wait for dropdown animation
  }

  /**
   * Click the "Save" button on edit page
   */
  async clickSave(): Promise<void> {
    const button = this.page.getByRole('button', { name: 'Save' });
    await button.click();
    await this.page.waitForTimeout(1000); // Wait for save operation
  }

  /**
   * Check if a success message is visible
   */
  async hasSuccessMessage(message: string): Promise<boolean> {
    try {
      const alertDiv = this.page.locator('[data-controller="alert"]', { hasText: message });
      await alertDiv.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      // Try alternative selector for success messages
      const successDiv = this.page.locator('div.bg-green-400', { hasText: message });
      try {
        await successDiv.waitFor({ state: 'visible', timeout: 2000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Extract the image_core ID from the current URL
   * Useful for finding elements with dynamic IDs
   */
  private async getImageCoreIdFromUrl(): Promise<number> {
    const url = this.page.url();
    const match = url.match(/\/image_cores\/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    // If we can't find ID in URL, try to get it from the first meme card
    const firstCard = this.page.locator('div[id^="image_core_card_"]').first();
    const cardId = await firstCard.getAttribute('id');
    if (cardId) {
      const idMatch = cardId.match(/image_core_card_(\d+)/);
      if (idMatch && idMatch[1]) {
        return parseInt(idMatch[1], 10);
      }
    }
    return 1; // Default fallback
  }
}
