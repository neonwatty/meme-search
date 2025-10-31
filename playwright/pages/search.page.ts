import type { Page, Locator } from '@playwright/test';

export class SearchPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchBox: Locator;
  readonly searchToggle: Locator;
  readonly searchToggleCheckbox: Locator;
  readonly searchToggleText: Locator;
  readonly tagToggle: Locator;
  readonly searchResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.searchBox = page.locator('#search-box');
    this.searchToggle = page.locator('#search-toggle-div');
    this.searchToggleCheckbox = page.locator('#search-toggle-checkbox');
    this.searchToggleText = page.locator('#search-toggle-text');
    this.tagToggle = page.locator('#tag_toggle');
    this.searchResults = page.locator('#search_results');
  }

  /**
   * Navigate to the search page
   */
  async goto(): Promise<void> {
    await this.page.goto('/image_cores/search');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to the root page
   */
  async gotoRoot(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in the search box and wait for debounced results
   * The search has a 300ms debounce, so we wait 600ms to be safe
   */
  async fillSearch(query: string): Promise<void> {
    await this.searchBox.clear();
    await this.searchBox.fill(query);

    // Wait for debounce (300ms) + network request + Turbo Stream update
    // Using a conservative 600ms wait to ensure results are loaded
    await this.page.waitForTimeout(600);

    // Also wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear the search box
   */
  async clearSearch(): Promise<void> {
    await this.searchBox.clear();
    await this.page.waitForTimeout(600);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for search results to update (Turbo Stream)
   */
  async waitForSearchResults(): Promise<void> {
    await this.page.waitForTimeout(300); // Minimum wait for Turbo Stream
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the current search mode ('keyword' or 'vector')
   */
  async getSearchMode(): Promise<string> {
    const modeText = await this.searchToggleText.textContent();
    return modeText?.trim() || 'keyword';
  }

  /**
   * Toggle to vector search mode
   */
  async toggleToVectorMode(): Promise<void> {
    const currentMode = await this.getSearchMode();
    if (currentMode === 'vector') {
      console.log('Already in vector mode');
      return; // Already in vector mode
    }

    await this.searchToggle.click();
    await this.page.waitForTimeout(300); // Wait for toggle animation

    // Verify mode changed
    const newMode = await this.getSearchMode();
    if (newMode !== 'vector') {
      throw new Error('Failed to toggle to vector mode');
    }
    console.log('Toggled to vector mode');
  }

  /**
   * Toggle to keyword search mode
   */
  async toggleToKeywordMode(): Promise<void> {
    const currentMode = await this.getSearchMode();
    if (currentMode === 'keyword') {
      console.log('Already in keyword mode');
      return; // Already in keyword mode
    }

    await this.searchToggle.click();
    await this.page.waitForTimeout(300); // Wait for toggle animation

    // Verify mode changed
    const newMode = await this.getSearchMode();
    if (newMode !== 'keyword') {
      throw new Error('Failed to toggle to keyword mode');
    }
    console.log('Toggled to keyword mode');
  }

  /**
   * Open the tag selection dropdown
   */
  async openTagDropdown(): Promise<void> {
    await this.tagToggle.click();
    // Wait for dropdown to become visible (multi-select controller)
    await this.page.waitForSelector('[data-multi-select-target="options"]:not(.hidden)', { timeout: 3000 });
    console.log('Opened tag dropdown');
  }

  /**
   * Select a tag by checking its checkbox
   * @param tagIndex - The index of the tag (0-based)
   */
  async selectTag(tagIndex: number): Promise<void> {
    const checkbox = this.page.locator(`#tag_${tagIndex} input[type="checkbox"]`);
    await checkbox.check();
    await this.page.waitForTimeout(300); // Wait for checkbox state to update
    console.log(`Selected tag ${tagIndex}`);
  }

  /**
   * Unselect a tag by unchecking its checkbox
   * @param tagIndex - The index of the tag (0-based)
   */
  async unselectTag(tagIndex: number): Promise<void> {
    const checkbox = this.page.locator(`#tag_${tagIndex} input[type="checkbox"]`);
    await checkbox.uncheck();
    await this.page.waitForTimeout(300); // Wait for checkbox state to update
    console.log(`Unselected tag ${tagIndex}`);
  }

  /**
   * Close the tag dropdown by clicking outside of it
   */
  async closeTagDropdown(): Promise<void> {
    // Click on the tag toggle again to close (same as opening)
    await this.tagToggle.click();
    await this.page.waitForTimeout(300); // Wait for dropdown animation
    console.log('Closed tag dropdown');
  }

  /**
   * Get count of visible meme cards in search results
   * Note: Only counts visible cards since the page has both list and grid views in the DOM
   */
  async getMemeCount(): Promise<number> {
    const memeCards = this.page.locator('div[id^="image_core_card_"]:visible');
    const count = await memeCards.count();
    console.log(`Found ${count} meme(s)`);
    return count;
  }

  /**
   * Check if the "no search" message is visible
   */
  async hasNoSearchMessage(): Promise<boolean> {
    try {
      const noSearchDiv = this.page.locator('#search_results', { hasText: 'No search' });
      await noSearchDiv.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}
