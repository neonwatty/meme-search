/**
 * Search Page Object for Docker E2E Tests
 *
 * Provides interactions with the /image_cores/search page including:
 * - Keyword search
 * - Vector search toggle
 * - Search results inspection
 */

import { DockerBasePage } from './docker-base.page';
import { Page, Locator } from '@playwright/test';

export class DockerSearchPage extends DockerBasePage {
  readonly searchInput: Locator;
  readonly vectorSearchCheckbox: Locator;
  readonly vectorSearchWrapper: Locator;
  readonly resultsContainer: Locator;
  readonly searchForm: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('#search-box');
    this.vectorSearchWrapper = page.locator('#search-toggle-div'); // Visual toggle div
    this.vectorSearchCheckbox = page.locator('#search-toggle-checkbox'); // Direct selector
    this.resultsContainer = page.locator('#search_results');
    this.searchForm = page.locator('form');
  }

  /**
   * Navigate to search page
   */
  async goto(): Promise<void> {
    await super.goto('/image_cores/search');
  }

  /**
   * Fill search input with query
   *
   * Waits for debounced search to complete
   */
  async fillSearch(query: string): Promise<void> {
    await this.fillDebouncedSearch('#search-box', query);
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.waitForTurboStream();
  }

  /**
   * Enable vector search
   */
  async enableVectorSearch(): Promise<void> {
    // Check current state via the hidden checkbox
    const isEnabled = await this.vectorSearchCheckbox.isChecked();

    if (!isEnabled) {
      // Click the parent label (checkbox is sr-only, label handles the interaction)
      const label = this.page.locator('label:has(#search-toggle-checkbox)');
      await label.click();
      await this.page.waitForTimeout(300); // Wait for onChange handler
      await this.waitForTurboStream();
    }
  }

  /**
   * Disable vector search (fallback to keyword search)
   */
  async disableVectorSearch(): Promise<void> {
    // Check current state via the hidden checkbox
    const isEnabled = await this.vectorSearchCheckbox.isChecked();

    if (isEnabled) {
      // Click the parent label (checkbox is sr-only, label handles the interaction)
      const label = this.page.locator('label:has(#search-toggle-checkbox)');
      await label.click();
      await this.page.waitForTimeout(300); // Wait for onChange handler
      await this.waitForTurboStream();
    }
  }

  /**
   * Check if vector search is enabled
   */
  async isVectorSearchEnabled(): Promise<boolean> {
    return await this.vectorSearchCheckbox.isChecked();
  }

  /**
   * Get count of meme results
   */
  async getMemeCount(): Promise<number> {
    return await this.countElements("div[id^='image_core_card_']");
  }

  /**
   * Get IDs of all result cards
   *
   * Returns array of ImageCore IDs from the search results
   */
  async getResultIds(): Promise<number[]> {
    const cards = await this.page.locator("div[id^='image_core_card_']").all();
    const ids: number[] = [];

    for (const card of cards) {
      const id = await card.getAttribute('id');
      if (id) {
        const match = id.match(/image_core_card_(\d+)/);
        if (match) {
          ids.push(parseInt(match[1]));
        }
      }
    }

    return ids;
  }

  /**
   * Check if a specific image appears in results
   */
  async hasResult(imageId: number): Promise<boolean> {
    const card = this.page.locator(`#image_core_card_${imageId}`);
    try {
      return await card.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get description text for a result card
   */
  async getResultDescription(imageId: number): Promise<string | null> {
    const descriptionElement = this.page.locator(
      `#image_core_card_${imageId} .image-description`
    );

    try {
      return await descriptionElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get status badge text for a result card
   */
  async getResultStatus(imageId: number): Promise<string | null> {
    const statusBadge = this.page.locator(
      `#image_core_card_${imageId} .status-badge`
    );

    try {
      return await statusBadge.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Click on a result card to view details
   */
  async clickResult(imageId: number): Promise<void> {
    const card = this.page.locator(`#image_core_card_${imageId}`);
    await card.click();
    await this.waitForNavigation();
  }

  /**
   * Wait for search results to update
   */
  async waitForResults(timeout: number = 10000): Promise<void> {
    await this.waitForTurboStream();
    // Additional wait to ensure results are rendered
    await this.page.waitForTimeout(500);
  }

  /**
   * Perform keyword search and wait for results
   */
  async performKeywordSearch(query: string): Promise<void> {
    await this.disableVectorSearch();
    await this.fillSearch(query);
    await this.waitForResults();
  }

  /**
   * Perform vector search and wait for results
   */
  async performVectorSearch(query: string): Promise<void> {
    await this.enableVectorSearch();
    await this.fillSearch(query);
    await this.waitForResults();
  }

  /**
   * Get all result cards
   */
  async getAllResultCards(): Promise<Locator[]> {
    return await this.page.locator("div[id^='image_core_card_']").all();
  }

  /**
   * Check if results container is empty
   */
  async hasNoResults(): Promise<boolean> {
    const count = await this.getMemeCount();
    return count === 0;
  }

  /**
   * Get search input value
   */
  async getSearchQuery(): Promise<string> {
    return (await this.searchInput.inputValue()) || '';
  }

  /**
   * Check if search form is visible
   */
  async isSearchFormVisible(): Promise<boolean> {
    return await this.searchForm.isVisible();
  }
}
