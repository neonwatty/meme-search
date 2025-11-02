import type { Page, Locator } from '@playwright/test';

export class ImagePathsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly navigationList: Locator;
  readonly settingsMenuItem: Locator;
  readonly createNewButton: Locator;
  readonly saveButton: Locator;
  readonly backToPathsButton: Locator;
  readonly pathNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.navigationList = page.locator('ul#navigation');
    this.settingsMenuItem = page.locator('li#settings');
    this.createNewButton = page.getByRole('link', { name: 'Create new' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.backToPathsButton = page.getByRole('link', { name: 'Back to directory paths' });
    this.pathNameInput = page.locator('#new_image_path_text_area');
  }

  /**
   * Navigate to the image paths settings page
   */
  async goto(): Promise<void> {
    await this.page.goto('/settings/image_paths');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to root page
   */
  async gotoRoot(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to image paths via Settings menu
   * Note: Settings now links to Tags page by default, then navigate to Paths via tabs
   */
  async navigateViaSettingsMenu(): Promise<void> {
    // Click on Settings link (goes to Tags page by default)
    await this.page.locator('#settings').click();
    await this.page.waitForLoadState('networkidle');

    // Navigate to Paths tab from settings page
    await this.page.getByRole('link', { name: 'Paths' }).click();
    await this.page.waitForLoadState('networkidle');

    // Wait for heading to update (ensure Turbo Stream completes)
    await this.page.waitForFunction(() => {
      const heading = document.querySelector('h1');
      return heading?.textContent?.includes('Manage Directory Paths');
    }, { timeout: 3000 });
  }

  /**
   * Get the page heading text
   */
  async getHeading(): Promise<string> {
    return (await this.heading.textContent()) || '';
  }

  /**
   * Get count of path divs (divs with id starting with "image_path_")
   */
  async getPathCount(): Promise<number> {
    const pathDivs = this.page.locator('div[id^="image_path_"]');
    return await pathDivs.count();
  }

  /**
   * Get count of meme cards on the root page (divs with id starting with "image_core_card_")
   * Note: Only counts visible cards since the page has both list and grid views in the DOM
   */
  async getMemeCount(): Promise<number> {
    const memeCards = this.page.locator('div[id^="image_core_card_"]:visible');
    return await memeCards.count();
  }

  /**
   * Click "Create new" button
   */
  async clickCreateNew(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/settings/image_paths/new'),
      this.createNewButton.click(),
    ]);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in the path name input
   */
  async fillPathName(name: string): Promise<void> {
    await this.pathNameInput.clear();
    await this.pathNameInput.fill(name);
  }

  /**
   * Click Save button
   */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Back to directory paths" button
   */
  async clickBackToPaths(): Promise<void> {
    await this.backToPathsButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if success message is visible
   */
  async hasSuccessMessage(message: string): Promise<boolean> {
    // Flash messages appear briefly, so we need to check quickly
    const alertDiv = this.page.locator('[data-controller="alert"]', { hasText: message });
    try {
      await alertDiv.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      // Try alternative selector if the alert div isn't found
      const anyDiv = this.page.locator('div.bg-green-400', { hasText: message });
      try {
        await anyDiv.waitFor({ state: 'visible', timeout: 2000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Check if error message is visible
   */
  async hasErrorMessage(message: string): Promise<boolean> {
    // Error messages appear briefly, so we need to check quickly
    const alertDiv = this.page.locator('[data-controller="alert"]', { hasText: message });
    try {
      await alertDiv.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      // Try alternative selector if the alert div isn't found (error messages are typically red)
      const anyDiv = this.page.locator('div.bg-red-400', { hasText: message });
      try {
        await anyDiv.waitFor({ state: 'visible', timeout: 2000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Click "Edit path" button (first occurrence)
   */
  async clickAdjustDeleteFirst(): Promise<void> {
    const editButton = this.page.getByRole('link', { name: 'Edit path' }).first();
    await editButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Edit this directory path" button
   */
  async clickEditThisPath(): Promise<void> {
    const editButton = this.page.getByRole('link', { name: 'Edit this directory path' });
    await editButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Delete this directory path" button and accept the confirmation dialog
   */
  async clickDeleteThisPathWithConfirmation(): Promise<void> {
    // Set up dialog handler before clicking
    this.page.once('dialog', async (dialog) => {
      console.log(`Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });

    // Find the delete button
    const deleteButton = this.page.getByText('Delete this directory path', { exact: true });
    await deleteButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Create a new path with the given name
   */
  async createPath(name: string): Promise<void> {
    await this.clickCreateNew();
    await this.fillPathName(name);
    await this.clickSave();
  }

  /**
   * Edit a path (assumes on path list page)
   */
  async editPath(newName: string): Promise<void> {
    await this.clickAdjustDeleteFirst();
    await this.clickEditThisPath();
    await this.fillPathName(newName);
    await this.clickSave();
  }

  /**
   * Delete a path (assumes on path list page)
   */
  async deletePath(): Promise<void> {
    await this.clickAdjustDeleteFirst();
    await this.clickDeleteThisPathWithConfirmation();
  }
}
