import type { Page, Locator } from '@playwright/test';

/**
 * Base Page Object class providing common functionality for all page objects
 *
 * All page objects should extend this class to inherit standard wait strategies,
 * navigation patterns, and common interaction methods.
 *
 * @example
 * export class MyPage extends BasePage {
 *   readonly myButton: Locator;
 *
 *   constructor(page: Page) {
 *     super(page);
 *     this.myButton = this.page.locator('button#my-button');
 *   }
 *
 *   async clickMyButton(): Promise<void> {
 *     await this.myButton.click();
 *     await this.waitForTurboStream();
 *   }
 * }
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a URL and wait for page load
   *
   * @param path - URL path to navigate to
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to finish loading and all network requests to settle
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for Turbo Stream updates to complete
   *
   * Rails Turbo Streams update the DOM asynchronously. This helper waits for:
   * 1. Fixed delay for Turbo to process (500ms by default)
   * 2. Network to become idle
   *
   * @param timeout - Wait time in milliseconds (default: 500ms)
   */
  async waitForTurboStream(timeout = 500): Promise<void> {
    await this.page.waitForTimeout(timeout);
    await this.waitForPageLoad();
  }

  /**
   * Wait for a turbo frame to load
   *
   * @param frameId - ID of the turbo-frame element
   * @param timeout - Maximum wait time in milliseconds (default: 10000ms)
   */
  async waitForTurboFrame(frameId: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(`turbo-frame#${frameId}[complete]`, { timeout });
  }

  /**
   * Wait for an element to be visible
   *
   * @param selector - CSS selector for the element
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForVisible(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for an element to be hidden
   *
   * @param selector - CSS selector for the element
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForHidden(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Fill in a form field by selector
   *
   * @param selector - CSS selector for the input field
   * @param value - Value to fill in
   */
  async fillField(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * Fill multiple form fields and submit
   *
   * @param fields - Object mapping selectors to values
   * @param submitButtonSelector - Selector for submit button
   *
   * @example
   * await this.fillAndSubmit({
   *   '#name': 'John',
   *   '#email': 'john@example.com'
   * }, 'button[type="submit"]');
   */
  async fillAndSubmit(
    fields: Record<string, string>,
    submitButtonSelector: string
  ): Promise<void> {
    for (const [selector, value] of Object.entries(fields)) {
      await this.fillField(selector, value);
    }
    await this.clickButton(submitButtonSelector);
    await this.waitForTurboStream();
  }

  /**
   * Click a button by selector
   *
   * @param selector - CSS selector for the button
   */
  async clickButton(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /**
   * Click a button by text content
   *
   * @param text - Text content of the button
   */
  async clickButtonByText(text: string): Promise<void> {
    await this.page.click(`button:has-text("${text}"), input[type="submit"][value="${text}"]`);
  }

  /**
   * Get the text content of an element
   *
   * @param selector - CSS selector for the element
   * @returns The text content of the element
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.page.locator(selector);
    return (await element.textContent()) || '';
  }

  /**
   * Count the number of elements matching a selector
   *
   * @param selector - CSS selector
   * @returns Number of matching elements
   */
  async countElements(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * Get count of only visible elements
   *
   * Useful when page has hidden duplicates (grid/list views).
   *
   * @param selector - CSS selector
   * @returns Number of visible elements
   */
  async getVisibleCount(selector: string): Promise<number> {
    const visible = this.page.locator(`${selector}:visible`);
    return await visible.count();
  }

  /**
   * Check if an element is visible
   *
   * @param selector - CSS selector for the element
   * @returns true if visible, false otherwise
   */
  async isVisible(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return await element.isVisible();
  }

  /**
   * Check if an element is hidden
   *
   * @param selector - CSS selector for the element
   * @returns true if hidden, false otherwise
   */
  async isHidden(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return await element.isHidden();
  }

  /**
   * Check a checkbox inside a container div
   *
   * Handles Rails pattern where checkbox input is nested in a container.
   *
   * @param containerSelector - Selector for container element
   */
  async checkCheckbox(containerSelector: string): Promise<void> {
    const checkbox = this.page.locator(`${containerSelector} input[type="checkbox"]`);
    await checkbox.check();
    await this.page.waitForTimeout(300); // State update
  }

  /**
   * Uncheck a checkbox inside a container div
   *
   * @param containerSelector - Selector for container element
   */
  async uncheckCheckbox(containerSelector: string): Promise<void> {
    const checkbox = this.page.locator(`${containerSelector} input[type="checkbox"]`);
    await checkbox.uncheck();
    await this.page.waitForTimeout(300); // State update
  }

  /**
   * Fill input with debounced search handling
   *
   * Waits for debounce timeout + network idle.
   * Common for search boxes in Rails apps.
   *
   * @param selector - Input selector
   * @param query - Search query
   * @param debounceMs - Debounce time (default: 300ms)
   */
  async fillDebouncedSearch(
    selector: string,
    query: string,
    debounceMs = 300
  ): Promise<void> {
    const input = this.page.locator(selector);
    await input.clear();
    await input.fill(query);
    await this.page.waitForTimeout(debounceMs + 500);
    await this.waitForPageLoad();
  }

  /**
   * Press keyboard key and wait for updates
   *
   * @param key - Key name (e.g., 'Escape', 'Enter')
   * @param waitMs - Wait after keypress (default: 500ms)
   */
  async pressKeyAndWait(key: string, waitMs = 500): Promise<void> {
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(waitMs);
    await this.waitForPageLoad();
  }

  /**
   * Accept a browser alert/confirm dialog
   */
  async acceptDialog(): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept());
  }

  /**
   * Dismiss a browser alert/confirm dialog
   */
  async dismissDialog(): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.dismiss());
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Get the current URL
   *
   * @returns Current page URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Get the page title
   *
   * @returns Page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Take a screenshot for debugging
   *
   * @param path - File path to save screenshot (optional)
   */
  async screenshot(path?: string): Promise<void> {
    if (path) {
      await this.page.screenshot({ path });
    } else {
      await this.page.screenshot();
    }
  }
}
