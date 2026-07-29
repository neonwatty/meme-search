import type { Locator, Page } from '@playwright/test';

export class ApiTokensPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly clientName: Locator;
  readonly searchScope: Locator;
  readonly mediaScope: Locator;
  readonly expiry: Locator;
  readonly createButton: Locator;
  readonly oneTimeSecret: Locator;
  readonly copyButton: Locator;
  readonly copyStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'API tokens', level: 1 });
    this.clientName = page.getByLabel('Client name');
    this.searchScope = page.locator('#api_token_scope_search_read');
    this.mediaScope = page.locator('#api_token_scope_media_read');
    this.expiry = page.getByLabel('Expires at (your local time, optional)');
    this.createButton = page.getByRole('button', { name: 'Create API token' });
    this.oneTimeSecret = page.locator('#api-token-one-time-secret code');
    this.copyButton = page.getByRole('button', { name: 'Copy token' });
    this.copyStatus = page.locator('[data-api-token-secret-target="status"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings/api_tokens');
    await this.page.waitForLoadState('networkidle');
  }

  async create(name: string): Promise<string> {
    await this.clientName.fill(name);
    await this.createButton.click();
    await this.oneTimeSecret.waitFor({ state: 'visible' });
    return (await this.oneTimeSecret.textContent())?.trim() || '';
  }

  rowFor(name: string): Locator {
    return this.page.locator('tr', { hasText: name });
  }

  async revoke(name: string): Promise<void> {
    const row = this.rowFor(name);
    this.page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Revoke' }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
