# Playwright E2E Testing Guide

**Framework**: [Playwright](https://playwright.dev/) with TypeScript
**Pattern**: Page Object Model (POM)
**Test Count**: 16 tests across 6 files
**Status**: ✅ Production-ready

---

## Table of Contents

- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Page Object Model](#page-object-model)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

---

## Quick Start

### Prerequisites

1. **Rails server running** in test mode:
   ```bash
   cd meme_search/meme_search_app
   mise exec -- bin/rails server -e test -p 3000
   ```

2. **PostgreSQL running** (via Docker):
   ```bash
   docker compose up -d
   ```

3. **Playwright browsers installed** (one-time):
   ```bash
   npx playwright install --with-deps chromium
   ```

### Run All Tests

```bash
# From project root
npm run test:e2e
```

Expected output:
```
16 passed (1.3m)
```

---

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### Specific Test File

```bash
npm run test:e2e -- search.spec.ts
```

### Specific Test by Name

```bash
npm run test:e2e -- --grep "keyword search"
```

### Interactive UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

This opens Playwright's interactive UI where you can:
- Run tests with live preview
- Step through tests
- Inspect locators
- View traces

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug Mode (Step-by-Step)

```bash
npm run test:e2e:debug
```

This pauses at the first line and allows you to:
- Step through code
- Evaluate expressions
- Inspect page state

### Generate Test Code

```bash
npm run test:e2e:codegen
```

Opens a browser where your actions are recorded as Playwright code.

### View Test Report

```bash
npm run test:e2e:report
```

Opens the HTML report from the last test run.

---

## Writing Tests

### File Structure

```
playwright/
├── pages/              # Page Object Model classes
│   ├── settings/
│   │   ├── image-to-texts.page.ts
│   │   ├── tag-names.page.ts
│   │   └── image-paths.page.ts
│   ├── image-cores.page.ts
│   ├── search.page.ts
│   └── index-filter.page.ts
├── tests/              # Test specs
│   ├── image-to-texts.spec.ts
│   ├── tag-names.spec.ts
│   ├── image-paths.spec.ts
│   ├── image-cores.spec.ts
│   ├── search.spec.ts
│   └── index-filter.spec.ts
├── utils/              # Test utilities
│   └── db-setup.ts     # Database reset helpers
└── README.md           # This file
```

### Creating a New Test

**Step 1: Create a Page Object**

**File**: `playwright/pages/your-feature.page.ts`

```typescript
import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Your Feature
 *
 * Encapsulates all interactions with the Your Feature page.
 */
export class YourFeaturePage {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly submitButton: Locator;
  readonly formInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.heading = page.locator('h1');
    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.formInput = page.locator('#input-field');
  }

  /**
   * Navigate to the feature page
   */
  async goto(): Promise<void> {
    await this.page.goto('/your-feature');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill and submit the form
   */
  async submitForm(value: string): Promise<void> {
    await this.formInput.fill(value);
    await this.submitButton.click();

    // Wait for Turbo Stream updates
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }
}
```

**Step 2: Create a Test Spec**

**File**: `playwright/tests/your-feature.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { YourFeaturePage } from '../pages/your-feature.page';
import { resetTestDatabase } from '../utils/db-setup';

/**
 * Your Feature Tests
 *
 * Test suite for Your Feature functionality.
 * Migrated from: test/system/your_feature_test.rb (if applicable)
 */
test.describe('Your Feature', () => {
  let featurePage: YourFeaturePage;

  // Reset database and initialize page object before each test
  test.beforeEach(async ({ page }) => {
    // Reset test database with fixture data
    await resetTestDatabase();

    // Initialize page object
    featurePage = new YourFeaturePage(page);

    // Navigate to page
    await featurePage.goto();
  });

  test('should submit form successfully', async ({ page }) => {
    // Arrange
    const testValue = 'test input';

    // Act
    await featurePage.submitForm(testValue);

    // Assert
    await expect(featurePage.heading).toHaveText('Success');
  });

  test('should show validation error for empty input', async ({ page }) => {
    await featurePage.submitForm('');

    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Input is required');
  });
});
```

---

## Page Object Model

### Why Use Page Objects?

**Benefits**:
- ✅ Separates test logic from page interactions
- ✅ Reusable across multiple tests
- ✅ Single source of truth for selectors
- ✅ Easier to maintain when UI changes
- ✅ Self-documenting with JSDoc comments

### Page Object Structure

```typescript
export class FeaturePage {
  readonly page: Page;

  // 1. Locators (readonly, initialized in constructor)
  readonly element: Locator;

  constructor(page: Page) {
    this.page = page;
    // 2. Initialize locators
    this.element = page.locator('#id');
  }

  // 3. Navigation methods
  async goto(): Promise<void> {
    await this.page.goto('/path');
    await this.page.waitForLoadState('networkidle');
  }

  // 4. Action methods
  async performAction(): Promise<void> {
    await this.element.click();
    await this.page.waitForTimeout(500); // For Turbo Streams
  }

  // 5. Assertion helper methods
  async isVisible(): Promise<boolean> {
    return await this.element.isVisible();
  }
}
```

### Locator Best Practices

**Priority Order** (most semantic to least):

1. **Role-based** (best):
   ```typescript
   page.getByRole('button', { name: 'Submit' })
   ```

2. **Label-based**:
   ```typescript
   page.getByLabel('Email address')
   ```

3. **Text-based**:
   ```typescript
   page.getByText('Click here')
   ```

4. **Data attribute**:
   ```typescript
   page.locator('[data-testid="submit-btn"]')
   ```

5. **ID** (acceptable):
   ```typescript
   page.locator('#submit-btn')
   ```

6. **CSS selector** (last resort):
   ```typescript
   page.locator('.btn.btn-primary')
   ```

**Example**: Finding a checkbox inside a container
```typescript
// ❌ Wrong - won't work if checkbox is in a container div
const checkbox = page.locator('#container');
await checkbox.check();

// ✅ Correct - find the input element
const checkbox = page.locator('#container input[type="checkbox"]');
await checkbox.check();
```

---

## Best Practices

### 1. Database Management

**Always reset database** before each test:

```typescript
test.beforeEach(async ({ page }) => {
  await resetTestDatabase();  // Creates fresh test data
  // ... rest of setup
});
```

**Why?** Ensures test isolation and prevents flaky tests.

### 2. Wait Strategies

**Never use fixed waits** except for Turbo Streams:

```typescript
// ❌ Bad - arbitrary wait
await page.waitForTimeout(3000);

// ✅ Good - wait for network
await page.waitForLoadState('networkidle');

// ✅ Good - wait for element
await element.waitFor({ state: 'visible' });

// ✅ Exception - Turbo Stream updates (Rails-specific)
await page.waitForTimeout(500);  // After actions that trigger Turbo Streams
await page.waitForLoadState('networkidle');
```

### 3. Test Independence

Each test should be **completely independent**:

```typescript
// ❌ Bad - depends on previous test state
test('create item', async () => { /* creates item */ });
test('edit item', async () => { /* assumes item exists */ });

// ✅ Good - each test sets up its own state
test('edit item', async () => {
  await createItem();  // Setup
  await editItem();    // Test
});
```

### 4. Assertions

**Use semantic assertions**:

```typescript
// ❌ Less clear
expect(await element.count()).toBe(3);

// ✅ More clear
await expect(element).toHaveCount(3);

// ✅ Even better - custom helper
const count = await featurePage.getItemCount();
expect(count).toBe(3);
```

### 5. Error Messages

**Add descriptive messages** for debugging:

```typescript
// ❌ Unclear failure
expect(count).toBe(3);

// ✅ Clear failure message
expect(count).toBe(3); // 'Should show 3 items after filtering'
```

### 6. Test Naming

**Use descriptive names**:

```typescript
// ❌ Vague
test('test 1', async () => { });

// ✅ Descriptive
test('should display error message when email is invalid', async () => { });
```

---

## Common Patterns

### Handling Modals/Dialogs

```typescript
export class ModalPage {
  readonly modal: Locator;
  readonly openButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Important: Target the actual dialog, not the wrapper
    this.modal = page.locator('dialog[data-controller-target="dialog"]');
    this.openButton = page.getByRole('button', { name: 'Open' });
    this.closeButton = page.getByRole('button', { name: 'Close' });
  }

  async openModal(): Promise<void> {
    await this.openButton.click();
    await this.page.waitForTimeout(500);  // Animation
    await this.modal.waitFor({ state: 'visible' });
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);  // Animation
    await this.modal.waitFor({ state: 'hidden' });
  }

  async closeWithButton(): Promise<void> {
    await this.closeButton.click();
    await this.page.waitForTimeout(500);
    await this.modal.waitFor({ state: 'hidden' });
  }
}
```

### Checkbox Interactions

```typescript
async selectCheckbox(index: number): Promise<void> {
  // Find the input inside the container
  const checkbox = this.page.locator(`#item_${index} input[type="checkbox"]`);
  await checkbox.check();
  await this.page.waitForTimeout(300);  // State update
}

