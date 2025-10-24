# Option 1: Rails API + React SPA Architecture - Detailed Implementation Plan

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Implementation Phases](#implementation-phases)
6. [Detailed Component Design](#detailed-component-design)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Architecture](#deployment-architecture)
10. [Performance Optimization](#performance-optimization)
11. [Risk Assessment](#risk-assessment)
12. [Timeline and Milestones](#timeline-and-milestones)

## Executive Summary

This plan outlines the transformation of meme-search from a two-server Rails + Python system into a modern architecture with Rails as a JSON API backend and React as a separate SPA frontend. The Python ML service will be optimized and retained due to limited ONNX support for vision-language models.

### Key Benefits
- **Modern UI/UX**: Reactive, fast, component-based interface
- **Scalability**: Frontend and backend can scale independently
- **Developer Experience**: Hot module replacement, TypeScript, modern tooling
- **Performance**: Client-side routing, optimistic updates, lazy loading
- **Ecosystem**: Access to vast React/npm package ecosystem

### Key Challenges
- **Complexity**: Two build systems and deployment pipelines
- **Learning Curve**: Team needs React/TypeScript expertise
- **SEO**: Requires SSR or SSG consideration for search engines
- **Initial Development Time**: Longer than enhancing existing Rails app

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            React SPA (Vite + TypeScript)            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  • React 18.3 with Concurrent Features              │   │
│  │  • shadcn/ui Component Library                      │   │
│  │  • TanStack Query for Data Fetching                 │   │
│  │  • Zustand for State Management                     │   │
│  │  • React Router v6 for Navigation                   │   │
│  │  • Socket.io Client for Real-time Updates           │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                         HTTP/WebSocket                       │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────┐
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Rails API Backend (API-Only Mode)         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  • RESTful JSON APIs with Versioning                │   │
│  │  • JWT Authentication with Refresh Tokens           │   │
│  │  • GraphQL Endpoint (Optional)                      │   │
│  │  • ActionCable for WebSocket connections            │   │
│  │  • ActiveJob with Sidekiq for Background Tasks      │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │      ML Processing Layer (Python FastAPI)          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  • FastAPI for lightweight API server              │   │
│  │  • Transformers for model inference               │   │
│  │  • Redis Queue for job management                 │   │
│  │  • Optimized model loading and caching            │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                         Backend Services                     │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────┐
│                              ▼                               │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────┐   │
│  │   PostgreSQL     │  │    Redis      │  │    S3      │   │
│  │   + pgvector     │  │  (Cache +     │  │  (Object   │   │
│  │                  │  │   Queue)      │  │  Storage)  │   │
│  └──────────────────┘  └──────────────┘  └────────────┘   │
│                        Data Layer                           │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Stack
```yaml
Core:
  - React: 18.3.x
  - TypeScript: 5.x
  - Vite: 5.x (build tool)

UI/Styling:
  - shadcn/ui: Latest (component library)
  - Tailwind CSS: 3.4.x
  - Radix UI: Latest (headless components)
  - Framer Motion: 11.x (animations)

State & Data:
  - TanStack Query: 5.x (server state)
  - Zustand: 4.x (client state)
  - React Hook Form: 7.x (forms)
  - Zod: 3.x (validation)

Routing & Navigation:
  - React Router: 6.x
  - React Helmet Async: 2.x (head management)

Real-time:
  - Socket.io Client: 4.x

Development:
  - ESLint: 8.x
  - Prettier: 3.x
  - Vitest: 1.x (testing)
  - Playwright: Latest (E2E testing)
  - Storybook: 8.x (component development)
```

### Backend Stack
```yaml
Core:
  - Ruby: 3.3.x
  - Rails: 7.2.x (API mode)

API:
  - Grape: Alternative API framework (optional)
  - GraphQL Ruby: 2.x (optional)
  - JSON:API Serializer: 2.x
  - Rack CORS: 2.x

Authentication:
  - JWT: 2.x
  - Devise JWT: 0.x
  - Pundit: 2.x (authorization)

Background Jobs:
  - Sidekiq: 7.x
  - Redis: 7.x

Database:
  - PostgreSQL: 17.x
  - pgvector: Latest
  - pg_search: 2.x

ML Integration:
  - Open3: For subprocess management
  - REST Client: For internal API calls

Development:
  - RSpec: 3.x
  - Factory Bot: 6.x
  - Rubocop: Latest
```

### ML Processing Stack (Optimized Python Service)
```yaml
Runtime:
  - Python: 3.12.x
  - FastAPI: 0.115.x
  - Uvicorn: 0.32.x (ASGI server)

ML Libraries:
  - Transformers: 4.46.x
  - PyTorch: 2.5.x
  - Pillow: 11.x (image processing)
  - einops: 0.8.x
  - timm: 1.0.x

Queue & Caching:
  - Redis: 5.x (job queue)
  - RQ: 2.x (Redis Queue)
  - Diskcache: 5.x (model caching)

Optimization:
  - Model quantization support
  - Batch inference capabilities
  - Memory-mapped model loading
```

## Project Structure

```
meme-search/
├── frontend/                      # React SPA
│   ├── src/
│   │   ├── app/                  # App-level components
│   │   │   ├── App.tsx
│   │   │   ├── Providers.tsx    # Context providers
│   │   │   └── Router.tsx
│   │   ├── components/           # Reusable components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── common/         # Shared components
│   │   │   └── features/       # Feature-specific
│   │   ├── features/            # Feature modules
│   │   │   ├── memes/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── api/
│   │   │   │   └── types/
│   │   │   ├── search/
│   │   │   ├── upload/
│   │   │   └── settings/
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # Utilities
│   │   │   ├── api-client.ts
│   │   │   ├── socket.ts
│   │   │   └── utils.ts
│   │   ├── pages/               # Route pages
│   │   ├── stores/              # Zustand stores
│   │   └── types/               # TypeScript types
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── backend/                      # Rails API
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── api/
│   │   │   │   ├── v1/
│   │   │   │   │   ├── base_controller.rb
│   │   │   │   │   ├── memes_controller.rb
│   │   │   │   │   ├── search_controller.rb
│   │   │   │   │   ├── uploads_controller.rb
│   │   │   │   │   └── settings_controller.rb
│   │   │   │   └── v2/
│   │   │   └── application_controller.rb
│   │   ├── models/
│   │   ├── services/            # Business logic
│   │   │   ├── ml_service.rb
│   │   │   ├── search_service.rb
│   │   │   └── upload_service.rb
│   │   ├── jobs/
│   │   │   ├── process_image_job.rb
│   │   │   └── folder_watcher_job.rb
│   │   ├── serializers/
│   │   └── channels/
│   ├── config/
│   │   ├── routes.rb
│   │   ├── initializers/
│   │   │   ├── cors.rb
│   │   │   └── jwt.rb
│   │   └── sidekiq.yml
│   ├── db/
│   ├── spec/                    # Tests
│   └── Gemfile
│
├── ml-service/                   # Python ML Service (Optimized)
│   ├── app/
│   │   ├── api/                # FastAPI endpoints
│   │   │   ├── __init__.py
│   │   │   └── endpoints.py
│   │   ├── core/               # Core configuration
│   │   │   ├── config.py
│   │   │   └── redis_queue.py
│   │   ├── models/             # Model management
│   │   │   ├── loader.py
│   │   │   ├── inference.py
│   │   │   └── cache.py
│   │   ├── services/           # Business logic
│   │   │   ├── image_processor.py
│   │   │   └── caption_generator.py
│   │   └── main.py
│   ├── models/                 # Model files (HF format)
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker/
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   ├── ml-service.Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

#### 1.1 Project Setup
```bash
# Create new branch
git checkout -b refactor/rails-api-react-spa

# Initialize frontend
cd frontend
npm create vite@latest . -- --template react-ts
npm install

# Setup Rails API
rails new backend --api --database=postgresql --skip-test
cd backend
bundle add jwt devise-jwt pundit sidekiq
```

#### 1.2 Configure Development Environment
- Setup Docker Compose for development
- Configure hot module replacement
- Setup environment variables
- Configure CORS for local development
- Setup Git hooks and linting

#### 1.3 Setup CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run type-check
      - run: cd frontend && npm test
      - run: cd frontend && npm run build

  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg17
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
      - run: cd backend && bundle install
      - run: cd backend && rubocop
      - run: cd backend && rspec
```

### Phase 2: ML Service Optimization (Week 2-3)

#### 2.1 Optimize Python ML Service
```python
# ml-service/app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    redis_url: str = "redis://redis:6379"
    model_cache_dir: str = "/app/models"
    max_model_cache_size: int = 3  # Keep 3 models in memory
    batch_size: int = 4
    enable_quantization: bool = True

settings = Settings()
```

#### 2.2 Optimized Model Loading with Caching
```python
# ml-service/app/models/loader.py
from transformers import AutoModelForCausalLM, AutoProcessor
from collections import OrderedDict
import torch
import gc

class ModelManager:
    def __init__(self, max_cache_size=3):
        self.models = OrderedDict()
        self.processors = OrderedDict()
        self.max_cache_size = max_cache_size

    def load_model(self, model_name: str):
        if model_name in self.models:
            # Move to end (most recently used)
            self.models.move_to_end(model_name)
            return self.models[model_name], self.processors[model_name]

        # Load model with optimizations
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto",
            load_in_8bit=settings.enable_quantization
        )
        processor = AutoProcessor.from_pretrained(model_name)

        # Cache management
        if len(self.models) >= self.max_cache_size:
            # Remove least recently used
            oldest = next(iter(self.models))
            del self.models[oldest]
            del self.processors[oldest]
            gc.collect()
            torch.cuda.empty_cache() if torch.cuda.is_available() else None

        self.models[model_name] = model
        self.processors[model_name] = processor
        return model, processor

model_manager = ModelManager()
```

#### 2.3 FastAPI with Redis Queue
```python
# ml-service/app/main.py
from fastapi import FastAPI, BackgroundTasks
from redis import Redis
from rq import Queue
import asyncio

app = FastAPI(title="ML Service", version="2.0.0")
redis_conn = Redis.from_url(settings.redis_url)
queue = Queue(connection=redis_conn)

@app.post("/api/inference")
async def process_image(
    image_id: int,
    image_path: str,
    model_name: str,
    background_tasks: BackgroundTasks
):
    # Queue job for processing
    job = queue.enqueue(
        'app.services.caption_generator.generate_caption',
        image_id=image_id,
        image_path=image_path,
        model_name=model_name,
        job_timeout='10m'
    )

    return {
        "job_id": job.id,
        "status": "queued",
        "image_id": image_id
    }

@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    job = queue.fetch_job(job_id)

    if job is None:
        return {"status": "not_found"}

    return {
        "job_id": job_id,
        "status": job.get_status(),
        "result": job.result if job.is_finished else None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_cached": len(model_manager.models),
        "queue_size": len(queue)
    }
```

### Phase 3: Backend API Development (Week 3-4)

#### 3.1 API Structure
```ruby
# backend/config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :memes do
        collection do
          post :search
          post :batch_upload
        end
        member do
          post :generate_description
          post :update_description
        end
      end

      resources :tags
      resources :folders do
        post :watch, on: :member
      end

      namespace :auth do
        post :login
        post :logout
        post :refresh
      end

      resources :settings, only: [:index, :update]
    end
  end

  mount ActionCable.server => '/cable'
end
```

#### 3.2 Authentication System
```ruby
# backend/app/controllers/api/v1/auth_controller.rb
class Api::V1::AuthController < Api::V1::BaseController
  skip_before_action :authenticate_user!, only: [:login]

  def login
    user = User.find_by(email: params[:email])

    if user&.valid_password?(params[:password])
      token = JWT.encode(
        { user_id: user.id, exp: 24.hours.from_now.to_i },
        Rails.application.credentials.secret_key_base
      )

      refresh_token = JWT.encode(
        { user_id: user.id, exp: 30.days.from_now.to_i },
        Rails.application.credentials.secret_key_base
      )

      render json: {
        token: token,
        refresh_token: refresh_token,
        user: UserSerializer.new(user)
      }
    else
      render json: { error: 'Invalid credentials' }, status: :unauthorized
    end
  end
end
```

#### 3.3 Meme Controller
```ruby
# backend/app/controllers/api/v1/memes_controller.rb
class Api::V1::MemesController < Api::V1::BaseController
  def index
    memes = Meme.includes(:tags, :folder)
                .page(params[:page])
                .per(params[:per_page] || 20)

    render json: MemeSerializer.new(memes, {
      meta: pagination_meta(memes)
    })
  end

  def search
    results = SearchService.new(
      query: params[:query],
      type: params[:search_type], # 'keyword' or 'semantic'
      filters: params[:filters]
    ).perform

    render json: MemeSerializer.new(results)
  end

  def generate_description
    meme = Meme.find(params[:id])

    ProcessImageJob.perform_later(
      meme_id: meme.id,
      image_path: meme.full_path,
      model: params[:model] || 'Florence-2-base'
    )

    ActionCable.server.broadcast(
      "meme_#{meme.id}",
      { status: 'processing' }
    )

    render json: { status: 'queued' }
  end
end
```

### Phase 4: Frontend Development (Week 4-6)

#### 4.1 Setup React Project
```typescript
// frontend/src/app/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

#### 4.2 API Client Setup
```typescript
// frontend/src/lib/api-client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          useAuthStore.getState().setTokens(data.token, data.refresh_token);
          return apiClient.request(error.config);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);
```

#### 4.3 Meme Gallery Component
```tsx
// frontend/src/features/memes/components/MemeGallery.tsx
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemeCard } from './MemeCard';
import { MemeListItem } from './MemeListItem';
import { useMemes } from '../hooks/useMemes';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

export function MemeGallery() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['memes'],
    queryFn: ({ pageParam = 1 }) => fetchMemes({ page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.meta.current_page < lastPage.meta.total_pages) {
        return lastPage.meta.current_page + 1;
      }
      return undefined;
    },
  });

  const loadMoreRef = useIntersectionObserver({
    onIntersect: fetchNextPage,
    enabled: hasNextPage,
  });

  if (isLoading) return <MemeGallerySkeleton />;
  if (error) return <ErrorMessage error={error} />;

  const memes = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {memes.map((meme) => (
            <MemeCard key={meme.id} meme={meme} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {memes.map((meme) => (
            <MemeListItem key={meme.id} meme={meme} />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
```

#### 4.4 Upload Component with Drag & Drop
```tsx
// frontend/src/features/upload/components/UploadZone.tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUpload } from '../hooks/useUpload';

export function UploadZone() {
  const [files, setFiles] = useState<File[]>([]);
  const { mutate: uploadFiles, isPending } = useUpload();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
    multiple: true,
  });

  const handleUpload = () => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));

    uploadFiles(formData, {
      onSuccess: () => {
        setFiles([]);
        toast.success('Files uploaded successfully');
      },
    });
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop files here, or click to select'}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <FilePreview
              key={index}
              file={file}
              onRemove={() => setFiles(files.filter((_, i) => i !== index))}
            />
          ))}

          <Button
            onClick={handleUpload}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? 'Uploading...' : `Upload ${files.length} files`}
          </Button>
        </div>
      )}
    </div>
  );
}
```

#### 4.5 Real-time Updates with Socket.io
```typescript
// frontend/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

