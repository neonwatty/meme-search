import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Bulk Progress Overlay
 *
 * Handles interactions with the bulk description generation progress overlay
 * that appears at bottom-right of screen during bulk operations.
 */
export class BulkProgressPage {
  readonly page: Page;

  // Overlay container
  readonly overlay: Locator;

  // Content sections
  readonly content: Locator;
  readonly minimizedIndicator: Locator;

  // Progress indicators
  readonly progressBar: Locator;
  readonly percentage: Locator;
  readonly minimizedPercentage: Locator;

  // Status counts
  readonly doneCount: Locator;
  readonly processingCount: Locator;
  readonly queueCount: Locator;
  readonly failedCount: Locator;
  readonly totalCount: Locator;

  // Model info
  readonly modelName: Locator;

  // Messages
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  // Buttons
  readonly minimizeButton: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main overlay (fixed bottom-right)
    this.overlay = page.locator('[data-controller="bulk-progress"]');

    // Content sections
    this.content = page.locator('[data-bulk-progress-target="content"]');
    this.minimizedIndicator = page.locator('[data-bulk-progress-target="minimizedIndicator"]');

    // Progress indicators
    this.progressBar = page.locator('[data-bulk-progress-target="progressBar"]');
    this.percentage = page.locator('[data-bulk-progress-target="percentage"]');
    this.minimizedPercentage = page.locator('[data-bulk-progress-target="minimizedPercentage"]');

    // Status counts
    this.doneCount = page.locator('[data-bulk-progress-target="doneCount"]');
    this.processingCount = page.locator('[data-bulk-progress-target="processingCount"]');
    this.queueCount = page.locator('[data-bulk-progress-target="queueCount"]');
    this.failedCount = page.locator('[data-bulk-progress-target="failedCount"]');
    this.totalCount = page.locator('[data-bulk-progress-target="totalCount"]');

    // Model info
    this.modelName = page.locator('[data-bulk-progress-target="modelName"]');

    // Messages
    this.errorMessage = page.locator('[data-bulk-progress-target="errorMessage"]');
    this.successMessage = page.locator('[data-bulk-progress-target="successMessage"]');

    // Buttons
    this.minimizeButton = this.overlay.locator('button[title="Minimize"]');
    this.closeButton = this.overlay.locator('button[title="Close"]');
    this.cancelButton = page.locator('[data-bulk-progress-target="cancelButton"]');
  }

  /**
   * Check if overlay is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      return await this.overlay.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for overlay to appear
   */
  async waitForOverlay(timeout = 5000): Promise<void> {
    await this.overlay.waitFor({ state: 'visible', timeout });
    console.log('Bulk progress overlay appeared');
  }

  /**
   * Get current progress percentage
   */
  async getProgress(): Promise<number> {
    const text = await this.percentage.textContent();
    return parseInt(text?.replace('%', '') || '0');
  }

  /**
   * Get status counts
   */
  async getStatusCounts(): Promise<{
    done: number;
    processing: number;
    inQueue: number;
    failed: number;
    total: number;
  }> {
    return {
      done: parseInt((await this.doneCount.textContent()) || '0'),
      processing: parseInt((await this.processingCount.textContent()) || '0'),
      inQueue: parseInt((await this.queueCount.textContent()) || '0'),
      failed: parseInt((await this.failedCount.textContent()) || '0'),
      total: parseInt((await this.totalCount.textContent()) || '0'),
    };
  }

  /**
   * Wait for specific status count
   * Polls every 500ms until condition is met or timeout
   */
  async waitForStatusCount(
    status: 'done' | 'processing' | 'inQueue' | 'failed',
    expectedCount: number,
    timeout = 30000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const counts = await this.getStatusCounts();
      if (counts[status] === expectedCount) {
        console.log(`Status ${status} reached ${expectedCount}`);
        return;
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error(`Timeout waiting for ${status} count to reach ${expectedCount}`);
  }

  /**
   * Wait for operation completion
   * Complete = processing=0 AND inQueue=0 AND done+failed=total
   */
  async waitForCompletion(timeout = 60000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const counts = await this.getStatusCounts();
      const completed = counts.done + counts.failed;

      if (counts.processing === 0 && counts.inQueue === 0 && completed === counts.total && counts.total > 0) {
        console.log('Bulk operation completed');
        await this.page.waitForTimeout(500); // Stabilization
        return;
      }

      await this.page.waitForTimeout(1000); // Poll every second
    }

    throw new Error('Timeout waiting for bulk operation completion');
  }

  /**
   * Check if minimized
   */
  async isMinimized(): Promise<boolean> {
    return await this.minimizedIndicator.isVisible();
  }

  /**
   * Toggle minimize state
   */
  async toggleMinimize(): Promise<void> {
    await this.minimizeButton.click();
    await this.page.waitForTimeout(300);
    console.log('Toggled minimize state');
  }

  /**
   * Cancel operation (with confirmation)
   */
  async cancel(): Promise<void> {
    // Setup dialog handler BEFORE clicking
    this.page.once('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    await this.cancelButton.click();

    // Wait for overlay to close and page reload
    await this.page.waitForTimeout(1000);
    console.log('Cancelled bulk operation');
  }

  /**
   * Close overlay
   */
  async close(): Promise<void> {
    await this.closeButton.click();
    await this.page.waitForTimeout(300);
    console.log('Closed bulk progress overlay');
  }

  /**
   * Check if success message is visible
   */
  async hasSuccessMessage(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }

  /**
   * Check if error message is visible
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get model name
   */
  async getModelName(): Promise<string> {
    return (await this.modelName.textContent()) || 'Unknown';
  }
}
