import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Index Filter functionality
 *
 * This page object handles interactions with the filter slideover on the root page.
 * It manages:
 * - Opening/closing the filter slideover
 * - Tag selection via dropdown toggle
 * - Path selection via dropdown toggle
 * - Embeddings checkbox
 * - Applying filters and counting filtered results
 */
export class IndexFilterPage {
  readonly page: Page;

  // Container
  readonly filterSlideover: Locator;

  // Buttons
  readonly openFiltersButton: Locator;
  readonly closeWithoutFilteringButton: Locator;
  readonly applyFiltersButton: Locator;

  // Dropdown Toggles
  readonly tagToggle: Locator;
  readonly pathToggle: Locator;

  // Checkboxes
  readonly embeddingsCheckbox: Locator;

  // Meme Cards
  readonly memeCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Container - the actual dialog element that opens/closes
    this.filterSlideover = page.locator('div#filters_slideover dialog[data-slideover-target="dialog"]');

    // Buttons
    this.openFiltersButton = page.getByRole('button', { name: 'Filters' });
    this.closeWithoutFilteringButton = page.getByRole('button', { name: 'Close' });
    this.applyFiltersButton = page.getByRole('button', { name: 'Apply Filters' });

    // Dropdown Toggles
    this.tagToggle = page.locator('div#tag_toggle');
    this.pathToggle = page.locator('div#path_toggle');

    // Checkboxes
    this.embeddingsCheckbox = page.locator('#has_embeddings_checkbox');

