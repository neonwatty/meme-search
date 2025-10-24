# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meme Search is a self-hosted semantic search engine for memes built with Rails and Python. It uses AI vision-language models to automatically extract descriptions from meme images, generates embeddings for semantic search, and provides both keyword and vector-based search capabilities.

**Key Technologies:**
- Rails 7.2 (fullstack web app)
- Python FastAPI (ML service for image-to-text generation)
- PostgreSQL with pgvector (vector similarity search)
- Hotwire (Turbo + Stimulus) for frontend interactivity
- ActionCable (WebSocket real-time updates)

## Architecture

### Two-Service System

```
┌──────────────────────────────────┐
│   Rails App (meme_search_pro)    │
│   - Web UI (Hotwire)             │
│   - Controllers & Models         │
│   - Vector Search (pgvector)     │
│   - Embedding Generation (Ruby)  │
└────────────┬─────────────────────┘
             │ HTTP API
             ↓
┌──────────────────────────────────┐
│ Python ML Service                │
│ (image_to_text_generator)        │
│ - FastAPI server                 │
│ - Job Queue (SQLite)             │
│ - Vision-Language Models:        │
│   • Florence-2 (base/large)      │
│   • SmolVLM (256M/500M)          │
│   • Moondream2 (2B)             │
└──────────────────────────────────┘
```

### Communication Flow

1. **User uploads/selects meme** → Rails creates `ImageCore` record
2. **User requests auto-description** → Rails sends job to Python ML service via HTTP POST to `http://image_to_text_generator:8000/add_job`
3. **Python processes image** → Model generates caption, sends back via POST to Rails `/image_cores/description_receiver`
4. **Rails receives description** → Updates `ImageCore`, generates embeddings, broadcasts via ActionCable
5. **User sees update** → Frontend receives WebSocket update, displays new description

### Data Models (Rails)

Core models in `meme_search_pro/meme_search_app/app/models/`:

- **`ImageCore`**: Main meme entity with name, description, status, image_path association
  - Has keyword search via `pg_search` gem
  - Status enum: `not_started`, `in_queue`, `processing`, `done`, `removing`, `failed`
  - Chunking logic for embeddings (4-word chunks with 2-word overlap)

- **`ImageEmbedding`**: Vector embeddings for description chunks
  - Uses `neighbor` gem for vector similarity search
  - Global `$embedding_model` (sentence-transformers/all-MiniLM-L6-v2) from `config/initializers/model_setup.rb`
  - Automatically computes embedding on save via `compute_embedding` callback

- **`ImagePath`**: Directory paths where memes are stored (e.g., "memes", "additional_memes")

- **`TagName`**: Available tags for organization

- **`ImageTag`**: Join table between `ImageCore` and `TagName`

- **`ImageToText`**: Tracks available vision-language models and which is currently active

### Search Types

Two search modes (controlled by checkbox in UI):

1. **Keyword Search** (checkbox_value = 0): Full-text search via `pg_search` on `description` field with stopword removal
2. **Vector Search** (checkbox_value = 1): Semantic search using pgvector cosine similarity on embeddings

Both can be filtered by tags and directory paths.

## Development Commands

### Running the Application

**Full stack (Docker Compose):**
```bash
docker compose up
# App runs at http://localhost:3000
# Customize port via .env: APP_PORT=8080
```

**Local build (for development):**
```bash
docker compose -f docker-compose-local-build.yml up --build
```

**Rails app only (requires local PostgreSQL on port 5432):**
```bash
cd meme_search_pro/meme_search_app
./bin/dev
```

### Testing

**Run all system tests:**
```bash
cd meme_search_pro/meme_search_app
bundle install
bash run_tests.sh
# Requires PostgreSQL running on localhost:5432
```

**Run specific test:**
```bash
bin/rails test test/system/search_test.rb
```

**Linting:**
```bash
rubocop app
```

**Python ML service tests:**
```bash
cd meme_search_pro/image_to_text_generator
pip install -r requirements.test
pytest tests/
```

### Database

