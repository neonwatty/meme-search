import type { Page } from '@playwright/test';

/**
 * Wait for the page to finish loading and all network requests to settle
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for a turbo frame to load
 */
export async function waitForTurboFrame(page: Page, frameId: string): Promise<void> {
  await page.waitForSelector(`turbo-frame#${frameId}[complete]`, { timeout: 10000 });
}

/**
 * Navigate to a path and wait for the page to load
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Fill in a form field by label
 */
export async function fillField(page: Page, label: string, value: string): Promise<void> {
  await page.fill(`input[aria-label="${label}"], input[name*="${label.toLowerCase()}"]`, value);
}

/**
 * Click a button by text content
 */
export async function clickButton(page: Page, text: string): Promise<void> {
  await page.click(`button:has-text("${text}"), input[type="submit"][value="${text}"]`);
}

/**
 * Wait for an element to be visible
 */
export async function waitForVisible(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible' });
}

/**
 * Wait for an element to be hidden
 */
export async function waitForHidden(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden' });
}

/**
 * Get the text content of an element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = await page.locator(selector);
  return (await element.textContent()) || '';
}

/**
 * Count the number of elements matching a selector
 */
export async function countElements(page: Page, selector: string): Promise<number> {
  return await page.locator(selector).count();
}

/**
 * Accept a browser alert/confirm dialog
 */
export async function acceptDialog(page: Page): Promise<void> {
  page.once('dialog', (dialog) => dialog.accept());
}

/**
 * Dismiss a browser alert/confirm dialog
 */
export async function dismissDialog(page: Page): Promise<void> {
  page.once('dialog', (dialog) => dialog.dismiss());
}

/**
 * Wait for a specific amount of time (use sparingly, prefer explicit waits)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for Turbo Stream updates to complete
 *
 * Rails Turbo Streams update the DOM asynchronously. This helper waits for:
 * 1. Fixed delay for Turbo to process (500ms by default)
 * 2. Network to become idle
 *
 * @param page - Playwright page object
 * @param timeout - Wait time in milliseconds (default: 500ms)
 */
export async function waitForTurboStream(page: Page, timeout = 500): Promise<void> {
  await page.waitForTimeout(timeout);
  await page.waitForLoadState('networkidle');
}

/**
 * Fill multiple form fields and submit
 *
 * @param page - Playwright page object
 * @param fields - Object mapping selectors to values
 * @param submitButtonText - Text of submit button
 *
 * @example
 * await fillAndSubmit(page, {
 *   '#name': 'John',
 *   '#email': 'john@example.com'
 * }, 'Submit');
 */
export async function fillAndSubmit(
  page: Page,
  fields: Record<string, string>,
  submitButtonText: string
): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
  }
  await clickButton(page, submitButtonText);
  await waitForTurboStream(page);
}

/**
 * Check a checkbox inside a container div
 *
 * Handles Rails pattern where checkbox input is nested in a container.
 *
 * @param page - Playwright page object
 * @param containerSelector - Selector for container element
 */
export async function checkCheckbox(page: Page, containerSelector: string): Promise<void> {
  const checkbox = page.locator(`${containerSelector} input[type="checkbox"]`);
  await checkbox.check();
  await page.waitForTimeout(300); // State update
}

/**
 * Uncheck a checkbox inside a container div
 *
 * @param page - Playwright page object
 * @param containerSelector - Selector for container element
 */
export async function uncheckCheckbox(page: Page, containerSelector: string): Promise<void> {
  const checkbox = page.locator(`${containerSelector} input[type="checkbox"]`);
  await checkbox.uncheck();
  await page.waitForTimeout(300); // State update
}

/**
 * Fill input with debounced search handling
 *
 * Waits for debounce timeout + network idle.
 * Common for search boxes in Rails apps.
 *
 * @param page - Playwright page object
 * @param selector - Input selector
 * @param query - Search query
 * @param debounceMs - Debounce time (default: 300ms)
 */
export async function fillDebouncedSearch(
  page: Page,
  selector: string,
  query: string,
  debounceMs = 300
): Promise<void> {
  const input = page.locator(selector);
  await input.clear();
  await input.fill(query);
  await page.waitForTimeout(debounceMs + 500);
  await page.waitForLoadState('networkidle');
}

/**
 * Get count of only visible elements
 *
 * Useful when page has hidden duplicates (grid/list views).
 *
 * @param page - Playwright page object
 * @param selector - CSS selector
 */
export async function getVisibleCount(page: Page, selector: string): Promise<number> {
  const visible = page.locator(`${selector}:visible`);
  return await visible.count();
}

/**
 * Press keyboard key and wait for updates
 *
 * @param page - Playwright page object
 * @param key - Key name (e.g., 'Escape', 'Enter')
 * @param waitMs - Wait after keypress (default: 500ms)
 */
export async function pressKeyAndWait(
  page: Page,
  key: string,
  waitMs = 500
): Promise<void> {
  await page.keyboard.press(key);
  await page.waitForTimeout(waitMs);
  await page.waitForLoadState('networkidle');
}
