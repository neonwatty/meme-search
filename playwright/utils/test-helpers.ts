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
