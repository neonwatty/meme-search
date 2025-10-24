# Option 3: Rails Hybrid with React Islands Architecture - Detailed Implementation Plan

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Implementation Strategy](#implementation-strategy)
5. [Project Structure](#project-structure)
6. [Implementation Phases](#implementation-phases)
7. [Component Architecture](#component-architecture)
8. [React Islands Integration](#react-islands-integration)
9. [shadcn/ui Implementation](#shadcnui-implementation)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Architecture](#deployment-architecture)
12. [Performance Optimization](#performance-optimization)
13. [Migration Path](#migration-path)
14. [Risk Assessment](#risk-assessment)
15. [Timeline and Milestones](#timeline-and-milestones)

## Executive Summary

This plan presents a hybrid architecture that combines Rails server-side rendering with React "islands" of interactivity. By embedding React components (including shadcn/ui) within Rails views, we achieve a modern, polished UX without the complexity of a full SPA architecture.

### Key Benefits
- **Best of Both Worlds**: Server-side rendering for SEO/performance + React for rich interactions
- **Modern UI Components**: Full access to shadcn/ui and React ecosystem
- **Progressive Enhancement**: Pages work without JavaScript, enhanced when available
- **Simplified Architecture**: Single Rails app with embedded React (not separate SPA)
- **Gradual Migration**: Can migrate page-by-page from current system
- **Developer Experience**: Use React for complex UI, Rails for everything else

### Key Challenges
- **Build System Complexity**: Managing ESBuild for JSX compilation
- **State Management**: Coordinating between Rails and React components
- **Component Boundaries**: Deciding what should be React vs Rails
- **Testing**: Need both Rails and React testing strategies

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Rails HTML Pages with React Islands                    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  • Initial HTML from Rails (SEO-friendly)               ││
│  │  • React components hydrate specific divs                ││
│  │  • shadcn/ui components for rich interactions            ││
│  │  • Turbo for page navigation                            ││
│  │  • Stimulus for simple interactions                     ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────┼───────────────────────────┐
│                                  ▼                            │
│              Rails Application (Hybrid Mode)                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 Presentation Layer                       ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  • ViewComponents (server-side)                         ││
│  │  • React Islands (client-side)                          ││
│  │  • Shared Tailwind CSS                                  ││
│  │  • ESBuild for JSX compilation                          ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 Application Layer                        ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  • Controllers (serving HTML + JSON)                    ││
│  │  • Services (business logic)                            ││
│  │  • Jobs (background processing)                         ││
│  │  • ActionCable (real-time)                             ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Data Layer                           ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  • ActiveRecord Models                                  ││
│  │  • PostgreSQL + pgvector                                ││
│  │  • Redis (caching + queues)                             ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────┼───────────────────────────┐
│                                  ▼                            │
│            Python ML Service (Unchanged)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • FastAPI for inference API                            ││
│  │  • Vision-Language Models                               ││
│  │  • Redis Queue Integration                              ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

```
1. Browser Request
      ↓
2. Rails Router
      ↓
3. Controller Action
      ↓
4. Render HTML View
   (with React mount points)
      ↓
5. Browser receives HTML
   (page is usable)
      ↓
6. JavaScript loads
      ↓
7. React hydrates islands
   (enhanced interactivity)
      ↓
8. User interactions handled by:
   - React components (complex)
   - Stimulus (simple)
   - Turbo (navigation)
```

## Technology Stack

### Core Stack
```yaml
Framework:
  - Ruby: 3.3.x
  - Rails: 7.2.x
  - React: 18.3.x
  - TypeScript: 5.x

Build System:
  - ESBuild: via jsbundling-rails
  - PostCSS: via cssbundling-rails
  - No Webpack/Webpacker needed

UI Components:
  - shadcn/ui: Latest (React islands)
  - ViewComponent: 3.x (server components)
  - TailwindCSS: 3.4.x (shared styles)
  - Radix UI: Latest (shadcn dependencies)

JavaScript:
  - Turbo: 8.x (navigation)
  - Stimulus: 3.x (simple interactions)
  - React: 18.x (complex components)
  - TypeScript: For React components

Database & Caching:
  - PostgreSQL: 17.x
  - pgvector: Latest
  - Redis: 7.x

Background Processing:
  - Sidekiq: 7.x
  - ActionCable: For real-time

Testing:
  - RSpec: Rails tests
  - Capybara: Integration tests
  - React Testing Library: Component tests
  - Jest: JavaScript unit tests
```

### NPM Dependencies
```json
{
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "esbuild": "^0.20.0",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "tailwind-merge": "^2.3.0",
    "@tanstack/react-query": "^5.0.0",
    "react-dropzone": "^14.2.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0"
  }
}
```

## Implementation Strategy

### Component Decision Matrix

| Component Type | Use React Island | Use ViewComponent | Use Stimulus |
|---------------|------------------|-------------------|--------------|
| Gallery Grid | ✅ (complex interactions) | | |
| Upload Dropzone | ✅ (drag & drop) | | |
| Search Interface | ✅ (autocomplete) | | |
| Navigation | | ✅ (server-side) | |
| Static Cards | | ✅ (no interaction) | |
| Simple Toggles | | | ✅ |
| Forms | ✅ (complex) | ✅ (simple) | |
| Modals | ✅ (shadcn/ui) | | |

### Hybrid Rendering Strategy

```ruby
# app/controllers/memes_controller.rb
class MemesController < ApplicationController
  def index
    @memes = Meme.page(params[:page])

    respond_to do |format|
      format.html # Renders with React islands
      format.json { render json: @memes } # For React components
    end
  end
end
```

```erb
<!-- app/views/memes/index.html.erb -->
<div class="container mx-auto">
  <!-- Server-rendered header -->
  <%= render HeaderComponent.new(title: "Meme Gallery") %>

  <!-- React Island for gallery -->
  <div id="meme-gallery"
       data-react-component="MemeGallery"
       data-props='<%= {
         memes: @memes.as_json,
         viewMode: "grid",
         apiEndpoint: memes_path(format: :json)
       }.to_json %>'>

    <!-- Fallback content for SSR/no-JS -->
    <%= render partial: 'meme', collection: @memes %>
  </div>

  <!-- Server-rendered pagination -->
  <%= render PaginationComponent.new(collection: @memes) %>
</div>
```

## Project Structure

```
meme-search/
├── app/
│   ├── assets/
│   │   ├── builds/           # ESBuild output
│   │   │   ├── application.js
│   │   │   └── application.css
│   │   └── stylesheets/
│   │       └── application.tailwind.css
│   ├── components/           # ViewComponents
│   │   ├── application_component.rb
│   │   ├── ui/              # Server-side UI components
│   │   │   ├── button_component.rb
│   │   │   ├── card_component.rb
│   │   │   └── modal_component.rb
│   │   └── layout/
│   │       ├── header_component.rb
│   │       └── footer_component.rb
│   ├── javascript/           # React + Stimulus
│   │   ├── application.js   # Entry point
│   │   ├── components/       # React components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── command.tsx
│   │   │   ├── MemeGallery.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── UploadZone.tsx
│   │   ├── controllers/      # Stimulus controllers
│   │   │   ├── toggle_controller.js
│   │   │   └── autosave_controller.js
│   │   ├── lib/
│   │   │   ├── utils.ts     # shadcn utils
│   │   │   └── api-client.ts
│   │   └── react-islands.tsx # Mounting logic
│   ├── controllers/
│   │   ├── application_controller.rb
│   │   ├── memes_controller.rb
│   │   └── api/
│   │       └── v1/
│   │           └── memes_controller.rb # JSON API for React
│   ├── views/
│   │   ├── layouts/
│   │   │   └── application.html.erb
│   │   └── memes/
│   │       ├── index.html.erb
│   │       ├── show.html.erb
│   │       └── _meme.html.erb
│   └── services/
│       └── ml/
│           └── client.rb     # ML service communication
├── config/
│   ├── importmap.rb         # For non-React JS
│   ├── tailwind.config.js   # Shared Tailwind config
│   └── routes.rb
├── package.json             # NPM dependencies
├── tsconfig.json           # TypeScript config
├── components.json         # shadcn/ui config
├── esbuild.config.mjs      # ESBuild configuration
└── Procfile.dev           # Development servers
```

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)

#### 1.1 Rails Configuration
```bash
# Add to Gemfile
gem 'jsbundling-rails'
gem 'cssbundling-rails'
gem 'view_component'

# Install
bundle install
rails javascript:install:esbuild
rails css:install:tailwind
```

#### 1.2 ESBuild Configuration
```javascript
// esbuild.config.mjs
import * as esbuild from 'esbuild'
import rails from 'esbuild-rails'

esbuild.build({
  entryPoints: ['app/javascript/application.js'],
  bundle: true,
  sourcemap: process.env.NODE_ENV !== 'production',
  format: 'esm',
  outdir: 'app/assets/builds',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'jsx'
  },
  plugins: [rails()],
  define: {
    'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`
  }
})
```

#### 1.3 TypeScript Setup
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/javascript/*"],
      "@/components/*": ["app/javascript/components/*"]
    }
  },
  "include": ["app/javascript/**/*"],
  "exclude": ["node_modules"]
}
```

### Phase 2: React Islands Infrastructure (Week 2)

#### 2.1 React Mounting System
```typescript
// app/javascript/react-islands.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Import all React components
import MemeGallery from './components/MemeGallery'
import SearchBar from './components/SearchBar'
import UploadZone from './components/UploadZone'

const components = {
  MemeGallery,
  SearchBar,
  UploadZone
}

const queryClient = new QueryClient()

document.addEventListener('DOMContentLoaded', () => {
  // Find all React mount points
  const islands = document.querySelectorAll('[data-react-component]')

  islands.forEach(island => {
    const componentName = island.dataset.reactComponent
    const Component = components[componentName]

    if (!Component) {
      console.error(`Component ${componentName} not found`)
      return
    }

    // Parse props from data attribute
    const props = island.dataset.props
      ? JSON.parse(island.dataset.props)
      : {}

    // Create React root and render
    const root = createRoot(island)
    root.render(
      <QueryClientProvider client={queryClient}>
        <Component {...props} />
      </QueryClientProvider>
    )
  })
})

// Support for Turbo navigation
document.addEventListener('turbo:load', () => {
  // Re-mount React components after Turbo navigation
  mountReactIslands()
})
```

#### 2.2 ViewComponent Base Class
```ruby
# app/components/react_component.rb
class ReactComponent < ApplicationComponent
  def initialize(component_name:, props: {}, fallback: nil)
    @component_name = component_name
    @props = props
    @fallback = fallback
  end

  def call
    content_tag :div,
                @fallback,
                id: dom_id,
                data: {
                  react_component: @component_name,
                  props: @props.to_json
                }
  end

  private

  def dom_id
    "react-#{@component_name.underscore}-#{SecureRandom.hex(4)}"
  end
end
```

### Phase 3: shadcn/ui Setup (Week 3)

#### 3.1 Install shadcn/ui
```bash
npx shadcn-ui@latest init
# Choose: TypeScript, Tailwind CSS, app/javascript/components
```

#### 3.2 Configure Components
```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/assets/stylesheets/application.tailwind.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

#### 3.3 Example shadcn/ui Component
```tsx
// app/javascript/components/MemeCard.tsx
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface MemeCardProps {
  meme: {
    id: number
    url: string
    description: string
    tags: string[]
  }
  onEdit?: (id: number) => void
}

export function MemeCard({ meme, onEdit }: MemeCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <img
          src={meme.url}
          alt={meme.description}
          className="w-full h-48 object-cover"
        />
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4">
        <p className="text-sm text-muted-foreground mb-2">
          {meme.description}
        </p>
        <div className="flex gap-1 flex-wrap">
          {meme.tags.map(tag => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        {onEdit && (
          <Button
            onClick={() => onEdit(meme.id)}
            size="sm"
            className="mt-2"
          >
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
```

### Phase 4: Core Features Implementation (Week 4-5)

#### 4.1 Meme Gallery (React Island)
```tsx
// app/javascript/components/MemeGallery.tsx
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MemeCard } from './MemeCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface MemeGalleryProps {
  initialMemes: any[]
  apiEndpoint: string
}

export function MemeGallery({ initialMemes, apiEndpoint }: MemeGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)

  const { data: memes, isLoading } = useQuery({
    queryKey: ['memes', page],
    queryFn: () => fetch(`${apiEndpoint}?page=${page}`).then(r => r.json()),
    initialData: initialMemes,
    staleTime: 5 * 60 * 1000
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={viewMode === 'grid'
        ? 'grid grid-cols-4 gap-4'
        : 'space-y-4'}>
        {memes.map(meme => (
          <MemeCard key={meme.id} meme={meme} />
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-6">
        <Button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

#### 4.2 Upload Component (React Island)
```tsx
// app/javascript/components/UploadZone.tsx
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'

export function UploadZone({ uploadUrl }: { uploadUrl: string }) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    const formData = new FormData()

    acceptedFiles.forEach(file => {
      formData.append('files[]', file)
    })

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]')?.content || ''
        }
      })

      if (response.ok) {
        toast({
          title: "Upload successful",
          description: `${acceptedFiles.length} files uploaded`
        })
        // Trigger Turbo refresh
        window.Turbo.visit(window.location.href)
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [uploadUrl])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
    }
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">
        {isDragActive
          ? 'Drop the files here...'
          : 'Drag & drop files here, or click to select'}
      </p>
      {uploading && (
        <Progress value={progress} className="mt-4" />
      )}
    </div>
  )
}
```

### Phase 5: Testing & Deployment (Week 6)

#### 5.1 Testing Strategy
```ruby
# spec/system/react_islands_spec.rb
require 'rails_helper'

RSpec.describe "React Islands", type: :system, js: true do
  it "renders React gallery component" do
    create_list(:meme, 10)
    visit memes_path

    # Check React component mounted
    expect(page).to have_css('[data-react-component="MemeGallery"]')

    # Check interactive features work
    select 'List', from: 'View mode'
    expect(page).to have_css('.space-y-4')
  end
end
```

```typescript
// app/javascript/components/__tests__/MemeCard.test.tsx
import { render, screen } from '@testing-library/react'
import { MemeCard } from '../MemeCard'

describe('MemeCard', () => {
  it('renders meme information', () => {
    const meme = {
      id: 1,
      url: '/test.jpg',
      description: 'Test meme',
      tags: ['funny', 'cat']
    }

    render(<MemeCard meme={meme} />)

    expect(screen.getByText('Test meme')).toBeInTheDocument()
    expect(screen.getByText('funny')).toBeInTheDocument()
  })
})
```

## Component Architecture

### React Islands vs ViewComponents Decision Tree

```
Is the component interactive?
├─ No → ViewComponent
└─ Yes → Is it complex?
    ├─ No → Stimulus Controller
    └─ Yes → React Island
        └─ Does it need shadcn/ui?
            ├─ Yes → Use shadcn/ui component
            └─ No → Custom React component
```

### Component Communication

```typescript
// app/javascript/lib/event-bus.ts
class EventBus extends EventTarget {
  emit(event: string, data?: any) {
    this.dispatchEvent(new CustomEvent(event, { detail: data }))
  }
}

export const eventBus = new EventBus()

// React component can emit events
eventBus.emit('meme:selected', { id: meme.id })

// Stimulus controllers can listen
// app/javascript/controllers/meme_controller.js
connect() {
  window.eventBus.addEventListener('meme:selected', this.handleSelection)
}
```

## React Islands Integration

### Server-Side Helpers
```ruby
# app/helpers/react_helper.rb
module ReactHelper
  def react_component(name, props: {}, fallback: nil, **html_options)
    content_tag :div,
                fallback,
                data: {
                  react_component: name,
                  props: props.to_json
                },
                **html_options
  end
end
```

### Turbo Integration
```javascript
// app/javascript/turbo-react.js
import { mountReactIslands } from './react-islands'

// Re-mount React components after Turbo navigation
document.addEventListener('turbo:load', mountReactIslands)
document.addEventListener('turbo:frame-load', mountReactIslands)

// Clean up before cache
document.addEventListener('turbo:before-cache', () => {
  document.querySelectorAll('[data-react-component]').forEach(el => {
    // Store current HTML for cache
    el.dataset.cachedHtml = el.innerHTML
  })
})
```

## shadcn/ui Implementation

### Component Library Setup
```bash
# Install shadcn/ui components as needed
npx shadcn-ui@latest add button card dialog select
npx shadcn-ui@latest add form input label
npx shadcn-ui@latest add toast dropdown-menu
npx shadcn-ui@latest add command popover
```

### Theme Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/views/**/*.erb',
    './app/components/**/*.erb',
    './app/javascript/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... rest of shadcn theme
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## Testing Strategy

### Test Stack
- **Rails**: RSpec + Capybara
- **React**: Jest + React Testing Library
- **E2E**: Playwright or Cypress

### Test Organization
```
spec/
├── system/           # Full integration tests
├── requests/         # API endpoint tests
├── components/       # ViewComponent tests
└── javascript/       # React component tests
    ├── components/
    └── setup.js
```

## Deployment Architecture

### Docker Configuration
```dockerfile
# Dockerfile
FROM ruby:3.3.2-node AS base

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-client \
    nodejs \
    npm

WORKDIR /app

# Install Ruby gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Install Node packages
COPY package.json package-lock.json ./
RUN npm ci

# Copy application
COPY . .

# Build assets (React + CSS)
RUN npm run build
RUN bundle exec rails assets:precompile

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
    volumes:
      - ./models:/app/models
      - ./memes:/app/memes:ro

  sidekiq:
    build: .
    command: bundle exec sidekiq
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgresql://postgres:password@db:5432/meme_search
      REDIS_URL: redis://redis:6379/0

  db:
    image: pgvector/pgvector:pg17
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Performance Optimization

### Bundle Optimization
```javascript
// esbuild.config.mjs - Production config
{
  minify: true,
  splitting: true,
  treeShaking: true,
  metafile: true,
  chunkNames: 'chunks/[name]-[hash]',
  entryNames: '[name]-[hash]'
}
```

### React Lazy Loading
```tsx
// app/javascript/components/LazyGallery.tsx
import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const MemeGallery = lazy(() => import('./MemeGallery'))

export function LazyGallery(props) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <MemeGallery {...props} />
    </Suspense>
  )
}
```

### Rails Caching
```erb
<!-- app/views/memes/index.html.erb -->
<% cache ['memes-page', params[:page], @memes.maximum(:updated_at)] do %>
  <%= render @memes %>
<% end %>
```

## Migration Path

### Phase 1: Prepare Current System
1. Ensure tests are passing
2. Document current API endpoints
3. Backup database
4. Tag current version in git

### Phase 2: Parallel Development
1. Create new branch for hybrid system
2. Set up Rails + React infrastructure
3. Keep existing routes working
4. Add new hybrid routes alongside

### Phase 3: Gradual Migration
```ruby
# config/routes.rb
Rails.application.routes.draw do
  # New hybrid routes
  namespace :hybrid do
    resources :memes
  end

  # Keep existing routes
  resources :image_cores

  # Feature flag for switching
  if ENV['USE_HYBRID']
    root 'hybrid/memes#index'
  else
    root 'image_cores#index'
  end
end
```

### Phase 4: Cutover
1. Test hybrid system thoroughly
2. Switch feature flag
3. Monitor for issues
4. Remove old code after stability confirmed

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Build system complexity | Medium | Medium | Use standard ESBuild config, document thoroughly |
| React hydration issues | Low | Medium | Test SSR fallbacks, use stable component keys |
| State sync problems | Medium | Low | Use clear boundaries between Rails and React |
| Bundle size growth | Medium | Medium | Code splitting, lazy loading, tree shaking |
| SEO degradation | Low | High | Ensure SSR fallbacks, test with JS disabled |

### Migration Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss | Low | Critical | Comprehensive backups, staged rollout |
| Performance regression | Low | Medium | Benchmark before/after, monitoring |
| User confusion | Low | Low | Gradual UI changes, user communication |

## Timeline and Milestones

### 6-Week Implementation Schedule

```
Week 1: Foundation
- Rails + ESBuild setup
- React infrastructure
- TypeScript configuration
- Development environment

Week 2: Component Architecture
- ViewComponent setup
- React islands system
- shadcn/ui installation
- Component communication

Week 3: Core Features
- Meme gallery (React)
- Upload component (React)
- Navigation (ViewComponent)
- Basic styling

Week 4: Advanced Features
- Search interface
- Real-time updates
- Settings pages
- ML integration

Week 5: Polish & Testing
- Component tests
- System tests
- Performance optimization
- Bug fixes

Week 6: Deployment
- Production build
- Docker configuration
- Documentation
- Launch
```

### Success Metrics

**Performance KPIs**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- React hydration time: < 500ms
- Bundle size: < 300KB gzipped

**Quality KPIs**
- Test coverage: > 80%
- Lighthouse score: > 90
- Zero hydration errors
- Works without JavaScript

**User Experience KPIs**
- Same or better than current system
- Smooth interactions
- Modern UI with shadcn/ui
- Mobile responsive

## Conclusion

The Rails Hybrid with React Islands architecture provides the perfect balance between server-side simplicity and client-side richness. By using Rails for routing, data, and basic rendering while embedding React components for complex interactions, we achieve:

1. **Modern UX** with shadcn/ui components
2. **SEO-friendly** server-side rendering
3. **Progressive enhancement** that works without JS
4. **Simplified deployment** compared to separate SPA
5. **Gradual migration** path from current system

This approach gives you the best of both worlds without the complexity of a full SPA or the limitations of pure server-side rendering.