async unselectCheckbox(index: number): Promise<void> {
  const checkbox = this.page.locator(`#item_${index} input[type="checkbox"]`);
  await checkbox.uncheck();
  await this.page.waitForTimeout(300);
}

async isCheckboxChecked(index: number): Promise<boolean> {
  const checkbox = this.page.locator(`#item_${index} input[type="checkbox"]`);
  return await checkbox.isChecked();
}
```

### Multi-Select Dropdowns

```typescript
async selectFromDropdown(value: string): Promise<void> {
  // Open dropdown
  await this.dropdownToggle.click();
  await this.page.waitForSelector('[data-dropdown-target="options"]:not(.hidden)');

  // Select option
  const option = this.page.locator(`[data-value="${value}"]`);
  await option.click();

  // Close dropdown
  await this.dropdownToggle.click();
  await this.page.waitForTimeout(300);
}
```

### Debounced Input

```typescript
async fillDebouncedSearch(query: string): Promise<void> {
  await this.searchInput.clear();
  await this.searchInput.fill(query);

  // Wait for debounce (300ms) + network request
  await this.page.waitForTimeout(600);
  await this.page.waitForLoadState('networkidle');
}
```

### Handling Browser Dialogs (Alert/Confirm)

```typescript
test('should confirm deletion', async ({ page }) => {
  // Setup dialog handler BEFORE triggering action
  page.once('dialog', dialog => {
    expect(dialog.message()).toBe('Are you sure?');
    dialog.accept();  // or dialog.dismiss()
  });

  // Trigger action that opens dialog
  await featurePage.clickDelete();
});
```

### Form Submission

```typescript
async submitForm(data: Record<string, string>): Promise<void> {
  // Fill all fields
  for (const [fieldId, value] of Object.entries(data)) {
    await this.page.fill(`#${fieldId}`, value);
  }

  // Submit
  await this.submitButton.click();

  // Wait for Turbo Stream response
  await this.page.waitForTimeout(500);
  await this.page.waitForLoadState('networkidle');
}
```

### Counting Elements

```typescript
async getMemeCount(): Promise<number> {
  // Only count visible elements (important for dual grid/list views)
  const cards = this.page.locator('div[id^="image_core_card_"]:visible');
  const count = await cards.count();
  console.log(`Found ${count} meme(s)`);
  return count;
}
```

---

## Debugging

### 1. Run in Headed Mode

See the browser as tests run:

```bash
npm run test:e2e:headed
```

### 2. Run in Debug Mode

Step through tests line-by-line:

```bash
npm run test:e2e:debug
```

Use `await page.pause()` in your test to add a breakpoint.

### 3. Use Playwright Inspector

```typescript
test('debug this', async ({ page }) => {
  await page.goto('/');
  await page.pause();  // Opens Playwright Inspector
  // Inspect locators, try selectors, etc.
});
```

### 4. Screenshot on Failure

Automatically captured in `test-results/`:

```
test-results/
├── my-test-chromium/
│   ├── test-failed-1.png
│   └── video.webm
```

### 5. View Trace

```bash
npx playwright show-trace test-results/my-test-chromium/trace.zip
```

Shows timeline, network requests, console logs, etc.

### 6. Console Logging

```typescript
// In test
console.log(`Current URL: ${page.url()}`);
console.log(`Element count: ${await elements.count()}`);

