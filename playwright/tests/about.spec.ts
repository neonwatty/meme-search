import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the About page before each test
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
  });

  test('displays page title and version', async ({ page }) => {
    // Check for main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('About Meme Search');

    // Check for version section
    const versionSection = page.locator('text=Current version:');
    await expect(versionSection).toBeVisible();
  });

  test('displays all navigation links', async ({ page }) => {
    // Check for GitHub link
    const githubLink = page.locator('a[href="https://github.com/neonwatty/meme-search"]');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveText(/View on GitHub/);

    // Check for neonwatty link
    const neonwattyLink = page.locator('a[href="https://neonwatty.com/"]');
    await expect(neonwattyLink).toBeVisible();
    await expect(neonwattyLink).toHaveText(/Built by @neonwatty/);

    // Check for issues link
    const issuesLink = page.locator('a[href="https://github.com/neonwatty/meme-search/issues"]');
    await expect(issuesLink).toBeVisible();
  });

  test('displays newsletter subscribe button', async ({ page }) => {
    // Check for newsletter subscribe button
    const subscribeButton = page.locator('a[href="https://neonwatty.com/newsletter/"]');
    await expect(subscribeButton).toBeVisible();
    await expect(subscribeButton).toHaveText(/Subscribe for occasional updates/);
  });

  test('newsletter subscribe button has correct styling', async ({ page }) => {
    // Locate the newsletter button
    const subscribeButton = page.locator('a[href="https://neonwatty.com/newsletter/"]');

    // Check that button is visible
    await expect(subscribeButton).toBeVisible();

    // Check that button has purple/fuchsia gradient background (check classes)
    const classes = await subscribeButton.getAttribute('class');
    expect(classes).toContain('bg-gradient-to-r');
    expect(classes).toContain('from-purple-600');
    expect(classes).toContain('to-fuchsia-600');

    // Check for border styling
    expect(classes).toContain('border-2');

    // Check for rounded corners
    expect(classes).toContain('rounded-lg');
  });

  test('newsletter subscribe button has correct attributes', async ({ page }) => {
    const subscribeButton = page.locator('a[href="https://neonwatty.com/newsletter/"]');

    // Check target="_blank" for opening in new tab
    await expect(subscribeButton).toHaveAttribute('target', '_blank');

    // Check rel="noopener noreferrer" for security
    await expect(subscribeButton).toHaveAttribute('rel', 'noopener noreferrer');

    // Check href points to correct URL
    await expect(subscribeButton).toHaveAttribute('href', 'https://neonwatty.com/newsletter/');
  });

  test('newsletter button includes envelope icon', async ({ page }) => {
    // Check for SVG icon inside the subscribe button
    const subscribeButton = page.locator('a[href="https://neonwatty.com/newsletter/"]');
    const icon = subscribeButton.locator('svg');

    await expect(icon).toBeVisible();

    // Check that it's the envelope/mail icon by checking for the path element
    const iconPath = icon.locator('path');
    await expect(iconPath).toBeVisible();
  });

  test('displays newsletter subtext', async ({ page }) => {
    // Check for the descriptive text below the button
    const subtext = page.locator('text=Get notified about new features and releases');
    await expect(subtext).toBeVisible();
  });

  test('newsletter button hover state works', async ({ page }) => {
    const subscribeButton = page.locator('a[href="https://neonwatty.com/newsletter/"]');

    // Get initial bounding box
    const initialBox = await subscribeButton.boundingBox();
    expect(initialBox).not.toBeNull();

    // Hover over button
    await subscribeButton.hover();

    // Wait a moment for transition
    await page.waitForTimeout(200);

    // Button should still be visible after hover
    await expect(subscribeButton).toBeVisible();
  });
});
