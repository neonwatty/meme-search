import type { Page, Locator } from '@playwright/test';

export class TagNamesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly navigationList: Locator;
  readonly settingsMenuItem: Locator;
  readonly createNewButton: Locator;
  readonly saveButton: Locator;
  readonly backToTagsButton: Locator;
  readonly tagNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.navigationList = page.locator('ul#navigation');
    this.settingsMenuItem = page.locator('li#settings');
    this.createNewButton = page.getByRole('link', { name: 'Create new' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.backToTagsButton = page.getByRole('link', { name: 'Back to tags' });
    this.tagNameInput = page.locator('#new_tag_name_text_area');
  }

  /**
   * Navigate to the tag names settings page
   */
  async goto(): Promise<void> {
    await this.page.goto('/settings/tag_names');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to tag names via Settings menu
   * Note: Settings now links directly to Tags page
   */
  async navigateViaSettingsMenu(): Promise<void> {
    // Click on Settings link (now goes directly to Tags page)
    await this.page.locator('#settings').click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the page heading text
   */
  async getHeading(): Promise<string> {
    return (await this.heading.textContent()) || '';
  }

  /**
   * Get count of tag divs (divs with id starting with "tag_name_")
   */
  async getTagCount(): Promise<number> {
    const tagDivs = this.page.locator('div[id^="tag_name_"]');
    return await tagDivs.count();
  }

  /**
   * Click "Create new" button
   */
  async clickCreateNew(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/settings/tag_names/new'),
      this.createNewButton.click(),
    ]);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in the tag name input
   */
  async fillTagName(name: string): Promise<void> {
    await this.tagNameInput.clear();
    await this.tagNameInput.fill(name);
  }

  /**
   * Click Save button
   */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Back to tags" button
   */
  async clickBackToTags(): Promise<void> {
    await this.backToTagsButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if success message is visible
   */
  async hasSuccessMessage(message: string): Promise<boolean> {
    // Flash messages appear briefly, so we need to check quickly
    // Use a more specific selector for the alert div
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
   * Click "Edit tag" button (first occurrence)
   */
  async clickAdjustDeleteFirst(): Promise<void> {
    const editButton = this.page.getByRole('link', { name: 'Edit tag' }).first();
    await editButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Edit this tag" button
   */
  async clickEditThisTag(): Promise<void> {
    const editButton = this.page.getByRole('link', { name: 'Edit this tag' });
    await editButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Delete this tag" button and accept the confirmation dialog
   */
  async clickDeleteThisTagWithConfirmation(): Promise<void> {
    // Set up dialog handler before clicking
    this.page.once('dialog', async (dialog) => {
      console.log(`Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });

    // Try to find the delete button (might be styled as a button but actually a link)
    const deleteButton = this.page.getByText('Delete this tag', { exact: true });
    await deleteButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Create a new tag with the given name
   */
  async createTag(name: string): Promise<void> {
    await this.clickCreateNew();
    await this.fillTagName(name);
    await this.clickSave();
  }

  /**
   * Edit a tag (assumes on tag list page)
   */
  async editTag(newName: string): Promise<void> {
    await this.clickAdjustDeleteFirst();
    await this.clickEditThisTag();
    await this.fillTagName(newName);
    await this.clickSave();
  }

  /**
   * Delete a tag (assumes on tag list page)
   */
  async deleteTag(): Promise<void> {
    await this.clickAdjustDeleteFirst();
    await this.clickDeleteThisTagWithConfirmation();
  }
}
