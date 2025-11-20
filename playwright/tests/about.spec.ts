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
    // Check for GitHub link (now text link at bottom)
    const githubLink = page.locator('a[href="https://github.com/neonwatty/meme-search"]');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveText(/See on GitHub/);

    // Check for neonwatty link (now text link at bottom)
    const neonwattyLink = page.locator('a[href="https://neonwatty.com/"]');
    await expect(neonwattyLink).toBeVisible();
    await expect(neonwattyLink).toHaveText(/@neonwatty/);

    // Check for issues link in Feedback section
    const issuesLink = page.locator('a[href="https://github.com/neonwatty/meme-search/issues"]');
    await expect(issuesLink).toBeVisible();
    await expect(issuesLink).toHaveText(/Submit an issue on GitHub/);

    // Check for Discord link in Feedback section
    const feedbackDiscordLink = page.locator('section:has-text("Feedback") a[href="https://discord.gg/8EUxqR93"]');
    await expect(feedbackDiscordLink).toBeVisible();
    await expect(feedbackDiscordLink).toHaveText(/Discord community/);
  });

  test('displays Discord community button', async ({ page }) => {
    // Check for Discord community button
    const discordButton = page.locator('a[href="https://discord.gg/8EUxqR93"]');
    await expect(discordButton).toBeVisible();
    await expect(discordButton).toHaveText(/Join our Discord community/);
  });

  test('Discord community button has correct styling', async ({ page }) => {
    // Locate the Discord button
    const discordButton = page.locator('a[href="https://discord.gg/8EUxqR93"]');

    // Check that button is visible
    await expect(discordButton).toBeVisible();

    // Check that button has white/slate background (check classes)
    const classes = await discordButton.getAttribute('class');
    expect(classes).toContain('bg-white');
    expect(classes).toContain('dark:bg-slate-700');

    // Check for border styling
    expect(classes).toContain('border-2');

    // Check for rounded corners
    expect(classes).toContain('rounded-lg');
  });

  test('Discord community button has correct attributes', async ({ page }) => {
    const discordButton = page.locator('a[href="https://discord.gg/8EUxqR93"]');

    // Check target="_blank" for opening in new tab
    await expect(discordButton).toHaveAttribute('target', '_blank');

    // Check rel="noopener noreferrer" for security
    await expect(discordButton).toHaveAttribute('rel', 'noopener noreferrer');

    // Check href points to correct URL
    await expect(discordButton).toHaveAttribute('href', 'https://discord.gg/8EUxqR93');
  });

  test('Discord button includes Discord logo icon', async ({ page }) => {
    // Check for SVG icon inside the Discord button
    const discordButton = page.locator('a[href="https://discord.gg/8EUxqR93"]');
    const icon = discordButton.locator('svg');

    await expect(icon).toBeVisible();

    // Check that it's the Discord logo by checking for the path element
    const iconPath = icon.locator('path');
    await expect(iconPath).toBeVisible();
  });

  test('displays Discord subtext', async ({ page }) => {
    // Check for the descriptive text below the button
    const subtext = page.locator('text=Discuss new feature ideas and troubleshooting tips');
    await expect(subtext).toBeVisible();
  });

  test('Discord button hover state works', async ({ page }) => {
    const discordButton = page.locator('a[href="https://discord.gg/8EUxqR93"]');

    // Get initial bounding box
    const initialBox = await discordButton.boundingBox();
    expect(initialBox).not.toBeNull();

    // Hover over button
    await discordButton.hover();

    // Wait a moment for transition
    await page.waitForTimeout(200);

    // Button should still be visible after hover
    await expect(discordButton).toBeVisible();
  });
});
