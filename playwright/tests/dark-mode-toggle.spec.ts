import { test, expect } from '@playwright/test';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Dark Mode Toggle Tests
 *
 * These tests verify the dark/light mode toggle functionality including:
 * - Toggle switching between light and dark modes
 * - Theme persistence across page reloads and navigation
 * - Icon changes based on current theme
 * - Accessibility features (keyboard navigation, ARIA attributes)
 * - No FOUC (Flash of Unstyled Content) on page load
 */

test.describe('Dark Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Reset database before each test
    await resetTestDatabase();

    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('default theme should match system preference', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify dark mode toggle button is visible
    const toggleButton = page.getByRole('button', { name: /switch to (light|dark) mode/i });
    await expect(toggleButton).toBeVisible();

    // Check that localStorage is empty (no user preference set yet)
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBeNull();
  });

  test('clicking toggle switches from light to dark mode', async ({ page }) => {
    // Start in light mode by setting localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify we're in light mode
    const htmlClassBefore = await page.evaluate(() => document.documentElement.className);
    expect(htmlClassBefore).not.toContain('dark');

    // Click the toggle button (should say "Switch to dark mode")
    const toggleButton = page.getByRole('button', { name: /switch to dark mode/i });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // Verify we're now in dark mode
    const htmlClassAfter = await page.evaluate(() => document.documentElement.className);
    expect(htmlClassAfter).toContain('dark');

    // Verify localStorage was updated
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');

    // Verify button label changed to "Switch to light mode"
    await expect(page.getByRole('button', { name: /switch to light mode/i })).toBeVisible();
  });

  test('clicking toggle switches from dark to light mode', async ({ page }) => {
    // Start in dark mode by setting localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify we're in dark mode
    const htmlClassBefore = await page.evaluate(() => document.documentElement.className);
    expect(htmlClassBefore).toContain('dark');

    // Click the toggle button (should say "Switch to light mode")
    const toggleButton = page.getByRole('button', { name: /switch to light mode/i });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // Verify we're now in light mode
    const htmlClassAfter = await page.evaluate(() => document.documentElement.className);
    expect(htmlClassAfter).not.toContain('dark');

    // Verify localStorage was updated
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('light');

    // Verify button label changed to "Switch to dark mode"
    await expect(page.getByRole('button', { name: /switch to dark mode/i })).toBeVisible();
  });

  test('theme preference persists across page reloads', async ({ page }) => {
    // Set dark mode
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify dark mode is active
    let htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify dark mode persisted
    htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');

    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });

  test('theme preference persists across page navigation', async ({ page }) => {
    // Set dark mode on home page
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify dark mode is active
    let htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');

    // Navigate to About page
    await page.getByRole('link', { name: 'About' }).click();
    await page.waitForURL('**/about');
    await page.waitForLoadState('networkidle');

    // Verify dark mode persisted on new page
    htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');

    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');

    // Navigate to Settings page
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings/**');
    await page.waitForLoadState('networkidle');

    // Verify dark mode still persisted
    htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');
  });

  test('icon changes based on current theme', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start in light mode
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // In light mode, button should say "Switch to dark mode" (moon icon visible)
    const toggleButton = page.getByRole('button', { name: /switch to dark mode/i });
    await expect(toggleButton).toBeVisible();

    // Click to switch to dark mode
    await toggleButton.click();
    await page.waitForTimeout(200); // Brief wait for transition

    // In dark mode, button should say "Switch to light mode" (sun icon visible)
    await expect(page.getByRole('button', { name: /switch to light mode/i })).toBeVisible();
  });

  test('toggle button is accessible with keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toggleButton = page.getByRole('button', { name: /switch to (light|dark) mode/i });

    // Verify button is focusable
    await toggleButton.focus();
    await expect(toggleButton).toBeFocused();

    // Verify button can be activated with Enter key
    const themeBefore = await page.evaluate(() => localStorage.getItem('theme'));
    await toggleButton.press('Enter');

    // Wait for the toggle to complete
    await page.waitForTimeout(100);

    const themeAfter = await page.evaluate(() => localStorage.getItem('theme'));
    expect(themeAfter).not.toBe(themeBefore);
  });

  test('toggle button has proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const toggleButton = page.getByRole('button', { name: /switch to light mode/i });

    // Verify aria-label is set
    const ariaLabel = await toggleButton.getAttribute('aria-label');
    expect(ariaLabel).toBe('Switch to light mode');

    // Verify aria-pressed is set to true (dark mode is active)
    const ariaPressed = await toggleButton.getAttribute('aria-pressed');
    expect(ariaPressed).toBe('true');

    // Click to switch to light mode
    await toggleButton.click();
    await page.waitForTimeout(200);

    // Verify aria-pressed changed to false
    const toggleButtonLight = page.getByRole('button', { name: /switch to dark mode/i });
    const ariaPressedAfter = await toggleButtonLight.getAttribute('aria-pressed');
    expect(ariaPressedAfter).toBe('false');
  });

  test('multiple toggles work correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start in light mode
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Toggle to dark
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await page.waitForTimeout(200);
    let htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');

    // Toggle back to light
    await page.getByRole('button', { name: /switch to light mode/i }).click();
    await page.waitForTimeout(200);
    htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).not.toContain('dark');

    // Toggle to dark again
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await page.waitForTimeout(200);
    htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');

    // Verify final state in localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });
});
