# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🤖 Task Agent Usage Guidelines

**IMPORTANT**: Use specialized Task agents liberally for exploration, planning, and research tasks.

### When to Use Task Agents

**Explore Agent** (use `subagent_type=Explore`):
- Understanding codebase structure and architecture
- Finding where features are implemented across multiple files
- Exploring error handling patterns, API endpoints, or design patterns
- Questions like "How does X work?", "Where is Y handled?", "What's the structure of Z?"
- Set thoroughness: `quick` (basic), `medium` (moderate), or `very thorough` (comprehensive)

**Plan Agent** (use `subagent_type=Plan`):
- Breaking down complex feature implementations
- Designing multi-step refactoring approaches
- Planning architectural changes or migrations

**General-Purpose Agent** (use `subagent_type=general-purpose`):
- Multi-step tasks requiring multiple tool invocations
- Documentation lookups via WebSearch/WebFetch
- Complex searches across many files with multiple rounds

### Documentation Lookup Pattern

When encountering unfamiliar libraries, frameworks, or patterns:

1. **Use Task agent with WebSearch/WebFetch** to look up official documentation
2. **Search for**: Rails 8 features, Playwright APIs, Python FastAPI patterns, etc.
3. **Example**: "Look up Rails 8 Turbo Stream documentation to understand real-time updates"

### Examples

```typescript
// ❌ Don't: Manually grep/glob through unfamiliar codebase
grep -r "webhook" .

// ✅ Do: Use Explore agent
Task(subagent_type="Explore",
     prompt="Find all webhook implementations and explain how webhooks work in this Rails+Python microservices architecture",
     thoroughness="medium")

// ❌ Don't: Guess how to implement without research
// Implement feature based on assumptions

// ✅ Do: Use general-purpose agent for documentation lookup
Task(subagent_type="general-purpose",
     prompt="Research Rails 8 ActionCable best practices for WebSocket broadcasting, then summarize the recommended pattern for real-time updates")
```

## Project Overview

Meme Search is a self-hosted AI-powered meme search engine with a microservices architecture:
- **Rails Application** (`meme_search/meme_search_app`) - Main web app on port 3000
- **Python Image-to-Text Service** (`meme_search/image_to_text_generator`) - AI inference service on port 8000
- **PostgreSQL with pgvector** - Database with vector similarity search

## Environment Setup