class SocketManager {
  private socket: Socket | null = null;

  connect() {
    const token = useAuthStore.getState().token;

    this.socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('meme:status', (data) => {
      // Update meme status in UI
      queryClient.invalidateQueries(['meme', data.id]);
    });

    this.socket.on('meme:description', (data) => {
      // Update meme description in UI
      queryClient.setQueryData(['meme', data.id], (old) => ({
        ...old,
        description: data.description,
      }));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketManager = new SocketManager();
```

### Phase 5: Feature Implementation (Week 6-7)

#### 5.1 Folder Monitoring System
```ruby
# backend/app/jobs/folder_watcher_job.rb
class FolderWatcherJob < ApplicationJob
  queue_as :default

  def perform(folder_id)
    folder = Folder.find(folder_id)

    # Get current files in folder
    current_files = Dir.glob(File.join(folder.path, '**', '*.{jpg,jpeg,png,webp,gif}'))

    # Get known files from database
    known_files = folder.memes.pluck(:file_path)

    # Find new files
    new_files = current_files - known_files

    new_files.each do |file_path|
      meme = folder.memes.create!(
        file_path: file_path,
        name: File.basename(file_path),
        status: 'pending'
      )

      ProcessImageJob.perform_later(
        meme_id: meme.id,
        image_path: file_path
      )
    end

    # Schedule next check
    FolderWatcherJob.set(wait: 5.minutes).perform_later(folder_id)
  end
end
```

#### 5.2 Advanced Search Implementation
```typescript
// frontend/src/features/search/components/SearchInterface.tsx
import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useSearch } from '../hooks/useSearch';
import { SearchResults } from './SearchResults';
import { SearchFilters } from './SearchFilters';

export function SearchInterface() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('keyword');
  const [filters, setFilters] = useState({});

  const { data, mutate: search, isPending } = useSearch();

  const handleSearch = () => {
    search({
      query,
      type: searchType,
      filters,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search memes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Select
            value={searchType}
            onValueChange={setSearchType}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keyword">Keyword</SelectItem>
              <SelectItem value="semantic">Semantic</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={isPending}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <SearchFilters
        filters={filters}
        onChange={setFilters}
      />

      {data && <SearchResults results={data} />}
    </div>
  );
}
```

#### 5.3 Performance Optimization
```ruby
# backend/app/services/cache_service.rb
class CacheService
  def self.fetch(key, expires_in: 1.hour)
    Rails.cache.fetch(key, expires_in: expires_in) do
      yield
    end
  end

  def self.invalidate_meme(meme_id)
    Rails.cache.delete("meme:#{meme_id}")
    Rails.cache.delete_matched("memes:*")
  end
end

# backend/app/controllers/api/v1/memes_controller.rb
class Api::V1::MemesController < Api::V1::BaseController
  def show
    meme = CacheService.fetch("meme:#{params[:id]}") do
      Meme.includes(:tags, :folder, :embeddings)
          .find(params[:id])
    end

    render json: MemeSerializer.new(meme)
  end
end
```

## Detailed Component Design

### Frontend Components Architecture

#### Core Components
```typescript
// Component hierarchy
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserMenu
│   ├── Sidebar
│   │   ├── FolderTree
│   │   ├── TagList
│   │   └── ModelSelector
│   └── MainContent
│       └── <RouterOutlet>
├── Pages
│   ├── HomePage
│   │   └── MemeGallery
│   ├── SearchPage
│   │   └── SearchInterface
│   ├── UploadPage
│   │   └── UploadZone
│   └── SettingsPage
│       ├── ModelSettings
│       ├── FolderSettings
│       └── TagSettings
└── Providers
    ├── AuthProvider
    ├── ThemeProvider
    └── SocketProvider
```

### API Endpoints

```yaml
Authentication:
  POST   /api/v1/auth/login
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/refresh

Memes:
  GET    /api/v1/memes
  GET    /api/v1/memes/:id
  POST   /api/v1/memes
  PUT    /api/v1/memes/:id
  DELETE /api/v1/memes/:id
  POST   /api/v1/memes/search
  POST   /api/v1/memes/batch_upload
  POST   /api/v1/memes/:id/generate_description

Tags:
  GET    /api/v1/tags
  POST   /api/v1/tags
  PUT    /api/v1/tags/:id
  DELETE /api/v1/tags/:id

Folders:
  GET    /api/v1/folders
  POST   /api/v1/folders
  PUT    /api/v1/folders/:id
  DELETE /api/v1/folders/:id
  POST   /api/v1/folders/:id/watch
  DELETE /api/v1/folders/:id/unwatch

Settings:
  GET    /api/v1/settings
  PUT    /api/v1/settings

WebSocket Events:
  meme:status
  meme:description
  folder:new_files
  processing:progress
```

## Migration Strategy

### Data Migration Plan

#### Step 1: Database Schema Updates
```sql
-- Add new columns for API support
ALTER TABLE memes ADD COLUMN user_id INTEGER;
ALTER TABLE memes ADD COLUMN visibility VARCHAR DEFAULT 'private';
ALTER TABLE memes ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX idx_memes_user_id ON memes(user_id);
CREATE INDEX idx_memes_visibility ON memes(visibility);
CREATE INDEX idx_memes_metadata ON memes USING gin(metadata);

-- Create new tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  encrypted_password VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  key VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Step 2: Gradual Migration Process
```ruby
# Migration script
class MigrateExistingData < ActiveRecord::Migration[7.0]
  def up
    # Create default user for existing data
    default_user = User.create!(
      email: 'admin@meme-search.local',
      password: SecureRandom.hex(16)
    )

    # Associate existing memes with default user
    Meme.update_all(user_id: default_user.id)

    # Migrate image paths to folders
    ImagePath.find_each do |image_path|
      Folder.create!(
        name: image_path.name,
        path: image_path.path,
        user_id: default_user.id,
        watch_enabled: false
      )
    end
  end
end
```

### Rollback Strategy

```yaml
Rollback Checkpoints:
  1. Before any code changes (git tag)
  2. After database backup
  3. After each major phase completion

Rollback Procedures:
  - Database: pg_restore from backup
  - Code: git reset to checkpoint tag
  - Docker: Use previous image tags
  - Data: Restore from S3 backup

Testing Rollback:
  - Practice rollback in staging
  - Document rollback time (RTO)
  - Verify data integrity post-rollback
```

## Testing Strategy

### Frontend Testing
```typescript
// Unit Test Example
// frontend/src/features/memes/hooks/useMemes.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useMemes } from './useMemes';

describe('useMemes', () => {
  it('should fetch memes successfully', async () => {
    const { result } = renderHook(() => useMemes());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(20);
  });
});

// Integration Test Example
// frontend/src/features/upload/UploadZone.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadZone } from './UploadZone';

describe('UploadZone', () => {
  it('should handle file drop', async () => {
    render(<UploadZone />);

    const dropzone = screen.getByText(/drag & drop/i);
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText('test.png')).toBeInTheDocument();
  });
});
```

### Backend Testing
```ruby
# spec/requests/api/v1/memes_spec.rb
RSpec.describe 'Memes API', type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  describe 'GET /api/v1/memes' do
    it 'returns paginated memes' do
      create_list(:meme, 25, user: user)

      get '/api/v1/memes', headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].size).to eq(20)
      expect(json_response['meta']['total_pages']).to eq(2)
    end
  end

  describe 'POST /api/v1/memes/:id/generate_description' do
    let(:meme) { create(:meme, user: user) }

    it 'queues description generation job' do
      expect {
        post "/api/v1/memes/#{meme.id}/generate_description",
             headers: headers,
             params: { model: 'Florence-2-base' }
      }.to have_enqueued_job(ProcessImageJob)

      expect(response).to have_http_status(:ok)
      expect(json_response['status']).to eq('queued')
    end
  end
end
```

### E2E Testing
```typescript
// e2e/upload-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete upload flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to upload
  await page.click('text=Upload');

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-meme.jpg');

  // Wait for upload
  await page.click('text=Upload 1 file');
  await expect(page.locator('text=Upload successful')).toBeVisible();

  // Verify meme appears in gallery
  await page.click('text=Gallery');
  await expect(page.locator('img[alt="test-meme.jpg"]')).toBeVisible();
});
```

## Deployment Architecture

### Production Docker Compose
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - frontend_build:/usr/share/nginx/html
    depends_on:
      - backend

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend.Dockerfile
    volumes:
      - frontend_build:/app/dist
    command: npm run build

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgresql://postgres:password@postgres:5432/meme_search
      REDIS_URL: redis://redis:6379
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
    volumes:
      - ./memes:/app/public/memes
      - ./uploads:/app/public/uploads
    depends_on:
      - postgres
      - redis

  ml-service:
    build:
      context: ./ml-service
      dockerfile: ../docker/ml-service.Dockerfile
    environment:
      REDIS_URL: redis://redis:6379
      API_URL: http://backend:3000
      MODEL_CACHE_DIR: /app/models
      PYTORCH_CUDA_ALLOC_CONF: max_split_size_mb:512
    volumes:
      - ./models:/app/models
      - ./memes:/app/memes:ro
    deploy:
      resources:
        limits:
          memory: 8GB
        reservations:
          memory: 4GB
    depends_on:
      - redis
      - backend

  sidekiq:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    command: bundle exec sidekiq
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgresql://postgres:password@postgres:5432/meme_search
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: meme_search
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  frontend_build:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment (Alternative)
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meme-search-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: meme-search/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: RAILS_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meme-search-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: meme-search/frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## Performance Optimization

### Frontend Optimizations
```typescript
// Code splitting
const MemeGallery = lazy(() => import('./features/memes/MemeGallery'));
const SearchInterface = lazy(() => import('./features/search/SearchInterface'));

// Image optimization
<img
  src={`/api/v1/images/${meme.id}/thumbnail`}
  srcSet={`
    /api/v1/images/${meme.id}/thumbnail 1x,
    /api/v1/images/${meme.id}/medium 2x
  `}
  loading="lazy"
  decoding="async"
/>

// Virtual scrolling for large lists
import { VirtualList } from '@tanstack/react-virtual';

// Memoization
const MemoizedMemeCard = memo(MemeCard, (prev, next) => {
  return prev.meme.id === next.meme.id &&
         prev.meme.updated_at === next.meme.updated_at;
});
```

### Backend Optimizations
```ruby
# Query optimization
class Meme < ApplicationRecord
  scope :with_associations, -> {
    includes(:tags, :folder)
    .select('memes.*, COUNT(tags.id) as tags_count')
    .left_joins(:tags)
    .group('memes.id')
  }
end

# Caching strategy
class MemesController < ApplicationController
  def index
    memes = Rails.cache.fetch(['memes', params], expires_in: 10.minutes) do
      Meme.with_associations
          .page(params[:page])
          .to_a
    end
  end
end

# Database indexing
add_index :memes, [:user_id, :created_at]
add_index :memes, :status
add_index :embeddings, :meme_id
```

### ML Processing Optimizations
```typescript
// Batch processing
async function processBatch(images: string[]) {
  const batch = await Promise.all(
    images.map(img => preprocessImage(img))
  );

  const results = await model.run({
    pixel_values: batch
  });

  return results.map((result, i) => ({
    image: images[i],
    description: decodeOutput(result)
  }));
}

// Model caching
const modelCache = new Map();

async function getModel(name: string) {
  if (!modelCache.has(name)) {
    const model = await InferenceSession.create(`./models/${name}`);
    modelCache.set(name, model);
  }
  return modelCache.get(name);
}
```

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Model accuracy degradation | Medium | High | Extensive testing, A/B comparison |
| Performance regression | Medium | High | Load testing, monitoring |
| Complex deployment | High | Medium | Docker compose, documentation |
| SEO impact | High | Medium | Consider Next.js or SSR |
| Bundle size growth | Medium | Medium | Code splitting, tree shaking |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Extended development time | Medium | High | Phased approach, MVP first |
| User adoption issues | Low | Medium | Gradual rollout, user testing |
| Maintenance complexity | Medium | Medium | Documentation, training |

## Timeline and Milestones

### 7-Week Implementation Schedule

```mermaid
gantt
    title Implementation Timeline
    dateFormat YYYY-MM-DD
    section Foundation
    Project Setup           :2024-01-01, 7d
    Environment Config      :7d
    CI/CD Pipeline         :7d

    section ML Optimization
    Python Service Refactor :2024-01-08, 7d
    Redis Queue Setup      :7d
    Performance Testing    :7d

    section Backend
    API Development        :2024-01-15, 14d
    Authentication         :7d
    WebSocket Setup        :7d

    section Frontend
    React Setup            :2024-01-22, 7d
    Core Components        :14d
    Feature Implementation :14d

    section Integration
    API Integration        :2024-02-05, 7d
    E2E Testing           :7d
    Performance Testing    :7d

    section Deployment
    Docker Setup           :2024-02-12, 3d
    Documentation         :4d
    Production Deploy      :2024-02-19, 2d
```

### Milestones

**Week 2**: Development environment ready, CI/CD operational
**Week 3**: Optimized Python ML service with Redis queue
**Week 4**: Backend API complete with authentication
**Week 5**: Frontend MVP with core features
**Week 6**: Full integration with real-time updates
**Week 7**: Production deployment ready

## Success Metrics

### Performance KPIs
- Page load time < 2 seconds
- Search response time < 500ms
- Image processing time < 10 seconds
- 99.9% uptime

### User Experience KPIs
- File upload success rate > 95%
- Search relevance score > 80%
- UI responsiveness score > 90
- Error rate < 1%

### Technical KPIs
- Test coverage > 80%
- Build time < 5 minutes
- Docker image size < 500MB
- Memory usage < 2GB

## Conclusion

This Rails API + React SPA architecture provides a modern, scalable solution that addresses all requirements while maintaining flexibility for future growth. The phased approach minimizes risk while delivering incremental value throughout the implementation process.