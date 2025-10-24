# Option 2: Enhanced Rails Monolith with Modern Hotwire - Detailed Implementation Plan

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Implementation Phases](#implementation-phases)
6. [Component Architecture](#component-architecture)
7. [ML Integration Strategy](#ml-integration-strategy)
8. [Feature Development](#feature-development)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Strategy](#deployment-strategy)
11. [Performance Optimization](#performance-optimization)
12. [Migration Path](#migration-path)
13. [Risk Assessment](#risk-assessment)
14. [Timeline and Milestones](#timeline-and-milestones)

## Executive Summary

This plan outlines the evolution of meme-search from a two-server system into a Rails monolith with modern Hotwire capabilities, while retaining an optimized Python ML service. Due to limited ONNX support for vision-language models, the Python service will be streamlined rather than eliminated.

### Key Benefits
- **Simplified Frontend**: Single Rails codebase for all UI
- **Maintainability**: No separate frontend framework to maintain
- **Performance**: Server-side rendering, minimal JavaScript, fast initial page loads
- **Developer Experience**: Familiar Rails patterns, no build step for JS
- **SEO Friendly**: Full server-side rendering out of the box
- **Progressive Enhancement**: Works without JavaScript, enhanced with it

### Key Challenges
- **Learning Curve**: Hotwire patterns differ from traditional Rails
- **Component Ecosystem**: Smaller than React ecosystem
- **Interactivity Limits**: Complex UI interactions may require more effort
- **ML Service**: Still requires Python service due to ONNX limitations

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Rails Monolith Application                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Presentation Layer                    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  • Turbo 8 with Page Refreshes & Morphing             │ │
│  │  • Stimulus Controllers for Interactivity             │ │
│  │  • ViewComponent for Reusable Components              │ │
│  │  • TailwindCSS for Styling                           │ │
│  │  • ActionCable for Real-time Updates                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Application Layer                     │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  • Controllers (Request Handling)                      │ │
│  │  • Services (Business Logic)                           │ │
│  │  • Jobs (Background Processing)                        │ │
│  │  • Mailers (Notifications)                            │ │
│  │  • Channels (WebSocket Handlers)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                      Domain Layer                       │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  • Models (Active Record)                             │ │
│  │  • Validators                                         │ │
│  │  • Callbacks                                          │ │
│  │  • Scopes & Concerns                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              ML Communication Layer                     │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  • HTTP Client for ML Service                         │ │
│  │  • Job Queue Integration                              │ │
│  │  • Result Processing                                  │ │
│  │  • Fallback Handling                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────┼───────────────────────────┐
│                                  ▼                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │    Redis     │  │ File Storage │      │
│  │ + pgvector   │  │ (Cache/Queue)│  │   (Local/S3) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                        Data Layer                            │
└──────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼───────────────────────────┐
│                                  ▼                            │
│            Python ML Service (Optimized FastAPI)             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • Vision-Language Models (Florence-2, SmolVLM, etc.)  │ │
│  │  • Model Caching & Management                          │ │
│  │  • Redis Queue Integration                             │ │
│  │  • Batch Processing Support                            │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

```
Browser Request
    │
    ▼
Rails Router
    │
    ▼
Controller Action
    ├─> Turbo Frame Request? ─Yes─> Render Partial Frame
    ├─> Turbo Stream Request? ─Yes─> Render Stream Updates
    └─> Regular Request ─────────> Render Full Page
              │
              ▼
        Service Layer
              │
        ┌─────┴─────┐
        ▼           ▼
    Database    ML Service
        │           │
        └─────┬─────┘
              ▼
         Response
              │
              ▼
    Turbo Processes Response
    (Morph, Replace, or Append)
              │
              ▼
    Stimulus Controllers React
    (Handle Client Interactions)
```

## Technology Stack

### Core Rails Stack
```yaml
Framework:
  - Ruby: 3.3.x
  - Rails: 7.2.x
  - Turbo: 8.x (with morphing)
  - Stimulus: 3.x
  - ActionCable: 7.x

UI Components:
  - ViewComponent: 3.x
  - TailwindCSS: 3.4.x
  - Heroicons: For icons
  - Tippy.js: For tooltips (via Stimulus)

Database:
  - PostgreSQL: 17.x
  - pgvector: Latest
  - Redis: 7.x

Background Processing:
  - Sidekiq: 7.x
  - Whenever: For cron jobs

Search:
  - pg_search: 2.x
  - Neighbor: 2.x (vector search)

ML Communication:
  - HTTParty: 5.x (HTTP client)
  - Faraday: 2.x (alternative HTTP client)
  - Mini Magick: 4.x (image processing)
  - Ruby-vips: 2.x (faster alternative)

File Management:
  - ActiveStorage: 7.x
  - Listen: 3.x (folder monitoring)

Development:
  - RSpec: 3.x
  - Capybara: 3.x
  - FactoryBot: 6.x
  - Rubocop: Latest
  - Brakeman: Security scanning
```

### JavaScript Dependencies (Minimal)
```json
{
  "dependencies": {
    "@hotwired/turbo-rails": "^8.0.0",
    "@hotwired/stimulus": "^3.2.0",
    "@rails/actioncable": "^7.0.0",
    "tippy.js": "^6.3.0",
    "dropzone": "^6.0.0",
    "chart.js": "^4.0.0",
    "tom-select": "^2.2.0"
  }
}
```

### Python ML Service Stack
```yaml
Runtime:
  - Python: 3.12.x
  - FastAPI: 0.115.x
  - Uvicorn: 0.32.x

ML Libraries:
  - Transformers: 4.46.x
  - PyTorch: 2.5.x
  - Pillow: 11.x
  - einops: 0.8.x
  - timm: 1.0.x

Queue & Performance:
  - Redis: 5.x
  - RQ: 2.x
  - Model quantization
  - Batch inference

## Project Structure

```
meme-search/
├── app/
│   ├── assets/
│   │   ├── stylesheets/
│   │   │   ├── application.tailwind.css
│   │   │   └── components/
│   │   └── images/
│   ├── channels/
│   │   ├── application_cable/
│   │   ├── meme_processing_channel.rb
│   │   └── folder_monitoring_channel.rb
│   ├── components/                    # ViewComponents
│   │   ├── application_component.rb
│   │   ├── layout/
│   │   │   ├── header_component.rb
│   │   │   ├── sidebar_component.rb
│   │   │   └── footer_component.rb
│   │   ├── memes/
│   │   │   ├── card_component.rb
│   │   │   ├── gallery_component.rb
│   │   │   ├── list_item_component.rb
│   │   │   └── detail_modal_component.rb
│   │   ├── search/
│   │   │   ├── search_bar_component.rb
│   │   │   ├── filters_component.rb
│   │   │   └── results_component.rb
│   │   ├── upload/
│   │   │   ├── dropzone_component.rb
│   │   │   ├── progress_component.rb
│   │   │   └── preview_component.rb
│   │   └── shared/
│   │       ├── button_component.rb
│   │       ├── modal_component.rb
│   │       └── pagination_component.rb
│   ├── controllers/
│   │   ├── application_controller.rb
│   │   ├── memes_controller.rb
│   │   ├── search_controller.rb
│   │   ├── uploads_controller.rb
│   │   ├── folders_controller.rb
│   │   ├── tags_controller.rb
│   │   └── settings_controller.rb
│   ├── helpers/
│   ├── javascript/
│   │   ├── application.js
│   │   └── controllers/
│   │       ├── application.js
│   │       ├── index.js
│   │       ├── dropzone_controller.js
│   │       ├── search_controller.js
│   │       ├── modal_controller.js
│   │       ├── filter_controller.js
│   │       ├── infinite_scroll_controller.js
│   │       └── auto_save_controller.js
│   ├── jobs/
│   │   ├── application_job.rb
│   │   ├── process_meme_job.rb
│   │   ├── folder_scan_job.rb
│   │   └── cleanup_job.rb
│   ├── mailers/
│   ├── models/
│   │   ├── application_record.rb
│   │   ├── meme.rb
│   │   ├── tag.rb
│   │   ├── folder.rb
│   │   ├── embedding.rb
│   │   └── setting.rb
│   ├── services/                      # Business logic
│   │   ├── ml/
│   │   │   ├── onnx_runner.rb
│   │   │   ├── model_manager.rb
│   │   │   ├── image_preprocessor.rb
│   │   │   └── caption_generator.rb
│   │   ├── search/
│   │   │   ├── keyword_search.rb
│   │   │   ├── vector_search.rb
│   │   │   └── hybrid_search.rb
│   │   ├── upload/
│   │   │   ├── file_processor.rb
│   │   │   └── batch_uploader.rb
│   │   └── monitoring/
│   │       ├── folder_watcher.rb
│   │       └── change_detector.rb
│   └── views/
│       ├── layouts/
│       │   ├── application.html.erb
│       │   └── turbo_frame.html.erb
│       ├── memes/
│       │   ├── index.html.erb
│       │   ├── show.html.erb
│       │   ├── _meme.html.erb
│       │   ├── _form.html.erb
│       │   └── _gallery.turbo_frame.erb
│       ├── search/
│       │   ├── index.html.erb
│       │   └── _results.turbo_frame.erb
│       └── shared/
│           └── _turbo_stream_flash.turbo_stream.erb
├── bin/
│   ├── dev                           # Foreman for development
│   └── ml_server                     # ONNX runtime wrapper
├── config/
│   ├── application.rb
│   ├── routes.rb
│   ├── database.yml
│   ├── cable.yml
│   └── importmap.rb
├── db/
│   ├── migrate/
│   └── schema.rb
├── lib/
│   ├── ml/
│   │   ├── onnx_wrapper.rb          # Ruby-ONNX interface
│   │   └── node_runner.rb           # Node.js subprocess
│   └── tasks/
│       └── ml.rake
├── public/
│   └── memes/                       # Meme storage
├── spec/                            # Tests
├── storage/                         # ActiveStorage
├── vendor/
│   └── javascript/                  # Vendored JS libraries
├── Dockerfile
├── docker-compose.yml
├── Gemfile
├── Procfile.dev
└── package.json
```

## Implementation Phases

### Phase 1: Foundation & Preparation (Week 1)

#### 1.1 Project Setup
```bash
# Create refactor branch
git checkout -b refactor/enhanced-rails-monolith

# Update Ruby and Rails
rbenv install 3.3.2
gem update rails

# Update Gemfile
bundle update
bundle add view_component sidekiq redis neighbor \
           ruby-vips listen image_processing \
           pagy friendly_id

# Remove Python dependencies
rm -rf meme_search_pro/image_to_text_generator
```

#### 1.2 Modern Hotwire Setup
```ruby
# Gemfile
gem "turbo-rails", "~> 2.0.0" # Ensure Turbo 8
gem "stimulus-rails"
gem "importmap-rails"
gem "tailwindcss-rails"
gem "view_component"

# config/importmap.rb
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
```

#### 1.3 ViewComponent Setup
```ruby
# config/application.rb
config.view_component.preview_paths << "#{Rails.root}/spec/components/previews"
config.view_component.default_preview_layout = "component_preview"

# app/components/application_component.rb
class ApplicationComponent < ViewComponent::Base
  include ApplicationHelper
  include Turbo::FramesHelper
  include Turbo::StreamsHelper
end
```

### Phase 2: ML Service Integration (Week 2)

#### 2.1 ML Service Communication Layer

```ruby
# app/services/ml/client.rb
class ML::Client
  include HTTParty
  base_uri ENV.fetch('ML_SERVICE_URL', 'http://ml-service:8000')

  def self.generate_caption(image_path, model_name)
    response = post('/api/inference',
      body: {
        image_path: image_path,
        model_name: model_name
      }.to_json,
      headers: { 'Content-Type' => 'application/json' },
      timeout: 30
    )

    if response.success?
      response.parsed_response
    else
      Rails.logger.error "ML Service error: #{response.code} - #{response.body}"
      nil
    end
  rescue HTTParty::Error => e
    Rails.logger.error "ML Service connection error: #{e.message}"
    nil
  end

  def self.health_check
    get('/health', timeout: 5).success?
  rescue
    false
  end
end
```

#### 2.2 Background Job Integration

```ruby
# app/jobs/process_meme_job.rb
class ProcessMemeJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: 30.seconds, attempts: 3

  def perform(meme)
    # Update status to processing
    meme.update!(status: 'processing')
    broadcast_status(meme, 'processing')

    # Call ML service
    result = ML::Client.generate_caption(
      meme.image_path || meme.image_url,
      Setting.current_model
    )

    if result
      meme.update!(
        description: result['description'],
        status: 'completed',
        processed_at: Time.current
      )

      # Generate embeddings for vector search
      GenerateEmbeddingsJob.perform_later(meme)

      broadcast_completion(meme)
    else
      meme.update!(status: 'failed')
      broadcast_status(meme, 'failed')
    end
  end

  private

  def broadcast_status(meme, status)
    Turbo::StreamsChannel.broadcast_update_to(
      "meme_#{meme.id}",
      target: "meme_#{meme.id}_status",
      partial: 'memes/status',
      locals: { meme: meme, status: status }
    )
  end

  def broadcast_completion(meme)
    Turbo::StreamsChannel.broadcast_replace_to(
      "meme_#{meme.id}",
      target: "meme_#{meme.id}",
      partial: 'memes/meme',
      locals: { meme: meme }
    )
  end
end
```

#### 2.3 Python ML Service Optimization

Keep the existing Python FastAPI service but optimize it:

```python
# ml_service/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoProcessor
import torch
from pathlib import Path
import redis
import json

app = FastAPI()
redis_client = redis.from_url("redis://redis:6379")

# Model cache
models = {}

class InferenceRequest(BaseModel):
    image_path: str
    model_name: str

@app.post("/api/inference")
async def generate_caption(request: InferenceRequest):
    try:
        # Load model if not cached
        if request.model_name not in models:
            load_model(request.model_name)

        model, processor = models[request.model_name]

        # Process image
        image = Image.open(request.image_path)
        inputs = processor(images=image, return_tensors="pt")

        # Generate caption
        with torch.no_grad():
            outputs = model.generate(**inputs, max_length=100)

        description = processor.decode(outputs[0], skip_special_tokens=True)

        return {"description": description, "model": request.model_name}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def load_model(model_name):
    """Load and cache model"""
    model = AutoModelForCausalLM.from_pretrained(
        f"models/{model_name}",
        torch_dtype=torch.float16,
        device_map="auto"
    )
    processor = AutoProcessor.from_pretrained(f"models/{model_name}")

    models[model_name] = (model, processor)

    # Manage cache size
    if len(models) > 3:
        oldest = list(models.keys())[0]
        del models[oldest]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": list(models.keys())}
```

### Phase 3: Enhanced UI Components (Week 3-4)

#### 3.1 ViewComponent Gallery
```ruby
# app/components/memes/gallery_component.rb
class Memes::GalleryComponent < ApplicationComponent
  def initialize(memes:, view_mode: 'grid', columns: 4)
    @memes = memes
    @view_mode = view_mode
    @columns = columns
  end

  private

  def grid_classes
    {
      2 => 'grid-cols-2',
      3 => 'grid-cols-3',
      4 => 'grid-cols-4',
      5 => 'grid-cols-5'
    }[@columns] || 'grid-cols-4'
  end
end
```

```erb
<!-- app/components/memes/gallery_component.html.erb -->
<div class="meme-gallery" data-controller="gallery">
  <div class="flex justify-end mb-4">
    <%= render Layout::ViewSwitcherComponent.new(
      current: @view_mode,
      turbo_frame: 'gallery'
    ) %>
  </div>

  <%= turbo_frame_tag 'gallery', data: { turbo_action: 'advance' } do %>
    <% if @view_mode == 'grid' %>
      <div class="grid <%= grid_classes %> gap-4">
        <% @memes.each do |meme| %>
          <%= render Memes::CardComponent.new(meme: meme) %>
        <% end %>
      </div>
    <% else %>
      <div class="space-y-2">
        <% @memes.each do |meme| %>
          <%= render Memes::ListItemComponent.new(meme: meme) %>
        <% end %>
      </div>
    <% end %>

    <% if @memes.respond_to?(:total_pages) && @memes.total_pages > 1 %>
      <%= render Shared::PaginationComponent.new(
        collection: @memes,
        turbo_frame: 'gallery'
      ) %>
    <% end %>
  <% end %>
</div>
```

#### 3.2 Stimulus Controllers

```javascript
// app/javascript/controllers/dropzone_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "preview", "progress"]
  static values = { url: String, maxFiles: Number }

  connect() {
    this.setupDropzone()
  }

  setupDropzone() {
    this.element.addEventListener("dragover", this.handleDragOver.bind(this))
    this.element.addEventListener("drop", this.handleDrop.bind(this))
    this.element.addEventListener("dragleave", this.handleDragLeave.bind(this))
  }

  handleDragOver(e) {
    e.preventDefault()
    this.element.classList.add("border-primary", "bg-primary/5")
  }

  handleDragLeave(e) {
    e.preventDefault()
    this.element.classList.remove("border-primary", "bg-primary/5")
  }

  handleDrop(e) {
    e.preventDefault()
    this.element.classList.remove("border-primary", "bg-primary/5")

    const files = Array.from(e.dataTransfer.files)
    this.uploadFiles(files)
  }

  async uploadFiles(files) {
    const formData = new FormData()

    files.forEach(file => {
      if (this.isValidImage(file)) {
        formData.append("memes[]", file)
      }
    })

    this.showProgress()

    try {
      const response = await fetch(this.urlValue, {
        method: "POST",
        body: formData,
        headers: {
          "X-CSRF-Token": document.querySelector('[name="csrf-token"]').content,
          "Accept": "text/vnd.turbo-stream.html"
        }
      })

      if (response.ok) {
        const text = await response.text()
        Turbo.renderStreamMessage(text)
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      this.hideProgress()
    }
  }

  isValidImage(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    return validTypes.includes(file.type)
  }

  showProgress() {
    if (this.hasProgressTarget) {
      this.progressTarget.classList.remove("hidden")
    }
  }

  hideProgress() {
    if (this.hasProgressTarget) {
      this.progressTarget.classList.add("hidden")
    }
  }

  triggerFileSelect() {
    this.inputTarget.click()
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files)
    this.uploadFiles(files)
  }
}
```

```javascript
// app/javascript/controllers/search_controller.js
import { Controller } from "@hotwired/stimulus"
import debounce from "debounce"

export default class extends Controller {
  static targets = ["input", "type", "filters", "results"]
  static values = { url: String }

  connect() {
    this.search = debounce(this.search.bind(this), 300)
  }

  search() {
    const params = new URLSearchParams({
      query: this.inputTarget.value,
      type: this.typeTarget.value,
      ...this.getFilters()
    })

    fetch(`${this.urlValue}?${params}`, {
      headers: {
        "Accept": "text/vnd.turbo-stream.html"
      }
    })
    .then(response => response.text())
    .then(html => {
      Turbo.renderStreamMessage(html)
    })
  }

  getFilters() {
    const filters = {}

    this.filtersTargets.forEach(filter => {
      if (filter.checked || filter.selected) {
        const name = filter.name
        const value = filter.value

        if (filters[name]) {
          if (Array.isArray(filters[name])) {
            filters[name].push(value)
          } else {
            filters[name] = [filters[name], value]
          }
        } else {
          filters[name] = value
        }
      }
    })

    return filters
  }

  toggleAdvancedFilters() {
    const advanced = document.getElementById("advanced-filters")
    advanced.classList.toggle("hidden")
  }

  clearFilters() {
    this.filtersTargets.forEach(filter => {
      if (filter.type === 'checkbox') {
        filter.checked = false
      } else if (filter.tagName === 'SELECT') {
        filter.selectedIndex = 0
      }
    })
    this.search()
  }
}
```

#### 3.3 Turbo Stream Responses
```erb
<!-- app/views/memes/create.turbo_stream.erb -->
<%= turbo_stream.prepend "memes-list" do %>
  <%= render Memes::CardComponent.new(meme: @meme) %>
<% end %>

<%= turbo_stream.update "upload-status" do %>
  <div class="alert alert-success">
    Meme uploaded successfully! Processing description...
  </div>
<% end %>

<%= turbo_stream.update "meme-count" do %>
  <%= pluralize(Meme.count, 'meme') %>
<% end %>
```

### Phase 4: Feature Implementation (Week 4-5)

#### 4.1 File Upload with ActiveStorage
```ruby
# app/models/meme.rb
class Meme < ApplicationRecord
  has_one_attached :image
  belongs_to :folder, optional: true
  has_many :taggings, dependent: :destroy
  has_many :tags, through: :taggings
  has_one :embedding, dependent: :destroy

  enum status: {
    pending: 0,
    processing: 1,
    completed: 2,
    failed: 3
  }

  scope :recent, -> { order(created_at: :desc) }
  scope :with_associations, -> { includes(:tags, :folder, image_attachment: :blob) }

  after_create_commit :process_async

  def process_async
    ProcessMemeJob.perform_later(self)
  end

  def image_url
    return unless image.attached?

    if image.variable?
      Rails.application.routes.url_helpers.rails_representation_url(
        image.variant(resize_to_limit: [800, 800]),
        only_path: true
      )
    else
      Rails.application.routes.url_helpers.rails_blob_url(image, only_path: true)
    end
  end

  def thumbnail_url
    return unless image.attached?

    Rails.application.routes.url_helpers.rails_representation_url(
      image.variant(resize_to_fill: [200, 200]),
      only_path: true
    )
  end
end
```

```ruby
# app/controllers/uploads_controller.rb
class UploadsController < ApplicationController
  def new
    @meme = Meme.new
  end

  def create
    @memes = []

    upload_params[:images].each do |image|
      meme = Meme.create!(
        image: image,
        name: image.original_filename,
        folder: current_folder,
        status: 'pending'
      )
      @memes << meme
    end

    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: [
          turbo_stream.prepend('memes-gallery',
            partial: 'memes/memes',
            locals: { memes: @memes }
          ),
          turbo_stream.replace('upload-form',
            partial: 'uploads/form',
            locals: { meme: Meme.new }
          ),
          turbo_stream.prepend('notifications',
            partial: 'shared/notification',
            locals: {
              message: "#{@memes.count} memes uploaded successfully!",
              type: 'success'
            }
          )
        ]
      end
      format.html { redirect_to memes_path, notice: 'Memes uploaded!' }
    end
  end

  private

  def upload_params
    params.require(:meme).permit(images: [])
  end

  def current_folder
    Folder.find_by(id: params[:folder_id])
  end
end
```

#### 4.2 Folder Monitoring
```ruby
# app/services/monitoring/folder_watcher.rb
class Monitoring::FolderWatcher
  def initialize(folder)
    @folder = folder
    @listener = nil
  end

  def start
    return if @listener&.listening?

    @listener = Listen.to(@folder.path) do |modified, added, removed|
      handle_changes(modified, added, removed)
    end

    @listener.start
    Rails.logger.info "Started monitoring folder: #{@folder.path}"
  end

  def stop
    @listener&.stop
    Rails.logger.info "Stopped monitoring folder: #{@folder.path}"
  end

  private

  def handle_changes(modified, added, removed)
    added.each do |path|
      next unless valid_image?(path)
      create_meme_from_file(path)
    end

    removed.each do |path|
      remove_meme_for_file(path)
    end

    broadcast_changes if added.any? || removed.any?
  end

  def valid_image?(path)
    %w[.jpg .jpeg .png .gif .webp].include?(File.extname(path).downcase)
  end

  def create_meme_from_file(path)
    return if Meme.exists?(file_path: path)

    meme = @folder.memes.create!(
      name: File.basename(path),
      file_path: path,
      status: 'pending'
    )

    ProcessMemeJob.perform_later(meme)
  end

  def remove_meme_for_file(path)
    Meme.where(file_path: path).destroy_all
  end

  def broadcast_changes
    Turbo::StreamsChannel.broadcast_refresh_to(
      "folder_#{@folder.id}",
      target: "folder_#{@folder.id}_memes"
    )
  end
end
```

```ruby
# app/jobs/folder_scan_job.rb
class FolderScanJob < ApplicationJob
  queue_as :low

  def perform(folder_id)
    folder = Folder.find(folder_id)
    watcher = Monitoring::FolderWatcher.new(folder)

    # Scan for new files
    Dir.glob(File.join(folder.path, '**/*.{jpg,jpeg,png,gif,webp}')).each do |file|
      next if Meme.exists?(file_path: file)

      folder.memes.create!(
        name: File.basename(file),
        file_path: file,
        status: 'pending'
      )
    end

    # Schedule next scan
    FolderScanJob.set(wait: 5.minutes).perform_later(folder_id) if folder.watch_enabled?
  end
end
```

#### 4.3 Advanced Search
```ruby
# app/services/search/hybrid_search.rb
class Search::HybridSearch
  def initialize(query, options = {})
    @query = query
    @options = options
  end

  def perform
    if semantic_search?
      vector_results = Search::VectorSearch.new(@query, @options).perform
      keyword_results = Search::KeywordSearch.new(@query, @options).perform

      merge_results(vector_results, keyword_results)
    else
      Search::KeywordSearch.new(@query, @options).perform
    end
  end

  private

  def semantic_search?
    @options[:type] == 'semantic' || @options[:type] == 'hybrid'
  end

  def merge_results(vector_results, keyword_results)
    # Combine results with weighted scoring
    all_ids = (vector_results.pluck(:id) + keyword_results.pluck(:id)).uniq

    scored_results = all_ids.map do |id|
      vector_score = vector_results.find { |r| r.id == id }&.similarity || 0
      keyword_score = keyword_results.find { |r| r.id == id }&.rank || 0

      combined_score = (vector_score * 0.6) + (keyword_score * 0.4)

      { id: id, score: combined_score }
    end

    meme_ids = scored_results.sort_by { |r| -r[:score] }.map { |r| r[:id] }

    Meme.where(id: meme_ids)
        .includes(:tags, image_attachment: :blob)
        .index_by(&:id)
        .slice(*meme_ids)
        .values
  end
end
```

### Phase 5: Real-time Features (Week 5-6)

#### 5.1 ActionCable Setup
```ruby
# app/channels/meme_processing_channel.rb
class MemeProcessingChannel < ApplicationCable::Channel
  def subscribed
    meme = Meme.find(params[:id])
    stream_for meme
  end

  def unsubscribed
    stop_all_streams
  end
end
```

```javascript
// app/javascript/channels/meme_processing_channel.js
import consumer from "./consumer"

consumer.subscriptions.create({
  channel: "MemeProcessingChannel",
  id: document.querySelector("[data-meme-id]")?.dataset.memeId
}, {
  received(data) {
    // Update UI based on processing status
    const element = document.getElementById(`meme-${data.id}`)

    if (data.status === 'completed') {
      element.querySelector('.description').textContent = data.description
      element.querySelector('.status').textContent = 'Ready'
      element.classList.remove('processing')
    } else if (data.status === 'processing') {
      element.classList.add('processing')
      element.querySelector('.status').textContent = 'Processing...'
    }
  }
})
```

#### 5.2 Turbo Morphing for Live Updates
```erb
<!-- app/views/memes/index.html.erb -->
<%= turbo_refreshes_with method: :morph, scroll: :preserve %>

<div class="container mx-auto">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold">Meme Gallery</h1>

    <div class="flex gap-2">
      <%= link_to "Upload", new_upload_path,
          class: "btn btn-primary",
          data: { turbo_frame: "modal" } %>

      <%= form_with url: memes_path, method: :get,
          data: {
            controller: "search",
            search_url_value: search_memes_path,
            turbo_frame: "memes-gallery",
            turbo_action: "advance"
          } do |f| %>
        <%= f.text_field :query,
            placeholder: "Search memes...",
            class: "input",
            data: {
              search_target: "input",
              action: "input->search#search"
            } %>
      <% end %>
    </div>
  </div>

  <%= turbo_frame_tag "memes-gallery",
      class: "block",
      data: {
        turbo_action: "advance",
        controller: "infinite-scroll",
        infinite_scroll_url_value: memes_path(format: :turbo_stream)
      } do %>

    <%= render Memes::GalleryComponent.new(
      memes: @memes,
      view_mode: params[:view] || 'grid'
    ) %>

    <% if @memes.next_page %>
      <%= turbo_frame_tag "pagination",
          src: memes_path(page: @memes.next_page),
          loading: :lazy,
          class: "block" do %>
        <div class="text-center py-4">
          <div class="spinner">Loading more...</div>
        </div>
      <% end %>
    <% end %>
  <% end %>
</div>

<%= turbo_frame_tag "modal" %>
```

### Phase 6: Performance Optimization (Week 6-7)

#### 6.1 Database Optimization
```ruby
# db/migrate/add_indexes_for_performance.rb
class AddIndexesForPerformance < ActiveRecord::Migration[7.0]
  def change
    # Composite indexes for common queries
    add_index :memes, [:folder_id, :created_at]
    add_index :memes, [:status, :created_at]
    add_index :memes, :name, using: :gin, opclass: :gin_trgm_ops

    # Partial indexes for specific conditions
    add_index :memes, :created_at,
              where: "status = 'completed'",
              name: 'index_completed_memes_on_created_at'

    # Foreign key indexes
    add_index :taggings, [:meme_id, :tag_id], unique: true
    add_index :embeddings, :meme_id, unique: true

    # Vector index for similarity search
    add_index :embeddings, :vector, using: :ivfflat, opclass: :vector_l2_ops
  end
end
```

#### 6.2 Caching Strategy
```ruby
# app/models/meme.rb
class Meme < ApplicationRecord
  def self.cached_gallery(page: 1, per: 20)
    Rails.cache.fetch(['memes', 'gallery', page, per], expires_in: 5.minutes) do
      with_associations
        .completed
        .recent
        .page(page)
        .per(per)
        .to_a
    end
  end

  # Cache individual meme data
  def cached_data
    Rails.cache.fetch(['meme', id, updated_at.to_i]) do
      {
        id: id,
        name: name,
        description: description,
        thumbnail_url: thumbnail_url,
        tags: tags.pluck(:name),
        folder: folder&.name
      }
    end
  end
end

# config/environments/production.rb
config.cache_store = :redis_cache_store, {
  url: ENV['REDIS_URL'],
  namespace: 'meme_search',
  expires_in: 1.hour,
  race_condition_ttl: 5.seconds
}
```

#### 6.3 Image Optimization
```ruby
# app/models/concerns/image_optimization.rb
module ImageOptimization
  extend ActiveSupport::Concern

  included do
    after_commit :optimize_image, on: :create
  end

  def optimize_image
    return unless image.attached?

    OptimizeImageJob.perform_later(self)
  end

  def create_variants
    return unless image.attached? && image.variable?

    # Pre-generate common variants
    {
      thumb: { resize_to_fill: [200, 200] },
      medium: { resize_to_limit: [500, 500] },
      large: { resize_to_limit: [1024, 1024] }
    }.each do |name, options|
      image.variant(options).processed
    end
  end
end

# app/jobs/optimize_image_job.rb
class OptimizeImageJob < ApplicationJob
  def perform(meme)
    return unless meme.image.attached?

    # Create optimized variants
    meme.create_variants

    # Use Vips for better performance
    if meme.image.blob.content_type.start_with?('image/')
      optimized = ImageProcessing::Vips
        .source(meme.image)
        .convert('webp')
        .saver(quality: 85)
        .call

      meme.image.attach(
        io: File.open(optimized.path),
        filename: "#{meme.name}.webp",
        content_type: 'image/webp'
      )
    end
  end
end
```

## Component Architecture

### ViewComponent Hierarchy

```
ApplicationComponent
├── Layout Components
│   ├── HeaderComponent
│   ├── SidebarComponent
│   ├── FooterComponent
│   └── NavigationComponent
├── Meme Components
│   ├── CardComponent
│   ├── ListItemComponent
│   ├── GalleryComponent
│   ├── DetailModalComponent
│   └── ProcessingStatusComponent
├── Search Components
│   ├── SearchBarComponent
│   ├── FiltersComponent
│   ├── ResultsComponent
│   └── SearchTypeToggleComponent
├── Upload Components
│   ├── DropzoneComponent
│   ├── ProgressBarComponent
│   ├── PreviewComponent
│   └── BatchUploaderComponent
├── Settings Components
│   ├── ModelSelectorComponent
│   ├── FolderManagerComponent
│   └── TagEditorComponent
└── Shared Components
    ├── ButtonComponent
    ├── ModalComponent
    ├── PaginationComponent
    ├── NotificationComponent
    └── SpinnerComponent
```

### Stimulus Controller Architecture

```javascript
// Controller inheritance structure
ApplicationController
├── BaseFormController
│   ├── SearchController
│   ├── UploadController
│   └── SettingsController
├── BaseModalController
│   ├── MemeDetailController
│   └── ConfirmationController
├── BaseListController
│   ├── GalleryController
│   ├── InfiniteScrollController
│   └── FilterController
└── UtilityControllers
    ├── ClipboardController
    ├── AutosaveController
    ├── ShortcutsController
    └── ThemeController
```

## ML Integration Strategy

### Model Conversion Pipeline

```bash
# scripts/convert_models.sh
#!/bin/bash

# Install conversion tools
pip install optimum[exporters] onnx onnxruntime

# Convert each model
for model in "Florence-2-base" "Florence-2-large"; do
  python -m optimum.exporters.onnx \
    --model "microsoft/$model" \
    --task image-to-text \
    ./models/$model/
done

# Optimize models
for model_dir in ./models/*/; do
  python -m onnxruntime.tools.optimizer \
    --input "$model_dir/model.onnx" \
    --output "$model_dir/model_optimized.onnx"
done
```

### Runtime Architecture Options

#### Option 1: Pure Ruby with System Calls
```ruby
class ML::SystemONNXRunner
  def process(image_path)
    command = build_command(image_path)
    stdout, stderr, status = Open3.capture3(command)

    raise "ONNX failed: #{stderr}" unless status.success?

    JSON.parse(stdout)
  end

  private

  def build_command(image_path)
    [
      'onnxruntime_exec',
      '--model', model_path,
      '--input', image_path,
      '--output', 'json'
    ].join(' ')
  end
end
```

#### Option 2: Ruby-Python Bridge
```ruby
# Using PyCall gem
require 'pycall'

class ML::PythonBridge
  def initialize
    @onnx = PyCall.import_module('onnxruntime')
    @np = PyCall.import_module('numpy')
    @session = nil
  end

  def load_model(path)
    @session = @onnx.InferenceSession.new(path)
  end

  def process(image_array)
    input_name = @session.get_inputs[0].name
    output = @session.run(nil, { input_name => image_array })
    decode_output(output[0])
  end
end
```

## Feature Development

### Upload System
```erb
<!-- app/views/uploads/new.html.erb -->
<div class="max-w-4xl mx-auto">
  <h1 class="text-2xl font-bold mb-6">Upload Memes</h1>

  <div data-controller="dropzone"
       data-dropzone-url-value="<%= uploads_path %>"
       data-dropzone-max-files-value="10"
       class="border-2 border-dashed border-gray-300 rounded-lg p-8">

    <div class="text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400">
        <!-- Upload icon -->
      </svg>

      <p class="mt-2 text-sm text-gray-600">
        Drag and drop your memes here, or
        <button data-action="click->dropzone#triggerFileSelect"
                class="text-blue-600 hover:text-blue-500">
          browse
        </button>
      </p>

      <input type="file"
             multiple
             accept="image/*"
             data-dropzone-target="input"
             data-action="change->dropzone#handleFileSelect"
             class="hidden">
    </div>

    <div data-dropzone-target="preview" class="mt-6 grid grid-cols-4 gap-4 hidden">
      <!-- Preview thumbnails -->
    </div>

    <div data-dropzone-target="progress" class="mt-6 hidden">
      <div class="bg-blue-200 rounded-full h-2">
        <div class="bg-blue-600 h-2 rounded-full" style="width: 0%"></div>
      </div>
    </div>
  </div>

  <div id="upload-results" class="mt-6">
    <%= turbo_frame_tag "uploaded-memes" %>
  </div>
</div>
```

### Search Interface
```erb
<!-- app/views/search/index.html.erb -->
<div data-controller="search"
     data-search-url-value="<%= search_memes_path %>"
     class="container mx-auto">

  <div class="mb-6">
    <div class="flex gap-4">
      <input type="text"
             placeholder="Search your memes..."
             data-search-target="input"
             data-action="input->search#search"
             class="flex-1 input input-lg">

      <select data-search-target="type"
              data-action="change->search#search"
              class="select">
        <option value="keyword">Keyword</option>
        <option value="semantic">Semantic</option>
        <option value="hybrid">Hybrid</option>
      </select>

      <button data-action="click->search#toggleAdvancedFilters"
              class="btn btn-secondary">
        Filters
      </button>
    </div>

    <div id="advanced-filters" class="hidden mt-4 p-4 bg-gray-50 rounded">
      <%= render 'search/filters' %>
    </div>
  </div>

  <%= turbo_frame_tag "search-results", class: "block" do %>
    <div class="text-center text-gray-500 py-12">
      Enter a search query to find your memes
    </div>
  <% end %>
</div>
```

## Testing Strategy

### System Tests with Capybara
```ruby
# spec/system/meme_upload_spec.rb
require 'rails_helper'

RSpec.describe "Meme Upload", type: :system do
  before do
    driven_by(:selenium_chrome_headless)
  end

  it "allows uploading memes via drag and drop" do
    visit new_upload_path

    # Simulate drag and drop
    dropzone = find('[data-controller="dropzone"]')
    dropzone.drop(fixture_file_upload('test_meme.jpg'))

    # Wait for upload
    expect(page).to have_css('.upload-progress')

    # Verify upload completed
    within '#uploaded-memes' do
      expect(page).to have_content('test_meme.jpg')
      expect(page).to have_css('img[src*="test_meme"]')
    end

    # Verify processing started
    meme = Meme.last
    expect(meme.status).to eq('processing')
  end
end
```

### Component Tests
```ruby
# spec/components/memes/gallery_component_spec.rb
require 'rails_helper'

RSpec.describe Memes::GalleryComponent, type: :component do
  let(:memes) { create_list(:meme, 10) }

  it "renders grid view by default" do
    render_inline(described_class.new(memes: memes))

    expect(page).to have_css('.grid')
    expect(page).to have_css('.meme-card', count: 10)
  end

  it "renders list view when specified" do
    render_inline(described_class.new(memes: memes, view_mode: 'list'))

    expect(page).not_to have_css('.grid')
    expect(page).to have_css('.meme-list-item', count: 10)
  end

  it "includes pagination for large datasets" do
    paginated = Meme.page(1).per(5)
    render_inline(described_class.new(memes: paginated))

    expect(page).to have_css('.pagination')
  end
end
```

### Stimulus Controller Tests
```javascript
// spec/javascript/controllers/search_controller_spec.js
import { Application } from "@hotwired/stimulus"
import SearchController from "controllers/search_controller"

describe("SearchController", () => {
  let application

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-controller="search" data-search-url-value="/search">
        <input data-search-target="input">
        <select data-search-target="type">
          <option value="keyword">Keyword</option>
          <option value="semantic">Semantic</option>
        </select>
      </div>
    `

    application = Application.start()
    application.register("search", SearchController)
  })

  it("triggers search on input", (done) => {
    const input = document.querySelector('[data-search-target="input"]')

    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve('<turbo-stream>...</turbo-stream>')
      })
    )

    input.value = "test query"
    input.dispatchEvent(new Event('input'))

    setTimeout(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('query=test+query')
      )
      done()
    }, 400) // Account for debounce
  })
})
```

## Deployment Strategy

### Single Container Deployment
```dockerfile
# Dockerfile
FROM ruby:3.3.2-slim AS base

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-client \
    nodejs \
    npm \
    imagemagick \
    libvips \
    # ONNX Runtime
    wget && \
    wget https://github.com/microsoft/onnxruntime/releases/download/v1.16.0/onnxruntime-linux-x64-1.16.0.tgz && \
    tar -xzf onnxruntime-linux-x64-1.16.0.tgz && \
    cp -r onnxruntime-linux-x64-1.16.0/lib/* /usr/local/lib/ && \
    ldconfig

WORKDIR /app

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4

# Install Node packages for ONNX
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy application
COPY . .

# Precompile assets
RUN SECRET_KEY_BASE=dummy bundle exec rails assets:precompile

# Download models
RUN mkdir -p /app/models && \
    wget -O /app/models/florence-2-base.onnx \
    https://your-model-storage/florence-2-base.onnx

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgresql://postgres:password@db:5432/meme_search
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      ML_SERVICE_URL: http://ml-service:8000
    volumes:
      - ./storage:/app/storage
      - ./memes:/app/public/memes
    depends_on:
      - db
      - redis
      - ml-service

  ml-service:
    build: ./ml_service
    environment:
      REDIS_URL: redis://redis:6379/0
      MODEL_CACHE_DIR: /app/models
    volumes:
      - ./models:/app/models
      - ./memes:/app/memes:ro
    deploy:
      resources:
        limits:
          memory: 6GB
        reservations:
          memory: 3GB
    depends_on:
      - redis

  sidekiq:
    build: .
    command: bundle exec sidekiq
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgresql://postgres:password@db:5432/meme_search
      REDIS_URL: redis://redis:6379/0
      ML_SERVICE_URL: http://ml-service:8000
    volumes:
      - ./storage:/app/storage
      - ./memes:/app/public/memes
    depends_on:
      - db
      - redis
      - ml-service

  db:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_DB: meme_search
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Performance Optimization

### Rails Performance Tuning
```ruby
# config/application.rb
config.cache_classes = true
config.eager_load = true
config.consider_all_requests_local = false
config.action_controller.perform_caching = true
config.public_file_server.enabled = true

# Enable compression
config.middleware.use Rack::Deflater

# Asset configuration
config.assets.compile = false
config.assets.digest = true

# config/puma.rb
workers ENV.fetch("WEB_CONCURRENCY") { 2 }
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count

preload_app!

on_worker_boot do
  ActiveRecord::Base.establish_connection
end
```

### Database Query Optimization
```ruby
# app/models/meme.rb
class Meme < ApplicationRecord
  # Use includes to prevent N+1
  scope :for_gallery, -> {
    includes(:tags, :folder, image_attachment: :blob)
      .with_attached_image
  }

  # Use counter caches
  belongs_to :folder, counter_cache: true

  # Batch loading for large datasets
  def self.find_in_batches_with_progress
    total = count
    processed = 0

    find_in_batches(batch_size: 100) do |batch|
      yield batch, (processed / total.to_f * 100).round

      processed += batch.size
    end
  end
end
```

### Turbo Optimization
```erb
<!-- Use lazy loading frames -->
<%= turbo_frame_tag "expensive_content",
    src: expensive_content_path,
    loading: :lazy do %>
  <div class="skeleton-loader">Loading...</div>
<% end %>

<!-- Optimize morphing with stable IDs -->
<div id="meme-<%= meme.id %>" data-turbo-permanent>
  <%= render meme %>
</div>

<!-- Conditional frame updates -->
<%= turbo_stream.replace_if_present "sidebar" do %>
  <%= render "shared/sidebar" %>
<% end %>
```

## Migration Path

### Phase 1: Prepare Existing System
```ruby
# Create migration checkpoint
rails db:migrate:status > migration_checkpoint.txt
pg_dump meme_search_production > backup_$(date +%Y%m%d).sql

# Tag current version
git tag -a v1.0-pre-refactor -m "Pre-refactor checkpoint"
git push origin v1.0-pre-refactor
```

### Phase 2: Gradual Migration
```ruby
# Enable feature flags
class ApplicationController < ActionController::Base
  def use_new_ui?
    params[:new_ui] == 'true' ||
    cookies[:beta_user] == 'true'
  end
  helper_method :use_new_ui?
end

# Dual routing during transition
Rails.application.routes.draw do
  if ENV['ENABLE_NEW_UI']
    root 'home#index'
    resources :memes
  else
    root 'legacy/home#index'
    namespace :legacy do
      resources :image_cores
    end
  end
end
```

### Phase 3: Data Migration
```ruby
class MigrateToNewSchema < ActiveRecord::Migration[7.0]
  def up
    # Rename tables
    rename_table :image_cores, :memes
    rename_table :image_paths, :folders
    rename_table :tag_names, :tags

    # Add new columns
    add_column :memes, :file_path, :string
    add_column :memes, :processed_at, :datetime
    add_reference :memes, :user, foreign_key: true

    # Migrate data
    execute <<-SQL
      UPDATE memes
      SET file_path = CONCAT(folders.path, '/', memes.name)
      FROM folders
      WHERE memes.folder_id = folders.id
    SQL

    # Create indexes
    add_index :memes, :file_path, unique: true
    add_index :memes, [:status, :processed_at]
  end

  def down
    # Reversible migration
    rename_table :memes, :image_cores
    rename_table :folders, :image_paths
    rename_table :tags, :tag_names

    remove_column :image_cores, :file_path
    remove_column :image_cores, :processed_at
    remove_reference :image_cores, :user
  end
end
```

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ML service maintenance | Medium | Medium | Keep optimized Python service, monitor performance |
| Hotwire learning curve | Medium | Low | Team training, documentation |
| Performance regression | Low | High | Benchmarking, caching strategy |
| Migration data loss | Low | Critical | Comprehensive backups, staged rollout |
| Browser compatibility | Low | Medium | Progressive enhancement approach |

### Mitigation Strategies

1. **ONNX Integration Fallback**
```ruby
class ML::ModelRunner
  def self.process(image_path)
    if onnx_available?
      ONNXRunner.new.process(image_path)
    else
      # Fallback to API or subprocess
      FallbackRunner.new.process(image_path)
    end
  end

  def self.onnx_available?
    # Check if ONNX runtime is properly installed
    system('which onnxruntime_exec > /dev/null 2>&1')
  end
end
```

2. **Progressive Enhancement**
```javascript
// Ensure functionality without JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // Check if Stimulus is available
  if (typeof Stimulus === 'undefined') {
    console.warn('Stimulus not loaded, falling back to basic functionality')
    initializeFallbacks()
  }
})

function initializeFallbacks() {
  // Basic form submission without Turbo
  document.querySelectorAll('form').forEach(form => {
    form.dataset.turbo = 'false'
  })
}
```

## Timeline and Milestones

### 6-Week Implementation Schedule

```
Week 1: Foundation
- Rails and gem updates
- Hotwire 8 setup
- ViewComponent structure
- Development environment

Week 2: ML Service Integration
- Optimize Python ML service
- Setup Rails-ML communication
- Redis queue integration
- Test model inference

Week 3: Core UI Components
- ViewComponent library
- Stimulus controllers
- Turbo Frame structure
- Basic styling

Week 4: Feature Migration
- Upload system
- Search functionality
- Folder management
- Tag system

Week 5: Advanced Features
- Real-time updates
- Folder monitoring
- Batch operations
- Performance optimization

Week 6: Testing & Polish
- System tests
- Component tests
- Performance testing
- UI polish

Week 6: Deployment
- Production setup
- Migration scripts
- Documentation
- Launch preparation
```

### Success Metrics

**Performance KPIs**
- Page load: < 1.5 seconds
- Search response: < 300ms
- ML processing: < 8 seconds per image
- Memory usage: < 1GB baseline

**Code Quality KPIs**
- Test coverage: > 85%
- Rubocop compliance: 100%
- Zero N+1 queries
- Component reusability: > 70%

**User Experience KPIs**
- Time to first meme view: < 2 seconds
- Upload success rate: > 98%
- Search relevance: > 85%
- Zero JavaScript errors in production

## Conclusion

The Enhanced Rails Monolith approach provides a simpler, more maintainable frontend solution that leverages Rails' strengths while incorporating modern capabilities through Hotwire. By retaining an optimized Python ML service (due to limited ONNX support for vision-language models), this architecture balances simplicity with practical requirements. The Rails monolith handles all UI/UX concerns while delegating ML processing to a streamlined Python service, delivering a responsive, real-time user experience with manageable complexity. The phased implementation minimizes risk and allows for incremental improvements throughout the migration process.