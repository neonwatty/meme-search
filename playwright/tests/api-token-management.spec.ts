import { test, expect } from '@playwright/test';
import { ApiTokensPage } from '../pages/settings/api-tokens.page';
import { resetTestDatabase } from '../utils/db-setup';

test.describe('API token management', () => {
  test.beforeEach(async () => {
    await resetTestDatabase();
  });

  test('API token is shown once, hidden on refresh, listed, and revoked', async ({ page }) => {
    const tokensPage = new ApiTokensPage(page);
    const clientName = `Browser extension ${Date.now()}`;

    await tokensPage.goto();
    await expect(tokensPage.heading).toBeVisible();
    await expect(page.getByRole('link', { name: 'API tokens' })).toBeVisible();
    await expect(page.getByText('Official support is loopback-only')).toBeVisible();
    await expect(page.getByText('they do not authenticate this settings page')).toBeVisible();

    const rawToken = await tokensPage.create(clientName);
    expect(rawToken).toMatch(/^ms_[A-Za-z0-9_-]{43}$/);
    await expect(tokensPage.rowFor(clientName)).toContainText('active');

    await page.goto('/');
    await page.goBack();
    await expect(page.locator('#api-token-one-time-secret')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(rawToken);

    await page.reload();
    await expect(page.locator('#api-token-one-time-secret')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(rawToken);
    await expect(tokensPage.rowFor(clientName)).toContainText('search:read');
    await expect(tokensPage.rowFor(clientName)).toContainText('media:read');

    await tokensPage.revoke(clientName);
    await expect(tokensPage.rowFor(clientName)).toContainText('revoked');
    await expect(tokensPage.rowFor(clientName).getByRole('button', { name: 'Revoke' })).toHaveCount(0);
  });

  test('API token creation requires a scope and renders errors safely', async ({ page }) => {
    const tokensPage = new ApiTokensPage(page);

    await tokensPage.goto();
    await tokensPage.clientName.fill('<script>alert("token")</script>');
    await tokensPage.searchScope.uncheck();
    await tokensPage.mediaScope.uncheck();
    await tokensPage.createButton.click();

    await expect(page.locator('#api-token-errors')).toContainText('Scopes must include at least one read scope');
    await expect(page.locator('script', { hasText: 'alert("token")' })).toHaveCount(0);
    await expect(page.locator('#api-token-one-time-secret')).toHaveCount(0);
  });

  test('one-time token copy reports success without changing redisplay behavior', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => sessionStorage.setItem('copied-api-token', text),
        },
      });
    });
    const tokensPage = new ApiTokensPage(page);

    await tokensPage.goto();
    const rawToken = await tokensPage.create(`Clipboard success ${Date.now()}`);
    await tokensPage.copyButton.click();

    await expect(tokensPage.copyStatus).toHaveText('Token copied.');
    expect(await page.evaluate(() => sessionStorage.getItem('copied-api-token'))).toBe(rawToken);

    await page.reload();
    await expect(page.locator('#api-token-one-time-secret')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(rawToken);
  });

  test('clipboard failure keeps a focused manual-selection fallback', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('denied');
          },
        },
      });
    });
    const tokensPage = new ApiTokensPage(page);

    await tokensPage.goto();
    const rawToken = await tokensPage.create(`Clipboard fallback ${Date.now()}`);
    await tokensPage.copyButton.click();

    await expect(tokensPage.copyStatus).toHaveText(
      'Copy failed. Select the token above and copy it manually.',
    );
    await expect(tokensPage.oneTimeSecret).toBeFocused();
    await expect(tokensPage.oneTimeSecret).toHaveText(rawToken);
  });
});

test.describe('API token expiry in a non-UTC browser', () => {
  test.use({ timezoneId: 'America/Phoenix' });

  test.beforeEach(async () => {
    await resetTestDatabase();
  });

  test('converts browser-local expiry to an exact UTC instant', async ({ page }) => {
    const tokensPage = new ApiTokensPage(page);
    await tokensPage.goto();
    await tokensPage.clientName.fill(`Phoenix expiry ${Date.now()}`);
    await tokensPage.expiry.fill('2030-01-15T12:30');

    const createRequest = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/settings/api_tokens'),
    );
    await tokensPage.createButton.click();
    const request = await createRequest;
    const form = new URLSearchParams(request.postData() || '');

    expect(form.get('api_token[expires_at_local]')).toBe('2030-01-15T12:30');
    expect(form.get('api_token[expires_at]')).toBe('2030-01-15T19:30:00.000Z');
    await expect(tokensPage.oneTimeSecret).toBeVisible();
    await expect(tokensPage.rowFor(/Phoenix expiry/.source)).toContainText('15 Jan 19:30');
  });
});
