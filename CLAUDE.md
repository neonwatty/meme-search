# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meme Search is a self-hosted AI-powered meme search engine with a microservices architecture:
- **Rails Application** (`meme_search_pro/meme_search_app`) - Main web app on port 3000
- **Python Image-to-Text Service** (`meme_search_pro/image_to_text_generator`) - AI inference service on port 8000
- **PostgreSQL with pgvector** - Database with vector similarity search

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
