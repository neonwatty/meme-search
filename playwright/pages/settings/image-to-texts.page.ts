import type { Page, Locator } from '@playwright/test';

export class ImageToTextsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
  }

  /**
   * Navigate to the image-to-texts settings page
   */
  async goto(): Promise<void> {
    await this.page.goto('/settings/image_to_texts');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the page heading text
   */
  async getHeading(): Promise<string> {
    return (await this.heading.textContent()) || '';
  }

  /**
   * Get a model checkbox input by ID
   */
  getModelCheckbox(modelId: number): Locator {
    return this.page.locator(`input[id='${modelId}']`);
  }

  /**
   * Get a model label by ID
   */
  getModelLabel(modelId: number): Locator {
    return this.page.locator(`label[for='${modelId}']`);
  }

  /**
   * Check if a model is selected
   */
  async isModelSelected(modelId: number): Promise<boolean> {
    const checkbox = this.getModelCheckbox(modelId);
    return await checkbox.isChecked();
  }

  /**
   * Select a model by clicking its label
   */
  async selectModel(modelId: number): Promise<void> {
    const label = this.getModelLabel(modelId);
    await label.click();
    // Wait for the state to update (toggle switches can have animations/transitions)
    await this.page.waitForTimeout(500);
  }

  /**
   * Get all model checkboxes
   */
  async getAllModelCheckboxes(): Promise<Locator[]> {
    const checkboxes = await this.page.locator('input[type="checkbox"]').all();
    return checkboxes;
  }

  /**
   * Get the count of model checkboxes
   */
  async getModelCount(): Promise<number> {
    return await this.page.locator('input[type="checkbox"]').count();
  }

  /**
   * Verify that only one model is selected
   */
  async verifyOnlyOneModelSelected(selectedId: number, allIds: number[]): Promise<void> {
    for (const id of allIds) {
      const isChecked = await this.isModelSelected(id);
      if (id === selectedId) {
        if (!isChecked) {
          throw new Error(`Model ${id} should be selected but is not`);
        }
      } else {
        if (isChecked) {
          throw new Error(`Model ${id} should not be selected but is`);
        }
      }
    }
  }
}
