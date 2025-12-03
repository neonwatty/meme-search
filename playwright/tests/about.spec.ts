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

    // Check for README link for Discord (replaces direct Discord link)
    const readmeDiscordLink = page.locator('a[href="https://github.com/neonwatty/meme-search#discord-server"]');
    await expect(readmeDiscordLink).toBeVisible();
    await expect(readmeDiscordLink).toHaveText(/README\.md/);
  });

  test('displays Discord community section', async ({ page }) => {
    // Check for Discord community div (no longer a link)
    const discordSection = page.locator('div.inline-flex:has-text("Discord Community")');
    await expect(discordSection).toBeVisible();
    await expect(discordSection).toHaveText(/Discord Community/);
  });

  test('Discord community section has correct styling', async ({ page }) => {
    // Locate the Discord section (now a div, not a link)
    const discordSection = page.locator('div.inline-flex.px-6.py-3');

    // Check that section is visible
    await expect(discordSection).toBeVisible();

    // Check that section has white/slate background (check classes)
    const classes = await discordSection.getAttribute('class');
    expect(classes).toContain('bg-white');
    expect(classes).toContain('dark:bg-slate-700');

    // Check for border styling
    expect(classes).toContain('border-2');

    // Check for rounded corners
    expect(classes).toContain('rounded-lg');
  });

  test('README link has correct attributes', async ({ page }) => {
    // Target the README link for Discord
    const readmeLink = page.locator('a[href="https://github.com/neonwatty/meme-search#discord-server"]');

    // Check target="_blank" for opening in new tab
    await expect(readmeLink).toHaveAttribute('target', '_blank');

    // Check rel="noopener noreferrer" for security
    await expect(readmeLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('Discord section includes Discord logo icon', async ({ page }) => {
    // Check for SVG icon inside the Discord section
    const discordSection = page.locator('div.inline-flex.px-6.py-3');
    const icon = discordSection.locator('svg');

    await expect(icon).toBeVisible();

    // Check that it's the Discord logo by checking for the path element
    const iconPath = icon.locator('path');
    await expect(iconPath).toBeVisible();
  });

  test('displays Discord subtext with README link', async ({ page }) => {
    // Check for the descriptive text below the Discord section
    const subtext = page.locator('text=For the latest Discord invite link');
    await expect(subtext).toBeVisible();
  });
});