**Prepare test database:**
```bash
bin/rails db:test:prepare
```

**Reset development database:**
```bash
bin/rails db:reset
```

**Database uses pgvector extension** - installed via migration `20241021223150_install_neighbor_vector.rb`

## Key Implementation Details

### Embedding Generation (Rails Side)

Embeddings are generated in Ruby using the `informers` gem:

- Global model loaded at startup: `$embedding_model` (config/initializers/model_setup.rb:3)
- Model: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional embeddings)
- Triggered by `ImageCore#refresh_description_embeddings` (app/models/image_core.rb:92-108)
- Text is chunked into overlapping 4-word snippets for better search granularity
- Each chunk becomes an `ImageEmbedding` record with computed vector

### Image-to-Text Processing (Python Side)

Located in `meme_search_pro/image_to_text_generator/app/`:

- **FastAPI server** (app.py) with endpoints:
  - `POST /add_job` - Add image to processing queue
  - `DELETE /remove_job/{image_core_id}` - Cancel queued job
  - `GET /check_queue` - Check queue length

- **Job queue** (job_queue.py, jobs.py) - SQLite-based FIFO queue processed by background thread

- **Model loading** (model_init.py) - Lazy loads vision-language models on first use

- **Status updates** (senders.py) - Sends HTTP callbacks to Rails app for real-time status

### Real-Time Updates (ActionCable)

Two WebSocket channels in `app/channels/`:

1. **`ImageDescriptionChannel`**: Broadcasts new descriptions to frontend
2. **`ImageStatusChannel`**: Broadcasts status changes (in_queue → processing → done)

Controller callbacks in `ImageCoresController`:
- `description_receiver` (line 25): Receives generated description from Python service
- `status_receiver` (line 10): Receives status updates

### Volume Mounting for Memes

Memes must be mounted in **both services** to be accessible:

**Rails service:** Mount to `/rails/public/memes/`
```yaml
volumes:
  - /local/path/to/memes:/rails/public/memes/my_memes
```

**Python service:** Mount to `/app/public/memes/`
```yaml
volumes:
  - /local/path/to/memes:/app/public/memes/my_memes
```

Then register path "my_memes" via Settings → Paths → Create New in the UI.

### Network Communication

Services communicate via:
- **Docker network**: Uses service name `image_to_text_generator` as hostname
- **Fallback for local dev**: Uses `ENV["APP_HOST"]` and `ENV["GEN_PORT"]`

See `ImageCore#remove_image_text_job` (app/models/image_core.rb:54-90) for dual-URI pattern handling both Docker and local development.

## Future Architecture Plans

The `/plans` directory contains detailed architectural modernization plans:

- **Option 1**: Rails API + React SPA
- **Option 2**: Enhanced Rails Monolith with Hotwire
- **Option 3**: Rails + React Hybrid (ESBuild)
- **Option 4**: Rails + Vite + React Islands (RECOMMENDED)

All plans retain the Python ML service due to limited ONNX support for vision-language models. See `plans/architecture_update_summary.md` for detailed comparison.

## Important Constraints

1. **Model memory requirements**: Vision-language models need 12GB RAM for CPU inference (see docker-compose.yml:34)
2. **First generation is slow**: Models download on first use (can be pre-downloaded via Settings)
3. **Container naming**: PostgreSQL container must use hyphens not underscores (meme-search-db) due to ActiveRecord URI parsing
4. **Linux networking**: May need `extra_hosts: - "host.docker.internal:host-gateway"` in docker-compose.yml for inter-container communication
5. **Shared volumes required**: Meme directories must be mounted to both Rails and Python services with matching subdirectory names

## Code Conventions

- Rails follows standard MVC structure
- Controllers use Turbo Stream for dynamic updates (see `ImageCoresController#search_items`)
- Pagination via `pagy` gem (not Kaminari)
- Rate limiting on search endpoint: 20 requests per minute (ImageCoresController:6)
- CSRF protection bypassed for webhook endpoints from Python service (ImageCoresController:8)
