# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meme Search is a self-hosted AI-powered meme search engine with a microservices architecture:
- **Rails Application** (`meme_search_pro/meme_search_app`) - Main web app on port 3000
- **Python Image-to-Text Service** (`meme_search_pro/image_to_text_generator`) - AI inference service on port 8000
- **PostgreSQL with pgvector** - Database with vector similarity search

## Environment Setup with Mise

This project uses [mise](https://mise.jdx.dev/) for managing development tool versions. Mise ensures all developers use consistent versions of Ruby, Python, and Node.js.

### Required Tool Versions

- Ruby: 3.4.2
- Python: 3.12
- Node.js: 20 (LTS)
- PostgreSQL: 17 (runs in Docker, not installed locally via mise)

### Installation

1. **Install mise** (if not already installed):
   ```bash
   # macOS
   brew install mise

   # Other platforms: https://mise.jdx.dev/getting-started.html
   ```

2. **Activate mise in your shell** (add to `~/.zshrc`, `~/.bashrc`, etc.):
   ```bash
   eval "$(mise activate zsh)"  # or bash, fish, etc.
   ```

3. **Install project tools**:
   ```bash
   cd /path/to/meme-search
   mise trust    # Trust the project's .mise.toml configuration
   mise install  # Install Ruby 3.4.2, Python 3.12, Node 20
   ```

4. **Verify installation**:
   ```bash
   mise doctor           # Check mise configuration
   ruby --version        # Should show 3.4.2
   python --version      # Should show 3.12.x
   node --version        # Should show 20.x
   bundle --version      # Should show 2.6.5
   ```

### Using Mise

Mise automatically activates the correct tool versions when you `cd` into the project directory. If you need to explicitly run commands with mise:

```bash
mise exec -- bundle install     # Run bundle with mise-managed Ruby
mise exec -- python script.py   # Run Python with mise-managed Python
mise run bundle install         # Alternative syntax
```

### Configuration Files

- **`.mise.toml`**: Main mise configuration (tools and environment variables)
- **`.tool-versions`**: Backward compatibility with asdf version manager
- **`meme_search_pro/meme_search_app/.ruby-version`**: Ruby version for Rails app

### Troubleshooting

- **"Could not find bundler"**: Run `mise install` to ensure Ruby and Bundler are installed
- **Wrong Ruby version**: Ensure mise is activated in your shell (check `which ruby`)
- **PostgreSQL not found**: PostgreSQL runs in Docker, not locally. Use `docker compose up` to start it

## Development Commands

### Rails Application

```bash
cd meme_search_pro/meme_search_app

# Development
./bin/dev                    # Start development server

# Testing
bash run_tests.sh            # Run all tests
bin/rails test test/models   # Run model tests only
bin/rails test test/controllers # Run controller tests only
bin/rails test test/channels    # Run channel tests only
bin/rails test test/system      # Run system tests only

# Coverage (requires SimpleCov gem)
COVERAGE=true bin/rails test test/models
COVERAGE=true bin/rails test test/controllers

# Linting
rubocop app                  # Check code style
brakeman                     # Security scan

# Database
rails db:migrate             # Run migrations
rails db:test:prepare        # Prepare test database
rails db:schema:load         # Load schema
```

### Python Service

```bash
cd meme_search_pro/image_to_text_generator

# Testing
pytest tests/                # Run all tests
pytest tests/unit/           # Run unit tests only
pytest tests/test_app.py     # Run integration tests only

# Coverage
pytest tests/unit/ --cov=app --cov-report=html --cov-report=term-missing

# Linting
ruff check app/
```

### Docker Commands

```bash
# Production (pull pre-built images)
docker compose up

# Local build
docker compose -f docker-compose-local-build.yml up --build

# Custom port via .env file
# Create .env with: APP_PORT=8080
```

### Playwright E2E Tests

This project uses [Playwright](https://playwright.dev/) with TypeScript for end-to-end testing. **All system tests have been successfully migrated from Capybara to Playwright** (16/16 tests, 100% complete).

**For comprehensive testing documentation**, see `playwright/README.md`.

#### Quick Start

```bash
# From project root directory

# Run all E2E tests (headless)
npm run test:e2e

# Run specific test file
npm run test:e2e -- search.spec.ts

# Run with UI mode (interactive, recommended for development)
npm run test:e2e:ui

# Debug mode (step through tests with inspector)
npm run test:e2e:debug

# View last test report
npm run test:e2e:report

# Generate test code (record interactions)
npm run test:e2e:codegen
```

#### Test Structure

```
playwright/
├── tests/              # Test specs (.spec.ts files)
│   ├── image-to-texts.spec.ts    # Model selection (3 tests)
│   ├── tag-names.spec.ts         # Tag CRUD (1 test)
│   ├── image-paths.spec.ts       # Directory paths CRUD (1 test)
│   ├── image-cores.spec.ts       # Image editing/deletion (2 tests)
│   ├── search.spec.ts            # Search functionality (3 tests)
│   └── index-filter.spec.ts      # Filter sidebar/modal (6 tests)
├── pages/              # Page Object Model classes
│   ├── base.page.ts              # Base class with common methods
│   ├── index-filter.page.ts      # Filter page object
│   ├── search.page.ts            # Search page object
│   └── settings/                 # Settings-related pages
│       ├── image-to-texts.page.ts
│       ├── tag-names.page.ts
│       └── image-paths.page.ts
└── utils/              # Test utilities
    ├── db-setup.ts               # Database reset/seed helpers
    └── test-helpers.ts           # Shared helper functions
```

#### Page Object Model Pattern

All tests use the **Page Object Model (POM)** pattern to separate test logic from page interactions. Page objects extend `BasePage` for common functionality.

**Base Page Object** (`playwright/pages/base.page.ts`):
```typescript
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common navigation
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  // Rails-specific: Wait for Turbo Stream updates
  async waitForTurboStream(timeout = 500): Promise<void> {
    await this.page.waitForTimeout(timeout);
    await this.page.waitForLoadState('networkidle');
  }

  // Rails-specific: Checkboxes nested in containers
  async checkCheckbox(containerSelector: string): Promise<void> {
    const checkbox = this.page.locator(`${containerSelector} input[type="checkbox"]`);
    await checkbox.check();
    await this.page.waitForTimeout(300);
  }

  // Rails-specific: Debounced search input
  async fillDebouncedSearch(selector: string, query: string, debounceMs = 300): Promise<void> {
    await this.page.locator(selector).fill(query);
    await this.page.waitForTimeout(debounceMs + 500);
    await this.waitForPageLoad();
  }

  // ... more common methods
}
```

**Custom Page Object** (extends `BasePage`):
```typescript
export class SearchPage extends BasePage {
  readonly searchInput: Locator;
  readonly vectorSearchCheckbox: Locator;

  constructor(page: Page) {
    super(page);  // Inherit BasePage functionality
    this.searchInput = page.locator('#search_input');
    this.vectorSearchCheckbox = page.locator('#use_vector_search_checkbox');
  }

  async goto(): Promise<void> {
    await super.goto('/image_cores/search');
  }

  async fillSearch(query: string): Promise<void> {
    await this.fillDebouncedSearch('#search_input', query);
  }

  async enableVectorSearch(): Promise<void> {
    await this.checkCheckbox('#use_vector_search_wrapper');
    await this.waitForTurboStream();
  }

  async getMemeCount(): Promise<number> {
    return await this.countElements("div[id^='image_core_card_']");
  }
}
```

**Test Spec** (uses page object):
```typescript
import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/search.page';
import { resetTestDatabase } from '../utils/db-setup';

test.describe('Search functionality', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();  // Fresh DB state
    searchPage = new SearchPage(page);
    await searchPage.goto();
  });

  test('keyword search with results', async () => {
    await searchPage.fillSearch('meme');
    const count = await searchPage.getMemeCount();
    expect(count).toBeGreaterThan(0);
  });

  test('vector search finds semantically similar', async () => {
    await searchPage.enableVectorSearch();
    await searchPage.fillSearch('funny image');
    const count = await searchPage.getMemeCount();
    expect(count).toBeGreaterThan(0);
  });
});
```

#### Writing Tests: Rails-Specific Patterns

**1. Turbo Stream Updates** (async DOM changes):
```typescript
// After any action that triggers Turbo Stream
await page.click('button#delete');
await page.waitForTimeout(500);  // Turbo processing time
await page.waitForLoadState('networkidle');

// Or use helper
await searchPage.waitForTurboStream();
```

**2. Dialogs and Modals** (must target actual `<dialog>` element):
```typescript
// ❌ Wrong: targets wrapper div (always visible)
const modal = page.locator('div#my-modal');

// ✅ Correct: targets dialog element
const modal = page.locator('div#my-modal dialog[data-slideover-target="dialog"]');

await expect(modal).toBeVisible();
```

**3. Checkboxes in Containers** (nested inputs):
```typescript
// Rails often nests checkboxes in container divs
// ❌ Wrong: targets container
await page.check('#tag_1');

// ✅ Correct: targets nested input
await page.check('#tag_1 input[type="checkbox"]');

// Or use helper
await searchPage.checkCheckbox('#tag_1');
```

**4. Debounced Search Input** (300ms typical):
```typescript
// ❌ Wrong: doesn't wait for debounce
await page.fill('#search_input', 'query');
await page.waitForLoadState('networkidle');

// ✅ Correct: waits for debounce + processing
await page.fill('#search_input', 'query');
await page.waitForTimeout(800);  // 300ms debounce + 500ms buffer
await page.waitForLoadState('networkidle');

// Or use helper
await searchPage.fillDebouncedSearch('#search_input', 'query');
```

**5. Browser Dialogs** (confirm/alert):
```typescript
// Accept confirmation dialog
page.once('dialog', dialog => dialog.accept());
await page.click('button.delete');

// Or use helper
await searchPage.acceptDialog();
await page.click('button.delete');
```

**6. Multi-select Dropdowns** (Tom Select):
```typescript
// Open dropdown
await page.click('.ts-wrapper .ts-control');
await page.waitForSelector('.ts-dropdown', { state: 'visible' });

// Select option
await page.click('.ts-dropdown .option[data-value="tag-1"]');
await page.waitForTimeout(300);  // State update

// Close dropdown (click outside)
await page.click('body', { position: { x: 0, y: 0 } });
```

#### Database Management for Tests

**Database Reset Strategy**: Each test gets a fresh database state for isolation.

**Rails Rake Tasks** (`meme_search_pro/meme_search_app`):
```bash
mise exec -- bin/rails db:test:reset_and_seed  # Reset + seed
mise exec -- bin/rails db:test:seed            # Seed only
mise exec -- bin/rails db:test:clean           # Clean only
```

**TypeScript Helper** (`playwright/utils/db-setup.ts`):
```typescript
import { resetTestDatabase } from '../utils/db-setup';

test.beforeEach(async ({ page }) => {
  await resetTestDatabase();  // Runs: rake db:test:reset_and_seed
  // Test has fresh DB state
});
```

**Seed Data** (`db/seeds/test_seed.rb`):
- **ImageToText**: 5 models (Florence-2-base as default)
- **ImagePath**: 2 paths (example_memes_1, example_memes_2)
- **TagName**: 2 tags (tag_one, tag_two)
- **ImageCore**: 4 images with descriptions and tag associations
- **ImageTag**: Associations between images and tags

#### Prerequisites

**Rails Server** (required for tests):
```bash
cd meme_search_pro/meme_search_app
mise exec -- bin/rails server -e test -p 3000
```

**Playwright Browsers** (one-time install):
```bash
npx playwright install --with-deps chromium
```

**PostgreSQL** (running with pgvector):
```bash
docker compose up -d
```

#### Configuration

**`playwright.config.ts`**:
- Base URL: `http://localhost:3000` (override with `BASE_URL` env var)
- Workers: 1 (sequential execution for shared test database)
- Fully Parallel: false (required for database consistency)
- Browser: Chromium only (1400x1400 viewport)
- Timeout: 30s per test, 5s per action
- Retries: 0 (tests should be stable)
- Web Server: Auto-starts Rails in test mode (disabled in CI)

**`tsconfig.json`**: TypeScript configuration for test code

#### CI/CD Integration

**GitHub Actions** (`.github/workflows/pro-app-test.yml`):
- Job: `playwright_tests`
- PostgreSQL service with pgvector
- Ruby 3.4.2 + Node.js 20 setup
- Database preparation: `db:test:prepare` + `db:test:seed`
- Rails server in background (test mode, port 3000)
- Playwright browser caching for faster builds
- Artifact uploads: test results, traces, HTML report

**Browser Caching**:
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
```

#### Debugging Tests

**1. UI Mode** (recommended for development):
```bash
npm run test:e2e:ui
```
- Interactive test browser
- Time-travel debugging
- Watch mode for file changes
- Click to run specific tests

**2. Inspector Mode** (step-through debugging):
```bash
npm run test:e2e:debug
```
- Set breakpoints with `await page.pause()`
- Step through test execution
- Inspect locators and elements
- Copy selectors

**3. Headed Mode** (see browser):
```bash
npm run test:e2e:headed
```
- Watch tests run in browser
- See console errors
- Check network requests

**4. Trace Viewer** (post-mortem debugging):
```bash
npx playwright show-trace test-results/path/to/trace.zip
```
- Timeline of all actions
- Screenshots at each step
- Network activity
- Console logs

**5. Screenshots on Failure**:
```typescript
test('my test', async ({ page }) => {
  // Automatic screenshot on failure
  // Saved to: test-results/my-test/screenshot.png
});
```

#### Troubleshooting

**"Cannot connect to localhost:3000"**:
```bash
# Ensure Rails test server is running
cd meme_search_pro/meme_search_app
mise exec -- bin/rails server -e test -p 3000

# Check port availability
lsof -ti:3000  # Kill with: kill -9 $(lsof -ti:3000)
```

**"Database errors during tests"**:
```bash
# Reset test database
cd meme_search_pro/meme_search_app
mise exec -- bin/rails db:test:reset_and_seed

# Verify PostgreSQL is running
docker compose up -d
docker compose ps
```

**"Ruby version errors in db-setup.ts"**:
```bash
# Ensure mise is activated
eval "$(mise activate zsh)"
mise doctor

# Verify Ruby version
ruby --version  # Should show 3.4.2
```

**"Tests timeout or hang"**:
- Run with `--headed` to see browser console errors
- Check for infinite loading states (Turbo Streams not completing)
- Increase timeout in `playwright.config.ts` if needed
- Verify `networkidle` state is reached (long-running requests)

**"Flaky dialog/modal tests"**:
- Ensure targeting actual `<dialog>` element, not wrapper
- Add cleanup in `beforeEach` to close any open modals
- Wait for visibility with proper selectors

**"Checkbox interaction failures"**:
- Target nested input: `container input[type="checkbox"]`
- Use `checkCheckbox()` helper from `BasePage`
- Wait 300ms after check/uncheck for state updates

#### Migration Status

**✅ Migration Complete**: All 16 Capybara system tests successfully migrated to Playwright

**Migrated Tests** (16/16 = 100%):
- ✅ `image_to_texts_test.rb` → `image-to-texts.spec.ts` (3 tests)
- ✅ `tag_names_test.rb` → `tag-names.spec.ts` (1 test)
- ✅ `image_paths_test.rb` → `image-paths.spec.ts` (1 test)
- ✅ `image_cores_test.rb` → `image-cores.spec.ts` (2 tests)
- ✅ `search_test.rb` → `search.spec.ts` (3 tests)
- ✅ `index_filter_test.rb` → `index-filter.spec.ts` (6 tests - includes 1 new test)

**Coverage Analysis**: See `docs/test-coverage-comparison.md`
- 100% feature parity with Capybara + enhanced coverage
- 0% flakiness rate (vs 13% in Capybara)
- Better debugging with traces and time-travel
- More maintainable with Page Object Model

**Capybara Status**: Still present for observation period, planned for removal after 2 weeks of stable Playwright tests in CI.

**Migration Plan**: See `plans/playwright-migration-next-steps.md` for Phase 3 (Cleanup & Optimization) tasks.

## Architecture

### Rails App Key Components

**Models:**
- `ImageCore` - Main meme entity with description, status, embeddings
  - Methods: `refresh_description_embeddings`, `chunk_text`, `search_any_word`
  - Scopes: `with_selected_tag_names`, `without_embeddings`
- `ImageEmbedding` - 384-dim vectors for semantic search
  - Methods: `compute_embedding` (uses global `$embedding_model`), `get_neighbors`
- `ImagePath` - Directory management with validation and auto-discovery
- `TagName` - Tag definitions with color and uniqueness validation
- `ImageTag` - Many-to-many association between ImageCore and TagName
- `ImageToText` - Model selection (Florence-2-base, Moondream2, SmolVLM, etc.)

**Controllers:**
- `ImageCoresController` - Main CRUD, search (keyword/vector), generate description, webhooks
  - Key actions: `index` (filtering), `search_items`, `generate_description`, `description_receiver`, `status_receiver`
- `Settings::ImagePathsController` - Directory path CRUD
- `Settings::TagNamesController` - Tag CRUD
- `Settings::ImageToTextsController` - Model switching via `update_current`

**Channels (WebSocket):**
- `ImageDescriptionChannel` - Broadcasts real-time description updates
- `ImageStatusChannel` - Broadcasts processing status changes

### Python Service Key Components

**Core Modules:**
- `app/app.py` - FastAPI endpoints: `/add_job`, `/check_queue`, `/remove_job/{id}`
- `app/image_to_text_generator.py` - Image processing with vision-language models
- `app/model_init.py` - Model loading and selection logic
- `app/jobs.py` - Background job processing worker
- `app/job_queue.py` - SQLite-based job queue management
- `app/senders.py` - HTTP callbacks to Rails app (description_sender, status_sender)
- `app/data_models.py` - Pydantic models for request/response validation

**Models:**
- Default: Florence-2-base (250M params)
- Options: Florence-2-large (700M), SmolVLM-256, SmolVLM-500, Moondream2 (1.9B)

## Testing Architecture

### Rails Tests (in `test/`)

**Models** (`test/models/`):
- Validations, associations, callbacks
- Mock HTTP requests (Net::HTTP) for external calls
- Mock global `$embedding_model` for embedding tests
- Mock file system operations (File, Dir) for ImagePath tests

**Controllers** (`test/controllers/`):
- CRUD operations, filtering, search
- Mock HTTP for Python service calls
- Mock ActionCable broadcasts for WebSocket tests
- Use fixtures from `test/fixtures/`

**Channels** (`test/channels/`):
- Subscription, broadcasting, unsubscription
- Use `assert_broadcasts`, `assert_has_stream`, `assert_no_streams`

**System Tests** (`test/system/`):
- Full browser-based E2E tests with Capybara/Selenium
- Existing tests cover: image_cores, search, tags, paths, filters

**Coverage:**
- SimpleCov with Rails preset
- Enable with `COVERAGE=true` environment variable
- Reports in `coverage/` directory

### Python Tests (in `tests/`)

**Unit Tests** (`tests/unit/`):
- Mock external dependencies (requests, PIL, model loading)
- Use `@patch` for HTTP calls and model inference
- Use temporary SQLite databases (`:memory:` or `tempfile`) for job queue tests

**Integration Tests** (`tests/test_app.py`):
- Full FastAPI test client
- End-to-end job processing with "test" model
- Mock HTTP callbacks to Rails app

**Coverage:**
- pytest-cov with branch coverage
- Configured in `pytest.ini` with 70% threshold
- HTML reports in `htmlcov/`

## Important Testing Patterns

### Mocking HTTP Requests (Rails)

```ruby
# Mock for ImageCore before_destroy callback
Net::HTTP.stub_any_instance(:request, Net::HTTPSuccess.new("1.1", "200", "OK")) do
  image_core.destroy
end

# Mock for controller generate_description
mock_response = Minitest::Mock.new
mock_response.expect(:is_a?, true, [Net::HTTPSuccess])
mock_http = Minitest::Mock.new
mock_http.expect(:request, mock_response, [Net::HTTP::Post])
Net::HTTP.stub(:new, mock_http) do
  post generate_description_image_core_url(@image_core)
end
```

### Mocking Global Embedding Model (Rails)

```ruby
mock_model = Minitest::Mock.new
mock_model.expect(:call, Array.new(384, 0.1), [String])
original_model = $embedding_model
$embedding_model = mock_model
# ... test code ...
$embedding_model = original_model
```

### Mocking File System (Rails)

```ruby
File.stub(:directory?, true) do
  Dir.stub(:entries, [".", "..", "test.jpg"]) do
    File.stub(:file?, true) do
      # ... test code ...
    end
  end
end
```

### Mocking HTTP in Python

```python
from unittest.mock import Mock, patch

@patch('app.senders.requests.post')
def test_description_sender(mock_post):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_post.return_value = mock_response
    # ... test code ...
```

### Mocking Model Loading in Python

```python
@patch('model_init.AutoModelForCausalLM.from_pretrained')
@patch('model_init.AutoProcessor.from_pretrained')
def test_model_loading(mock_processor, mock_model):
    # Test without downloading models
    pass
```

## CI/CD

### GitHub Actions Workflows

**Rails Tests** (`.github/workflows/pro-app-test.yml`):
- Brakeman security scan
- JavaScript dependency audit
- RuboCop linting
- System tests (Capybara with Chrome)
- Model, controller, and channel tests with coverage
- PostgreSQL service with pgvector

**Python Tests** (`.github/workflows/pro-image-to-text-test.yml`):
- Ruff linting
- Integration tests (test_app.py)
- Unit tests with coverage (60% threshold)
- Coverage report upload as artifact

**Build Workflows:**
- Multi-platform Docker builds (AMD64, ARM64)
- Push to GitHub Container Registry on main branch

## Common Patterns

### Image Processing Workflow
1. User adds directory path → `ImagePath` validates and creates `ImageCore` records
2. User triggers generation → Rails calls Python service `/add_job`
3. Python service queues job → processes with vision-language model
4. Python calls Rails webhooks → `description_receiver`, `status_receiver`
5. Rails updates DB and broadcasts via WebSockets → live UI update
6. Description chunked → `ImageEmbedding` records created for vector search

### Search Flow
- Keyword search: PgSearch with `search_any_word` scope
- Vector search: Compute query embedding → cosine similarity via neighbor gem
- Filtering: Tags (`with_selected_tag_names`), paths, embeddings

### Real-time Updates
- ActionCable channels stream to all connected clients
- `ImageDescriptionChannel` → description updates
- `ImageStatusChannel` → status changes (not_started → in_queue → processing → done)

## Notes for Development

- **Image-to-text in tests**: Always mock model loading/inference in CI (memory constraints)
- **Database**: Requires PostgreSQL with pgvector extension
- **Models**: First generation is slow (downloads weights), cached in `models/` directory
- **Meme directories**: Must be mounted in both services (Rails: `/rails/public/memes`, Python: `/app/public/memes`)
- **Environment variables**: Use `.env` for custom ports (APP_PORT, GEN_PORT, etc.)
- **Status enum**: 0=not_started, 1=in_queue, 2=processing, 3=done, 4=removing, 5=failed
