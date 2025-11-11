import { test, expect } from '@playwright/test';
import { ImagePathsPage } from '../pages/settings/image-paths.page';
import { resetTestDatabase } from '../utils/db-setup';

test.describe('Auto-scan UI', () => {
  let imagePathsPage: ImagePathsPage;

  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    imagePathsPage = new ImagePathsPage(page);
  });

  test('should allow setting scan frequency and display status indicator', async () => {
    // Navigate to create new path page
    await imagePathsPage.goto();
    await imagePathsPage.clickCreateNew();

    // Verify scan frequency dropdown is visible
    const hasDropdown = await imagePathsPage.hasScanFrequencyDropdown();
    expect(hasDropdown).toBe(true);

    // Select "Every 30 minutes" (value '30')
    await imagePathsPage.selectScanFrequency('30');

    // Fill in path name 'test_valid_directory'
    await imagePathsPage.fillPathName('test_valid_directory');

    // Save the path
    await imagePathsPage.clickSave();

    // Wait for redirect and navigation
    await imagePathsPage.page.waitForTimeout(1000);

    // Navigate back to index page
    await imagePathsPage.goto();
    await imagePathsPage.page.waitForLoadState('networkidle');

    // Verify status indicator appears on path card
    const hasStatusIndicator = await imagePathsPage.hasAutoScanStatusIndicator('test_valid_directory');
    expect(hasStatusIndicator).toBe(true);

    // Get status text and verify it shows auto-scan info
    const statusText = await imagePathsPage.getAutoScanStatusText('test_valid_directory');
    expect(statusText.toLowerCase()).toMatch(/scans every|30 minutes|due|scanning|pending/);

    // Navigate to edit page
    await imagePathsPage.clickAdjustDeleteFirst();
    await imagePathsPage.clickEditThisPath();
    await imagePathsPage.page.waitForLoadState('networkidle');

    // Verify dropdown shows saved value '30'
    const savedFrequency = await imagePathsPage.getScanFrequency();
    expect(savedFrequency).toBe('30');
  });
});