    // Meme Cards
    this.memeCards = page.locator('div[id^="image_core_card_"]');
  }

  /**
   * Navigate to the root page
   */
  async gotoRoot(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get count of visible meme cards
   */
  async getMemeCount(): Promise<number> {
    // Only count visible cards (matches Capybara's :visible behavior)
    const visibleCards = this.page.locator('div[id^="image_core_card_"]:visible');
    const count = await visibleCards.count();
    console.log(`Found ${count} meme card(s)`);
    return count;
  }

  /**
   * Check if the filter slideover is visible
   */
  async isSlideoverVisible(): Promise<boolean> {
    return await this.filterSlideover.isVisible();
  }

  /**
   * Open the filter slideover
   * Matches Capybara: click_on "Open filters" + sleep(0.5)
   */
  async openFilters(): Promise<void> {
    await this.openFiltersButton.click();

    // Wait for animation (matches Capybara sleep(0.5))
    await this.page.waitForTimeout(500);

    // Verify slideover is visible
    await this.filterSlideover.waitFor({ state: 'visible', timeout: 2000 });
    console.log('Opened filter slideover');
  }

  /**
   * Close the filter slideover by pressing Escape key
   * Matches Capybara: page.driver.browser.action.send_keys(:escape).perform
   */
  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');

    // Wait for slideover to close with longer timeout and animation
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
    console.log('Closed slideover with Escape key');
  }

  /**
   * Close the filter slideover by clicking "Close without filtering" button
   * Matches Capybara: click_on "Close without filtering"
   */
  async closeWithoutFiltering(): Promise<void> {
    await this.closeWithoutFilteringButton.click();

    // Wait for slideover to close with longer timeout and animation
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
    console.log('Closed slideover without filtering');
  }

  /**
   * Apply filters and close the slideover
   * Matches Capybara: click_on "Apply filters" + sleep(0.2)
   */
  async applyFilters(): Promise<void> {
    await this.applyFiltersButton.click();

    // Wait for filter application and potential page navigation/reload
    await this.page.waitForTimeout(500); // Longer than Capybara's 0.2s
    await this.page.waitForLoadState('networkidle');
    console.log('Applied filters');
  }

  /**
   * Open the tag selection dropdown
   * Matches Capybara: find("#tag_toggle").click
   */
  async openTagToggle(): Promise<void> {
    // First verify the slideover is still open
    await this.filterSlideover.waitFor({ state: 'visible', timeout: 2000 });

    // Click the button inside the tag toggle that has the Stimulus action
    const toggleButton = this.page.locator('#tag_toggle button[data-action*="multi-select#toggle"]');
    await toggleButton.click();
    await this.page.waitForTimeout(500); // Wait for dropdown animation

    console.log('Opened tag toggle');
  }

  /**
   * Close the tag selection dropdown
   */
  async closeTagToggle(): Promise<void> {
    await this.tagToggle.click();
    await this.page.waitForTimeout(300); // Wait for dropdown animation
    console.log('Closed tag toggle');
  }

  /**
   * Check a specific tag checkbox
   * Matches Capybara: find("#tag_N").check
   *
   * @param index - The tag index (0-based)
   */
  async checkTag(index: number): Promise<void> {
    // Ensure the dropdown is visible first
    const dropdown = this.page.locator('#tag_toggle div[data-multi-select-target="options"]');
    await dropdown.waitFor({ state: 'visible', timeout: 2000 });

    const checkbox = this.page.locator(`#tag_${index} input[type="checkbox"]`);
    await checkbox.waitFor({ state: 'visible', timeout: 2000 });
    await checkbox.check();
    await this.page.waitForTimeout(300); // Wait for state update
    console.log(`Checked tag ${index}`);
  }

  /**
   * Uncheck a specific tag checkbox
   *
   * @param index - The tag index (0-based)
   */
  async uncheckTag(index: number): Promise<void> {
    const checkbox = this.page.locator(`#tag_${index} input[type="checkbox"]`);
    await checkbox.uncheck();
    await this.page.waitForTimeout(300); // Wait for state update
    console.log(`Unchecked tag ${index}`);
  }

  /**
   * Check if a specific tag is checked
   *
   * @param index - The tag index (0-based)
   */
  async isTagChecked(index: number): Promise<boolean> {
    const checkbox = this.page.locator(`#tag_${index} input[type="checkbox"]`);
    return await checkbox.isChecked();
  }

  /**
   * Open the path selection dropdown
   * Matches Capybara: find("#path_toggle").click
   */
  async openPathToggle(): Promise<void> {
    // Click the div inside the path toggle that has the Stimulus action
    const toggleDiv = this.page.locator('#path_toggle div[data-action*="multi-select#toggle"]');
    await toggleDiv.click();
    await this.page.waitForTimeout(300); // Wait for dropdown animation

    // Verify the dropdown is now visible
    const dropdown = this.page.locator('#path_toggle div[data-multi-select-target="options"]');
    await dropdown.waitFor({ state: 'visible', timeout: 2000 });
    console.log('Opened path toggle');
  }

  /**
   * Close the path selection dropdown
   */
  async closePathToggle(): Promise<void> {
    await this.pathToggle.click();
    await this.page.waitForTimeout(300); // Wait for dropdown animation
    console.log('Closed path toggle');
  }

  /**
   * Check a specific path checkbox
   * Matches Capybara: find("#path_N").check
   *
   * @param index - The path index (0-based)
   */
  async checkPath(index: number): Promise<void> {
    const checkbox = this.page.locator(`#path_${index} input[type="checkbox"]`);
    await checkbox.check();
    await this.page.waitForTimeout(300); // Wait for state update
    console.log(`Checked path ${index}`);
  }

  /**
   * Uncheck a specific path checkbox
   * Matches Capybara: find("#path_N").uncheck
   *
   * @param index - The path index (0-based)
   */
  async uncheckPath(index: number): Promise<void> {
    const checkbox = this.page.locator(`#path_${index} input[type="checkbox"]`);
    await checkbox.uncheck();
    await this.page.waitForTimeout(300); // Wait for state update
    console.log(`Unchecked path ${index}`);
  }

  /**
   * Check if a specific path is checked
   *
   * @param index - The path index (0-based)
   */
  async isPathChecked(index: number): Promise<boolean> {
    const checkbox = this.page.locator(`#path_${index} input[type="checkbox"]`);
    return await checkbox.isChecked();
  }

  /**
   * Check the embeddings checkbox
   */
  async checkEmbeddings(): Promise<void> {
    await this.embeddingsCheckbox.check();
    await this.page.waitForTimeout(300);
    console.log('Checked embeddings checkbox');
  }

  /**
   * Uncheck the embeddings checkbox
   * Matches Capybara: find("#has_embeddings_checkbox").uncheck
   *
   * Note: The form uses check_box_tag which doesn't create a hidden field,
   * so we need to ensure the checkbox is actually unchecked in the DOM.
   */
  async uncheckEmbeddings(): Promise<void> {
    // First uncheck normally
    await this.embeddingsCheckbox.uncheck();

    // Wait for state change
    await this.page.waitForTimeout(300);

    // Verify it's actually unchecked
    const isChecked = await this.embeddingsCheckbox.isChecked();
    if (isChecked) {
      // If still checked, try clicking the label or checkbox directly
      await this.embeddingsCheckbox.click();
      await this.page.waitForTimeout(300);
    }

    console.log('Unchecked embeddings checkbox');
  }

  /**
   * Check if the embeddings checkbox is checked
   */
  async isEmbeddingsChecked(): Promise<boolean> {
    return await this.embeddingsCheckbox.isChecked();
  }
}