// In page object
console.log('Opened modal');
console.log(`Selected tag ${index}`);
```

---

## Troubleshooting

### "Timeout waiting for locator"

**Possible causes**:
- Selector is incorrect
- Element doesn't exist
- Element is hidden
- Page hasn't loaded

**Solutions**:
```typescript
// 1. Verify selector in Inspector
await page.pause();

// 2. Check if element exists
const exists = await page.locator('#my-element').count() > 0;
console.log(`Element exists: ${exists}`);

// 3. Wait for page to load
await page.waitForLoadState('networkidle');

// 4. Increase timeout
await element.waitFor({ state: 'visible', timeout: 10000 });
```

### "Test is flaky"

**Possible causes**:
- Race conditions
- Insufficient waiting
- Test interdependence

**Solutions**:
```typescript
// 1. Add explicit waits
await page.waitForTimeout(500);
await page.waitForLoadState('networkidle');

// 2. Wait for specific conditions
await expect(element).toBeVisible();

// 3. Ensure test independence
test.beforeEach(async () => {
  await resetTestDatabase();  // Fresh state
});
```

### "Cannot connect to localhost:3000"

**Solutions**:
```bash
# 1. Start Rails test server
cd meme_search/meme_search_app
mise exec -- bin/rails server -e test -p 3000

