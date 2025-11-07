/**
 * Base Page Object for Docker E2E Tests
 *
 * Provides common functionality for all page objects including:
 * - Navigation to Docker-exposed Rails app (localhost:3001)
 * - Rails-specific patterns (Turbo Stream, debounced inputs)
 * - Common assertions and helpers
 */

import { Page, Locator } from '@playwright/test';

export class DockerBasePage {
  readonly page: Page;
  protected baseURL: string;

  constructor(page: Page, baseURL: string = 'http://localhost:3001') {
    this.page = page;
    this.baseURL = baseURL;
  }

  /**
   * Navigate to a path relative to baseURL
   */
  async goto(path: string): Promise<void> {
    const url = `${this.baseURL}${path}`;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for Turbo Stream updates to complete
   *
   * Rails uses Turbo Streams for async DOM updates. After triggering an action
   * that updates the page via Turbo, call this to wait for the update.
   */
  async waitForTurboStream(timeout: number = 500): Promise<void> {
    await this.page.waitForTimeout(timeout);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check a checkbox that's nested in a container
   *
   * Rails often wraps checkboxes in container divs. This helper targets
   * the actual input element inside the container.
   */
  async checkCheckbox(containerSelector: string): Promise<void> {
    const checkbox = this.page.locator(`${containerSelector} input[type="checkbox"]`);
    await checkbox.check();
    await this.page.waitForTimeout(300); // Wait for state update
  }

  /**
   * Uncheck a checkbox that's nested in a container
   */
  async uncheckCheckbox(containerSelector: string): Promise<void> {
    const checkbox = this.page.locator(`${containerSelector} input[type="checkbox"]`);
    await checkbox.uncheck();
    await this.page.waitForTimeout(300);
  }

  /**
   * Fill a debounced search input
   *
   * Many search inputs have debounced event handlers (typically 300ms).
   * This helper waits for the debounce delay plus processing time.
   */
  async fillDebouncedSearch(
    selector: string,
    query: string,
    debounceMs: number = 300
  ): Promise<void> {
    await this.page.locator(selector).fill(query);
    await this.page.waitForTimeout(debounceMs + 500); // Debounce + processing
    await this.waitForPageLoad();
  }

  /**
   * Count elements matching a selector
   */
  async countElements(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * Accept a browser dialog (confirm/alert)
   */
  async acceptDialog(): Promise<void> {
    this.page.once('dialog', dialog => dialog.accept());
  }

  /**
   * Dismiss a browser dialog
   */
  async dismissDialog(): Promise<void> {
    this.page.once('dialog', dialog => dialog.dismiss());
  }

  /**
   * Wait for a modal/dialog to be visible
   *
   * Rails apps often use <dialog> elements. This waits for the dialog itself,
   * not just the wrapper div.
   */
  async waitForDialog(dialogSelector: string, timeout: number = 5000): Promise<void> {
    const dialog = this.page.locator(`${dialogSelector} dialog[data-slideover-target="dialog"]`);
    await dialog.waitFor({ state: 'visible', timeout });
  }

  /**
   * Close a modal/dialog
   */
  async closeDialog(closeButtonSelector: string = 'button[aria-label="Close"]'): Promise<void> {
    await this.page.click(closeButtonSelector);
    await this.waitForTurboStream();
  }

  /**
   * Wait for an element to appear
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for an element to disappear
   */
  async waitForElementToDisappear(selector: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Scroll element into view
   */
  async scrollIntoView(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Get text content of an element
   */
  async getTextContent(selector: string): Promise<string | null> {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Get current URL
   */
  getURL(): string {
    return this.page.url();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Take a screenshot (useful for debugging)
   */
  async takeScreenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: true });
  }
}
