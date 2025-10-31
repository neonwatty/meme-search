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

This project uses [Playwright](https://playwright.dev/) with TypeScript for end-to-end testing. Playwright tests are incrementally replacing Capybara system tests.

#### Running Playwright Tests

```bash
# From project root directory

# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
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
│   ├── image-to-texts.spec.ts
│   └── ... (more tests)
├── pages/              # Page Object Model classes
│   └── settings/
│       └── image-to-texts.page.ts
└── utils/              # Test utilities
    └── db-setup.ts     # Database reset/seed helpers
```

#### Page Object Model Pattern

Tests use the Page Object Model (POM) pattern to separate test logic from page interactions:

**Page Object** (`playwright/pages/settings/image-to-texts.page.ts`):
```typescript
export class ImageToTextsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings/image_to_texts');
    await this.page.waitForLoadState('networkidle');
  }

  async selectModel(modelId: number): Promise<void> {
    const label = this.page.locator(`label[for='${modelId}']`);
    await label.click();
    await this.page.waitForTimeout(500);
  }
}
```

**Test Spec** (`playwright/tests/image-to-texts.spec.ts`):
```typescript
test('updating the current model', async ({ page }) => {
  await imageToTextsPage.goto();
  await imageToTextsPage.selectModel(2);
  expect(await imageToTextsPage.isModelSelected(2)).toBe(true);
});
```

#### Database Management for Tests

Playwright tests use a dedicated test database seeding strategy:

**Rails Rake Tasks** (available in `meme_search_pro/meme_search_app`):
```bash
mise exec -- bin/rails db:test:reset_and_seed  # Reset and seed test DB
mise exec -- bin/rails db:test:seed            # Seed only
mise exec -- bin/rails db:test:clean           # Clean test DB
```

**TypeScript Helper** (`playwright/utils/db-setup.ts`):
```typescript
import { resetTestDatabase } from '../utils/db-setup';

test.beforeEach(async ({ page }) => {
  await resetTestDatabase();  // Runs rake db:test:reset_and_seed
  // ... test setup
});
```

**Seed Data** (`db/seeds/test_seed.rb`):
- Creates fixture-equivalent data for all 5 models:
  - ImageToText (5 models: Florence-2-base [default], Florence-2-large, SmolVLM-256M, SmolVLM-500M, moondream2)
  - ImagePath (2 paths: example_memes_1, example_memes_2)
  - TagName (2 tags: tag_one, tag_two)
  - ImageCore (4 images with descriptions)

#### Prerequisites

**Rails Server**: Tests require Rails server running in test mode on port 3000:
```bash
cd meme_search_pro/meme_search_app
mise exec -- bin/rails server -e test -p 3000
```

**Playwright Browsers**: Install browsers (one-time):
```bash
npx playwright install --with-deps chromium
```

#### Configuration

**`playwright.config.ts`**:
- Base URL: `http://localhost:3000` (configurable via `BASE_URL` env var)
- Workers: 1 (sequential execution for database consistency)
- Fully Parallel: false (required for shared test database)
- Browsers: Chromium only (1400x1400 viewport to match Capybara)
- Web Server: Auto-starts Rails server in test mode (disabled in CI)

**`tsconfig.json`**: TypeScript configuration for test code

#### Troubleshooting

**"Cannot connect to localhost:3000"**:
- Ensure Rails test server is running: `mise exec -- bin/rails server -e test`
- Check that port 3000 is not in use by another process

**"Database errors during tests"**:
- Reset test database: `cd meme_search_pro/meme_search_app && mise exec -- bin/rails db:test:reset_and_seed`
- Verify PostgreSQL is running: `docker compose up -d`

**"Ruby version errors in db-setup.ts"**:
- Ensure mise is activated in your shell
- `db-setup.ts` uses `mise exec --` to ensure correct Ruby version

**"Tests timeout or hang"**:
- Check for JavaScript errors in browser console (run with `--headed`)
- Increase timeout in `playwright.config.ts` if needed
- Verify network idle state is reached (check for long-running requests)

#### Migration Status

**Migrated Tests** (4/15 = 27%):
- ✅ `image_to_texts_test.rb` → `image-to-texts.spec.ts` (3 tests)
- ✅ `tag_names_test.rb` → `tag-names.spec.ts` (1 test)

**Pending Migrations**:
- ⏳ `image_paths_test.rb` → `image-paths.spec.ts` (1 test)
- ⏳ `image_cores_test.rb` → `image-cores.spec.ts` (2 tests)
- ⏳ `search_test.rb` → `search.spec.ts` (3 tests)
- ⏳ `index_filter_test.rb` → `index-filter.spec.ts` (5 tests)

**Both frameworks coexist**: Capybara system tests remain functional during incremental migration.

**Migration Plan**: See `plans/playwright-migration-next-steps.md` for detailed roadmap.

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