# 2. Check port not in use
lsof -i :3000
```

### "Database errors during tests"

**Solutions**:
```bash
# Reset test database
cd meme_search/meme_search_app
mise exec -- bin/rails db:test:reset_and_seed

# Verify PostgreSQL running
docker compose up -d
```

### "Ruby version errors in db-setup.ts"

**Solutions**:
```bash
# Ensure mise is activated
mise doctor

# db-setup.ts uses mise exec automatically
# Verify in db-setup.ts:
# execSync('mise exec -- bin/rails db:test:reset_and_seed')
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically in `.github/workflows/pro-app-test.yml`:

```yaml
playwright-tests:
  runs-on: ubuntu-latest
  steps:
    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium

    - name: Start Rails server
      run: mise exec -- bin/rails server -e test -p 3000 &

    - name: Reset test database
      run: mise exec -- bin/rails db:test:reset_and_seed

    - name: Run Playwright tests
      run: npm run test:e2e

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-results
        path: test-results/
```

### Viewing CI Test Results

1. Go to GitHub Actions tab
2. Click on workflow run
3. Download `playwright-results` artifact
4. View screenshots/videos for failed tests

---

## Examples

### Example 1: Simple CRUD Test

See `playwright/tests/tag-names.spec.ts`:

```typescript
test('create, edit, and delete tag', async ({ page }) => {
  // Create
  await tagPage.fillName('new-tag');
  await tagPage.fillColor('#FF0000');
  await tagPage.clickCreate();
  expect(await tagPage.getTagCount()).toBe(3);

  // Edit
  await tagPage.clickEdit(2);
  await tagPage.fillName('edited-tag');
  await tagPage.clickSave();

  // Delete
  await tagPage.clickDelete(2);
  expect(await tagPage.getTagCount()).toBe(2);
});
```

### Example 2: Search with Debounce

See `playwright/tests/search.spec.ts`:

```typescript
test('keyword search with debounce', async ({ page }) => {
  await searchPage.goto();

  // Debounced search (300ms + network)
  await searchPage.fillSearch('test query');

  const count = await searchPage.getMemeCount();
  expect(count).toBe(2);
});
```

### Example 3: Modal Interaction

See `playwright/tests/index-filter.spec.ts`:

```typescript
test('open and close modal with Escape', async ({ page }) => {
  await filterPage.gotoRoot();

  // Verify modal hidden
  expect(await filterPage.isSlideoverVisible()).toBe(false);

  // Open modal
  await filterPage.openFilters();
  expect(await filterPage.isSlideoverVisible()).toBe(true);

  // Close with Escape
  await filterPage.closeWithEscape();
  expect(await filterPage.isSlideoverVisible()).toBe(false);
});
```

---

## Resources

### Official Documentation
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Locators Guide](https://playwright.dev/docs/locators)

### Internal Resources
- **Coverage Analysis**: `docs/test-coverage-comparison.md`
- **Migration Plan**: `plans/playwright-migration-next-steps.md`
- **Project Docs**: `CLAUDE.md`

### Team Support
- Ask in team Slack channel
- Review existing page objects for examples
- Use Playwright codegen for inspiration

---

## FAQ

**Q: How do I run a single test?**
```bash
npm run test:e2e -- --grep "test name"
```

**Q: How do I see what selectors are available?**
```bash
npm run test:e2e:codegen
# or use page.pause() in your test
```

**Q: Why is my test slow?**
- Database reset takes ~2-3 seconds per test
- This is intentional for test isolation
- Future optimization: use transactions (Phase 3C)

**Q: Can I run tests in parallel?**
- Not currently (workers: 1)
- Tests share a database and must run sequentially
- Future optimization: multiple databases (Phase 3C)

**Q: How do I update screenshots?**
```bash
npm run test:e2e -- --update-snapshots
```

**Q: Where are test artifacts stored?**
- `test-results/` (gitignored)
- Screenshots, videos, traces

---

**Last Updated**: 2025-10-31
**Maintainer**: Development Team
**Status**: Production-ready, all 16 tests passing ✅
