import { test, expect } from '@playwright/test';
import { ImageToTextsPage } from '../pages/settings/image-to-texts.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Image-to-Texts Settings Tests
 *
 * These tests verify the model selection UI in the settings page.
 * Migrated from: test/system/image_to_texts_test.rb
 */

test.describe('Image-to-Texts Settings', () => {
  let imageToTextsPage: ImageToTextsPage;

  // Reset and seed database before each test
  test.beforeEach(async ({ page }) => {
    // Reset test database with fixture data
    await resetTestDatabase();

    // Initialize page object
    imageToTextsPage = new ImageToTextsPage(page);
  });

  test('visiting the index page shows available models heading', async ({ page }) => {
    // Navigate to the settings page
    await imageToTextsPage.goto();

    // Verify the heading is correct
    const headingText = await imageToTextsPage.getHeading();
    expect(headingText).toContain('AI Models');
  });

  test('updating the current model to all available models', async ({ page }) => {
    // Test data: All 5 model IDs from seed (Florence-2-base is default with ID 1)
    const modelIds = [2, 3, 4, 5, 1]; // Start from 2 since 1 is already selected

    await imageToTextsPage.goto();

    // Model 1 (Florence-2-base) should be selected by default
    const defaultSelected = await imageToTextsPage.isModelSelected(1);
    expect(defaultSelected).toBe(true);

    // Test switching to each model (stay on same page, no refresh)
    for (const modelId of modelIds) {
      // Select the model by clicking its label
      await imageToTextsPage.selectModel(modelId);

      // Assert the model is now selected
      const nowSelected = await imageToTextsPage.isModelSelected(modelId);
      expect(nowSelected).toBe(true);

      // Assert all other models are not selected
      const allIds = [1, 2, 3, 4, 5];
      for (const otherId of allIds) {
        if (otherId !== modelId) {
          const otherSelected = await imageToTextsPage.isModelSelected(otherId);
          expect(otherSelected).toBe(false);
        }
      }
    }
  });

  test('only one model can be selected at a time', async ({ page }) => {
    await imageToTextsPage.goto();

    // Model 1 (Florence-2-base) should be selected by default
    expect(await imageToTextsPage.isModelSelected(1)).toBe(true);
    expect(await imageToTextsPage.isModelSelected(2)).toBe(false);

    // Select model 2 (Florence-2-large)
    await imageToTextsPage.selectModel(2);
    expect(await imageToTextsPage.isModelSelected(1)).toBe(false);
    expect(await imageToTextsPage.isModelSelected(2)).toBe(true);

    // Select model 3 (SmolVLM-256M)
    await imageToTextsPage.selectModel(3);
    expect(await imageToTextsPage.isModelSelected(1)).toBe(false);
    expect(await imageToTextsPage.isModelSelected(2)).toBe(false);
    expect(await imageToTextsPage.isModelSelected(3)).toBe(true);

    // Select back to model 1
    await imageToTextsPage.selectModel(1);
    expect(await imageToTextsPage.isModelSelected(1)).toBe(true);
    expect(await imageToTextsPage.isModelSelected(2)).toBe(false);
    expect(await imageToTextsPage.isModelSelected(3)).toBe(false);
  });
});