**Tool Versions** (managed via [mise](https://mise.jdx.dev/)):
- Ruby: 3.4.2 | Python: 3.12 | Node.js: 20 | PostgreSQL: 17 (Docker)

**Quick Setup**:
```bash
brew install mise
eval "$(mise activate zsh)"  # Add to shell config
cd /path/to/meme-search && mise trust && mise install
mise doctor  # Verify setup
```

**Run Commands**: `mise exec -- <command>` or let mise auto-activate when you `cd` into the project

## Development Commands

### Quick Reference

**Unified CI Tests** (from project root):
```bash
npm test                     # All tests (Rails + Python + E2E) ~5-10 min
npm run test:ci:skip-e2e     # Skip E2E for faster feedback ~3-5 min
npm run test:rails           # Rails only
npm run test:python          # Python only
```

**Rails** (`meme_search/meme_search_app`):
```bash
./bin/dev                    # Start dev server
bash run_tests.sh            # All Rails tests
bin/rails test test/models   # Model tests
COVERAGE=true bin/rails test # With coverage
rubocop app && brakeman      # Lint + security scan
```

**Python** (`meme_search/image_to_text_generator`):
```bash
bash run_tests.sh            # All Python tests (lint + integration + unit)
pytest tests/unit/           # Unit tests (88 tests, 81.52% coverage)
ruff check app/              # Lint
```

**Docker**:
```bash
docker compose up                                      # Production (pre-built images)
docker compose -f docker-compose-local-build.yml up   # Local build
```

### Docker E2E Tests

**Purpose**: Validate full microservices stack (Rails + Python + PostgreSQL) in production-like containers. For **local validation before major releases**, not CI/CD (10-15 min builds). See `playwright-docker/README.md` for details.

```bash
npm run test:e2e:docker              # Full test (setup + run + teardown)
npm run test:e2e:docker:setup        # Build + start services
npm run test:e2e:docker:ui           # Interactive UI mode
```

**Docker E2E** (6/7 passing): Tests Docker builds, isolated ports (3001, 5433, 8000)
**CI E2E** (16/16 passing): Tests local services, fast, runs in GitHub Actions

### Playwright E2E Tests (CI)

**16/16 tests passing** (100% migrated from Capybara). Uses Page Object Model pattern. **See `playwright/README.md` for comprehensive docs**.

```bash
npm run test:e2e          # Run all tests
npm run test:e2e:ui       # Interactive UI mode (recommended)
npm run test:e2e:debug    # Step-through debugging
npm run test:e2e:report   # View last report
```

**Rails-Specific Patterns** (common gotchas):
- Turbo Streams: Wait 500ms + `networkidle` after async DOM updates
- Dialogs: Target `dialog[data-slideover-target="dialog"]` not wrapper div
- Checkboxes: Target nested `input[type="checkbox"]` not container
- Debounced inputs: Wait 800ms (300ms debounce + 500ms buffer)
- Database: Each test resets via `resetTestDatabase()` helper

**Structure**: `playwright/tests/` (16 specs), `playwright/pages/` (Page Objects), `playwright/utils/` (helpers).
**Prerequisites**: Rails test server on 3000, PostgreSQL with pgvector, `npx playwright install chromium`.

## Architecture Quick Reference

**Rails Models**: `ImageCore` (main meme entity), `ImageEmbedding` (384-dim vectors), `ImagePath`, `TagName`, `ImageTag`, `ImageToText`
**Rails Controllers**: `ImageCoresController` (CRUD/search/webhooks), `Settings::{ImagePaths,TagNames,ImageToTexts}Controller`
**Rails Channels**: `ImageDescriptionChannel`, `ImageStatusChannel` (WebSocket real-time updates)

**Python FastAPI**: `app/app.py` (/add_job, /check_queue, /remove_job), `app/image_to_text_generator.py` (vision-language models), `app/jobs.py` (background worker), `app/job_queue.py` (SQLite queue), `app/senders.py` (Rails callbacks)
**Python Models**: Florence-2-base (default, 250M), Florence-2-large (700M), SmolVLM-256/500, Moondream2 (1.9B)

## Testing Strategy

**Rails** (`test/`): Models (mock HTTP/`$embedding_model`/File), Controllers (mock HTTP/ActionCable), Channels (`assert_broadcasts`), E2E Playwright (16 tests).  Coverage: SimpleCov (`COVERAGE=true`).

**Python** (`tests/`): Unit (`@patch` for HTTP/models, temp SQLite), Integration (FastAPI test client, mock Rails callbacks). Coverage: pytest-cov (70% threshold, `htmlcov/`).

## Key Mocking Patterns

**Rails HTTP**: `Net::HTTP.stub_any_instance(:request, Net::HTTPSuccess.new("1.1", "200", "OK")) { ... }`
**Rails Embedding**: Mock `$embedding_model` global variable
**Rails File System**: `File.stub(:directory?, true) { Dir.stub(:entries, [...]) { ... } }`
**Python HTTP**: `@patch('app.senders.requests.post')` with `mock_response.status_code = 200`
**Python Models**: `@patch('model_init.AutoModelForCausalLM.from_pretrained')` to avoid downloads

## CI/CD & Workflows

**Rails CI** (`.github/workflows/pro-app-test.yml`): Brakeman, JS audit, RuboCop, Playwright E2E (16 tests, browser caching), unit tests, PostgreSQL+pgvector
**Python CI** (`.github/workflows/pro-image-to-text-test.yml`): Ruff linting, integration + unit tests (60% coverage), artifacts
**Build**: Manual-only Docker builds via `workflow_dispatch` or local `build_and_push.sh` script. Multi-platform support (AMD64, ARM64) → GitHub Container Registry

## Common Workflows

**Image Processing**: User adds path → `ImagePath` creates `ImageCore` → Rails calls Python `/add_job` → Python processes → Calls Rails webhooks (`description_receiver`, `status_receiver`) → Rails updates DB + broadcasts WebSocket → `ImageEmbedding` created for vector search

**Search**: Keyword (PgSearch `search_any_word`), Vector (embedding → cosine similarity via neighbor gem), Filtering (tags, paths, embeddings)

**Real-time**: ActionCable broadcasts (`ImageDescriptionChannel`, `ImageStatusChannel`) stream to all clients. Status: 0=not_started, 1=in_queue, 2=processing, 3=done, 4=removing, 5=failed

## Dev Notes

- Mock model inference in CI (memory limits)
- PostgreSQL with pgvector required
- First model download slow, cached in `models/`
- Meme dirs mounted in both services (`/rails/public/memes`, `/app/public/memes`)
- Custom ports via `.env` (APP_PORT, GEN_PORT)
