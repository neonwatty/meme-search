# Option 4: Rails Monolith with Vite + React Islands Architecture

## Overview

This plan modernizes the meme-search application using a **Rails monolith with React Islands** approach powered by **Vite**. This architecture provides:

- **Server-side rendering** for fast initial loads and SEO
- **Selective React hydration** for rich interactivity where needed
- **Modern developer experience** with Vite's HMR and React Fast Refresh
- **Progressive enhancement** - pages work without JavaScript
- **Optimized Python ML service** retained for vision-language models

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Rails Monolith                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Rails Views (ERB + ViewComponents)                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │ Static HTML│  │React Island│  │Static HTML │     │   │
│  │  └────────────┘  └────────────┘  └────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Vite Build System                                   │   │
│  │  - React Fast Refresh (HMR)                          │   │
│  │  - shadcn/ui Components                              │   │
│  │  - Tailwind CSS                                      │   │
│  │  - TypeScript Support                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Rails Backend                                       │   │
│  │  - Controllers                                       │   │
│  │  - ActiveRecord Models                               │   │
│  │  - Background Jobs (Sidekiq)                         │   │
│  │  - ML Service Client (HTTParty)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │  + pgvector   │
                    └───────────────┘
                            ↓
                    ┌───────────────┐
                    │     Redis     │
                    │ (Jobs/Cache)  │
                    └───────────────┘
                            ↓
                ┌─────────────────────┐
                │  Python ML Service  │
                │    (FastAPI)        │
                │ - Florence-2        │
                │ - SmolVLM           │
                │ - Moondream2        │
                └─────────────────────┘
```

## Technology Stack

### Frontend
- **React 18**: Latest React with concurrent features
- **Vite 5**: Lightning-fast build tool with HMR
- **vite_rails gem**: Rails integration for Vite
- **shadcn/ui**: Beautiful, accessible component library
- **Tailwind CSS 3**: Utility-first CSS framework
- **TanStack Query v5**: Server state management
- **react-dropzone**: File upload with drag-and-drop
- **Lucide React**: Icon library (used by shadcn/ui)

### Backend (Rails)
- **Rails 7.2**: Latest stable Rails
- **ViewComponents**: Server-side component framework
- **Turbo**: SPA-like navigation (optional/selective)
- **Stimulus**: Lightweight JavaScript framework (for simple interactions)
- **Sidekiq**: Background job processing
- **HTTParty**: HTTP client for ML service

### ML Service (Retained)
- **Python 3.10+**: Runtime
- **FastAPI**: High-performance async framework
- **Transformers**: Hugging Face model library
- **PyTorch**: ML framework
- **Redis**: Job queue

### Database & Storage
- **PostgreSQL 15**: Primary database
- **pgvector**: Vector similarity search
- **Redis 7**: Cache and job queue
- **ActiveStorage**: File uploads

## Key Features of This Approach

### 1. React Islands Pattern
```erb
<!-- app/views/memes/index.html.erb -->
<div class="container mx-auto">
  <!-- Static HTML from Rails -->
  <h1 class="text-3xl font-bold">Meme Gallery</h1>

  <!-- React Island: Interactive Gallery -->
  <%= react_island "MemeGallery",
      props: {
        memes: @memes.as_json(include: [:tags]),
        currentUser: current_user&.slice(:id, :name),
        apiEndpoint: api_v1_memes_path
      },
      fallback: render(partial: "memes/static_grid", collection: @memes) do %>
    <!-- Fallback HTML for no-JS users -->
    <%= render partial: "memes/static_grid", collection: @memes %>
  <% end %>

  <!-- More static HTML -->
  <footer class="mt-8 text-gray-500">© 2024 Meme Search</footer>
</div>
```

### 2. Vite Configuration with HMR
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import ViteRuby from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    ViteRuby(),
    react({
      fastRefresh: true, // React Fast Refresh
      babel: {
        plugins: ['babel-plugin-macros']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/javascript'),
      '@/components': path.resolve(__dirname, './app/javascript/components'),
      '@/lib': path.resolve(__dirname, './app/javascript/lib'),
      '@/hooks': path.resolve(__dirname, './app/javascript/hooks')
    }
  },
  server: {
    hmr: {
      host: 'localhost',
      protocol: 'ws'
    }
  }
})
```

### 3. React Islands Mount System
```typescript
// app/javascript/entrypoints/react-islands.tsx
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MemeGallery from '@/components/MemeGallery'
import SearchBar from '@/components/SearchBar'
import UploadZone from '@/components/UploadZone'
import MemeDetail from '@/components/MemeDetail'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
})

const componentRegistry = {
  MemeGallery,
  SearchBar,
  UploadZone,
  MemeDetail
}

function mountReactIslands() {
  const islands = document.querySelectorAll('[data-react-component]')

  islands.forEach((island) => {
    const componentName = island.getAttribute('data-react-component')
    const Component = componentRegistry[componentName]

    if (!Component) {
      console.error(`Component ${componentName} not found in registry`)
      return
    }

    const propsJson = island.getAttribute('data-props')
    const props = propsJson ? JSON.parse(propsJson) : {}

    const root = createRoot(island)
    root.render(
      <QueryClientProvider client={queryClient}>
        <Component {...props} />
      </QueryClientProvider>
    )
  })
}

// Mount on page load
document.addEventListener('DOMContentLoaded', mountReactIslands)

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    mountReactIslands()
  })
}

// Turbo support (optional)
document.addEventListener('turbo:load', mountReactIslands)
document.addEventListener('turbo:before-cache', () => {
  // Clean up React roots before Turbo caches
  document.querySelectorAll('[data-react-component]').forEach((island) => {
    const root = createRoot(island)
    root.unmount()
  })
})
```

### 4. Rails Helper for React Islands
```ruby
# app/helpers/react_helper.rb
module ReactHelper
  def react_island(component_name, props: {}, fallback: nil, **html_options)
    # Serialize props to JSON
    props_json = props.to_json

    # Merge data attributes
    data_attrs = {
      react_component: component_name,
      props: props_json
    }

    # Combine with any existing data attributes
    html_options[:data] = (html_options[:data] || {}).merge(data_attrs)
    html_options[:class] = "react-island #{html_options[:class]}".strip

    content_tag(:div, fallback || "", html_options)
  end
end
```

## Implementation Plan

### Phase 1: Vite Setup (Week 1)

#### 1.1 Install Vite Rails
```bash
# Add gems
bundle add vite_rails

# Install Vite
bundle exec vite install

# Install React dependencies
npm install react react-dom
npm install -D @vitejs/plugin-react
npm install -D @types/react @types/react-dom
```

#### 1.2 Configure Vite
```ruby
# config/vite.json
{
  "all": {
    "sourceCodeDir": "app/javascript",
    "watchAdditionalPaths": ["app/components/**/*.rb"]
  },
  "development": {
    "autoBuild": true,
    "publicOutputDir": "vite-dev",
    "port": 3036
  },
  "production": {
    "buildCacheDir": "tmp/cache/vite",
    "publicOutputDir": "vite"
  }
}
```

#### 1.3 Update Application Layout
```erb
<!-- app/views/layouts/application.html.erb -->
<!DOCTYPE html>
<html>
  <head>
    <title>Meme Search</title>
    <%= csrf_meta_tags %>
    <%= csp_meta_tag %>

    <% if Rails.env.development? %>
      <%= vite_client_tag %>
      <%= vite_react_refresh_tag %>
    <% end %>

    <%= vite_stylesheet_tag 'application' %>
    <%= vite_javascript_tag 'application' %>
  </head>
  <body>
    <%= yield %>
  </body>
</html>
```

### Phase 2: Tailwind & shadcn/ui Setup (Week 1)

#### 2.1 Install Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 2.2 Configure Tailwind
```javascript
// tailwind.config.js
export default {
  content: [
    './app/views/**/*.html.erb',
    './app/helpers/**/*.rb',
    './app/javascript/**/*.{js,jsx,ts,tsx}',
    './app/components/**/*.{rb,erb}'
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
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // ... rest of shadcn colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

#### 2.3 Install shadcn/ui
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Install components we need
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add skeleton
```

#### 2.4 CSS Entry Point
```css
/* app/javascript/entrypoints/application.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode colors */
  }
}

@layer components {
  .react-island {
    @apply min-h-[200px];
  }
}
```

### Phase 3: Core React Components (Week 2-3)

#### 3.1 MemeGallery Component
```typescript
// app/javascript/components/MemeGallery.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Grid3x3, List } from 'lucide-react'
import MemeCard from './MemeCard'
import { apiClient } from '@/lib/api-client'

interface Meme {
  id: number
  title: string
  url: string
  description: string
  tags: string[]
  created_at: string
}

interface MemeGalleryProps {
  memes: Meme[]
  currentUser?: { id: number; name: string }
  apiEndpoint: string
}

export default function MemeGallery({
  memes: initialMemes,
  currentUser,
  apiEndpoint
}: MemeGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Use TanStack Query for real-time updates
  const { data: memes = initialMemes } = useQuery({
    queryKey: ['memes'],
    queryFn: () => apiClient.get(apiEndpoint),
    initialData: initialMemes,
    refetchInterval: 30000 // Refetch every 30s
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {memes.length} Memes
        </h2>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3x3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={
        viewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-4"
      }>
        {memes.map((meme) => (
          <MemeCard
            key={meme.id}
            meme={meme}
            viewMode={viewMode}
            currentUser={currentUser}
          />
        ))}
      </div>
    </div>
  )
}
```

#### 3.2 MemeCard Component
```typescript
// app/javascript/components/MemeCard.tsx
import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Download, Share2, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface Meme {
  id: number
  title: string
  url: string
  description: string
  tags: string[]
  created_at: string
}

interface MemeCardProps {
  meme: Meme
  viewMode: 'grid' | 'list'
  currentUser?: { id: number; name: string }
}

export default function MemeCard({ meme, viewMode, currentUser }: MemeCardProps) {
  const queryClient = useQueryClient()
  const [imageLoaded, setImageLoaded] = useState(false)

  const deleteMeme = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/memes/${meme.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memes'] })
    }
  })

  if (viewMode === 'list') {
    return (
      <Card className="flex flex-row overflow-hidden hover:shadow-lg transition-shadow">
        <div className="w-48 h-32 flex-shrink-0 bg-gray-100 relative">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <img
            src={meme.url}
            alt={meme.title}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        <div className="flex-1 p-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-semibold text-lg">{meme.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{meme.description}</p>
              <div className="flex gap-2 mt-2">
                {meme.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
            <MemeActions meme={meme} onDelete={() => deleteMeme.mutate()} />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="aspect-square bg-gray-100 relative">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <img
            src={meme.url}
            alt={meme.title}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-semibold">{meme.title}</h3>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{meme.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {meme.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
        <MemeActions meme={meme} onDelete={() => deleteMeme.mutate()} />
      </CardFooter>
    </Card>
  )
}

function MemeActions({ meme, onDelete }: { meme: Meme; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.open(meme.url, '_blank')}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

#### 3.3 UploadZone Component
```typescript
// app/javascript/components/UploadZone.tsx
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface UploadZoneProps {
  csrfToken: string
  uploadEndpoint: string
}

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export default function UploadZone({ csrfToken, uploadEndpoint }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: UploadFile) => {
      const formData = new FormData()
      formData.append('meme[file]', uploadFile.file)

      return apiClient.post(uploadEndpoint, formData, {
        headers: { 'X-CSRF-Token': csrfToken },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          )
          updateFileProgress(uploadFile.file.name, progress)
        }
      })
    },
    onSuccess: (data, uploadFile) => {
      updateFileStatus(uploadFile.file.name, 'success')
      queryClient.invalidateQueries({ queryKey: ['memes'] })
    },
    onError: (error, uploadFile) => {
      updateFileStatus(uploadFile.file.name, 'error', error.message)
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Auto-upload
    newFiles.forEach(uploadFile => {
      uploadMutation.mutate(uploadFile)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    multiple: true
  })

  const updateFileProgress = (fileName: string, progress: number) => {
    setFiles(prev => prev.map(f =>
      f.file.name === fileName
        ? { ...f, progress, status: 'uploading' }
        : f
    ))
  }

  const updateFileStatus = (
    fileName: string,
    status: UploadFile['status'],
    error?: string
  ) => {
    setFiles(prev => prev.map(f =>
      f.file.name === fileName
        ? { ...f, status, error }
        : f
    ))
  }

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.file.name !== fileName))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {isDragActive
                ? "Drop images here..."
                : "Drag & drop images here, or click to select"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Supports: PNG, JPG, GIF, WebP
            </p>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(uploadFile => (
            <Card key={uploadFile.file.name}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={uploadFile.preview}
                    alt={uploadFile.file.name}
                    className="w-16 h-16 object-cover rounded"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="mt-2" />
                    )}

                    {uploadFile.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {uploadFile.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    {(uploadFile.status === 'pending' || uploadFile.status === 'uploading') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.file.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Phase 4: API Client & Utilities (Week 3)

#### 4.1 API Client
```typescript
// app/javascript/lib/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api/v1',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    // Add CSRF token to requests
    this.client.interceptors.request.use((config) => {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      if (token) {
        config.headers['X-CSRF-Token'] = token
      }
      return config
    })

    // Handle errors globally
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        const message = error.response?.data?.error || error.message
        console.error('API Error:', message)
        throw new Error(message)
      }
    )
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config)
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config)
  }
}

export const apiClient = new ApiClient()
```

#### 4.2 Custom Hooks
```typescript
// app/javascript/hooks/useMemes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface Meme {
  id: number
  title: string
  url: string
  description: string
  tags: string[]
  created_at: string
}

export function useMemes() {
  return useQuery({
    queryKey: ['memes'],
    queryFn: () => apiClient.get<Meme[]>('/memes')
  })
}

export function useMeme(id: number) {
  return useQuery({
    queryKey: ['memes', id],
    queryFn: () => apiClient.get<Meme>(`/memes/${id}`)
  })
}

export function useSearchMemes(query: string) {
  return useQuery({
    queryKey: ['memes', 'search', query],
    queryFn: () => apiClient.get<Meme[]>('/memes/search', { params: { q: query } }),
    enabled: query.length > 0
  })
}

export function useDeleteMeme() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/memes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memes'] })
    }
  })
}
```

### Phase 5: Rails API Endpoints (Week 3-4)

#### 5.1 API Controller
```ruby
# app/controllers/api/v1/memes_controller.rb
module Api
  module V1
    class MemesController < ApplicationController
      skip_before_action :verify_authenticity_token, only: [:create, :update, :destroy]
      before_action :set_meme, only: [:show, :update, :destroy]

      def index
        @memes = Meme.includes(:tags)
                     .order(created_at: :desc)
                     .page(params[:page])
                     .per(params[:per_page] || 50)

        render json: @memes.as_json(include: :tags)
      end

      def show
        render json: @meme.as_json(include: :tags)
      end

      def search
        query = params[:q]

        @memes = if query.present?
          Meme.semantic_search(query, limit: 50)
        else
          Meme.all.order(created_at: :desc).limit(50)
        end

        render json: @memes.as_json(include: :tags)
      end

      def create
        @meme = Meme.new(meme_params)

        if @meme.save
          # Trigger async ML processing
          ProcessMemeJob.perform_later(@meme.id)

          render json: @meme.as_json(include: :tags), status: :created
        else
          render json: { errors: @meme.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @meme.update(meme_params)
          render json: @meme.as_json(include: :tags)
        else
          render json: { errors: @meme.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @meme.destroy
        head :no_content
      end

      private

      def set_meme
        @meme = Meme.find(params[:id])
      end

      def meme_params
        params.require(:meme).permit(:file, :title, :description, tag_list: [])
      end
    end
  end
end
```

#### 5.2 Routes
```ruby
# config/routes.rb
Rails.application.routes.draw do
  # Web routes (server-rendered pages)
  root "memes#index"

  resources :memes, only: [:index, :show, :new, :create] do
    collection do
      get :search
    end
  end

  # API routes (for React islands)
  namespace :api do
    namespace :v1 do
      resources :memes do
        collection do
          get :search
        end
      end

      resources :tags, only: [:index]
    end
  end

  # ML service proxy (optional)
  namespace :ml do
    post :process_image
    get :health
  end
end
```

### Phase 6: Background Jobs (Week 4)

#### 6.1 Meme Processing Job
```ruby
# app/jobs/process_meme_job.rb
class ProcessMemeJob < ApplicationJob
  queue_as :default

  retry_on MLServiceError, wait: :exponentially_longer, attempts: 3

  def perform(meme_id)
    meme = Meme.find(meme_id)

    # Download image from ActiveStorage
    image_path = download_image(meme)

    # Send to ML service
    response = MLServiceClient.process_image(
      image_path: image_path,
      model: 'florence-2-large' # or user preference
    )

    # Update meme with ML results
    meme.update!(
      description: response['caption'],
      raw_ml_output: response,
      processed_at: Time.current
    )

    # Generate embeddings
    GenerateEmbeddingJob.perform_later(meme_id)

  ensure
    # Cleanup temp file
    File.delete(image_path) if image_path && File.exist?(image_path)
  end

  private

  def download_image(meme)
    return meme.file.path if meme.file.attached?

    temp_file = Tempfile.new(['meme', File.extname(meme.url)])
    temp_file.binmode

    URI.open(meme.url) do |image|
      temp_file.write(image.read)
    end

    temp_file.flush
    temp_file.path
  end
end
```

#### 6.2 ML Service Client
```ruby
# app/services/ml_service_client.rb
class MLServiceClient
  include HTTParty

  base_uri ENV.fetch('ML_SERVICE_URL', 'http://localhost:8000')

  class MLServiceError < StandardError; end

  def self.process_image(image_path:, model: 'florence-2-large')
    response = post('/api/process',
      body: {
        image_path: image_path,
        model: model
      }.to_json,
      headers: { 'Content-Type' => 'application/json' },
      timeout: 30
    )

    raise MLServiceError, "ML service returned #{response.code}" unless response.success?

    response.parsed_response
  rescue HTTParty::Error => e
    raise MLServiceError, "Failed to connect to ML service: #{e.message}"
  end

  def self.health_check
    get('/health', timeout: 5)
  rescue StandardError => e
    { status: 'error', message: e.message }
  end
end
```

### Phase 7: Testing (Week 5)

#### 7.1 Vitest Setup for React
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event happy-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./app/javascript/test/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/javascript')
    }
  }
})
```

#### 7.2 Component Tests
```typescript
// app/javascript/components/__tests__/MemeCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MemeCard from '../MemeCard'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
})

const mockMeme = {
  id: 1,
  title: 'Test Meme',
  url: 'https://example.com/meme.jpg',
  description: 'A test meme',
  tags: ['funny', 'test'],
  created_at: '2024-01-01T00:00:00Z'
}

describe('MemeCard', () => {
  it('renders meme information', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemeCard meme={mockMeme} viewMode="grid" />
      </QueryClientProvider>
    )

    expect(screen.getByText('Test Meme')).toBeInTheDocument()
    expect(screen.getByText('A test meme')).toBeInTheDocument()
    expect(screen.getByText('funny')).toBeInTheDocument()
  })

  it('switches between grid and list view', () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemeCard meme={mockMeme} viewMode="grid" />
      </QueryClientProvider>
    )

    const card = screen.getByRole('img').closest('div')
    expect(card).toHaveClass('aspect-square')

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemeCard meme={mockMeme} viewMode="list" />
      </QueryClientProvider>
    )

    expect(card).not.toHaveClass('aspect-square')
  })
})
```

#### 7.3 RSpec for Rails
```ruby
# spec/requests/api/v1/memes_spec.rb
require 'rails_helper'

RSpec.describe 'Api::V1::Memes', type: :request do
  describe 'GET /api/v1/memes' do
    before do
      create_list(:meme, 3)
    end

    it 'returns all memes' do
      get '/api/v1/memes'

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.length).to eq(3)
    end
  end

  describe 'POST /api/v1/memes' do
    let(:file) { fixture_file_upload('meme.jpg', 'image/jpeg') }

    it 'creates a new meme' do
      expect {
        post '/api/v1/memes', params: { meme: { file: file } }
      }.to change(Meme, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it 'enqueues processing job' do
      expect {
        post '/api/v1/memes', params: { meme: { file: file } }
      }.to have_enqueued_job(ProcessMemeJob)
    end
  end

  describe 'GET /api/v1/memes/search' do
    it 'searches memes by query' do
      meme = create(:meme, description: 'funny cat meme')

      get '/api/v1/memes/search', params: { q: 'cat' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.first['id']).to eq(meme.id)
    end
  end
end
```

### Phase 8: Docker & Deployment (Week 6)

#### 8.1 Updated Dockerfile
```dockerfile
# Dockerfile
FROM ruby:3.2-slim as base

# Install dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    nodejs \
    npm \
    git \
    curl && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Install npm packages
COPY package.json package-lock.json ./
RUN npm ci

# Copy application
COPY . .

# Build assets with Vite
RUN RAILS_ENV=production bundle exec vite build

# Precompile Rails assets
RUN RAILS_ENV=production bundle exec rails assets:precompile

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

#### 8.2 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: meme_search_development
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  ml-service:
    build:
      context: ./ml-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - MODEL_CACHE_DIR=/models
    volumes:
      - model_cache:/models
    deploy:
      resources:
        limits:
          memory: 6G
    depends_on:
      - redis

  web:
    build: .
    command: bash -c "rm -f tmp/pids/server.pid && bundle exec rails server -b 0.0.0.0"
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/meme_search_development
      - REDIS_URL=redis://redis:6379/0
      - ML_SERVICE_URL=http://ml-service:8000
    depends_on:
      - db
      - redis
      - ml-service

  sidekiq:
    build: .
    command: bundle exec sidekiq
    volumes:
      - .:/app
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/meme_search_development
      - REDIS_URL=redis://redis:6379/0
      - ML_SERVICE_URL=http://ml-service:8000
    depends_on:
      - db
      - redis
      - ml-service

  vite:
    build: .
    command: npm run dev
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    ports:
      - "3036:3036"
    environment:
      - VITE_RUBY_HOST=0.0.0.0
      - VITE_RUBY_PORT=3036

volumes:
  postgres_data:
  redis_data:
  model_cache:
  node_modules:
```

## Performance Optimizations

### 1. Code Splitting
```typescript
// app/javascript/entrypoints/react-islands.tsx
import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

// Lazy load heavy components
const MemeGallery = lazy(() => import('@/components/MemeGallery'))
const UploadZone = lazy(() => import('@/components/UploadZone'))

const componentRegistry = {
  MemeGallery: (props) => (
    <Suspense fallback={<div>Loading...</div>}>
      <MemeGallery {...props} />
    </Suspense>
  ),
  UploadZone: (props) => (
    <Suspense fallback={<div>Loading...</div>}>
      <UploadZone {...props} />
    </Suspense>
  )
}
```

### 2. Rails Fragment Caching
```erb
<!-- app/views/memes/index.html.erb -->
<% cache ['memes-index', @memes.cache_key_with_version] do %>
  <%= react_island "MemeGallery",
      props: {
        memes: @memes.as_json(include: :tags),
        currentUser: current_user&.slice(:id, :name)
      } %>
<% end %>
```

### 3. Image Optimization
```ruby
# config/initializers/active_storage.rb
Rails.application.config.active_storage.variant_processor = :vips

# app/models/meme.rb
class Meme < ApplicationRecord
  has_one_attached :file do |attachable|
    attachable.variant :thumb, resize_to_limit: [200, 200]
    attachable.variant :medium, resize_to_limit: [800, 800]
    attachable.variant :large, resize_to_limit: [1600, 1600]
  end
end
```

## Migration Path

### Week 1: Foundation
- [ ] Install vite_rails gem
- [ ] Configure Vite with React plugin
- [ ] Set up Tailwind CSS
- [ ] Install shadcn/ui components
- [ ] Create react_island helper
- [ ] Set up React Islands mounting system

### Week 2: Core Components
- [ ] Build MemeGallery component
- [ ] Build MemeCard component (grid/list views)
- [ ] Build SearchBar component
- [ ] Set up TanStack Query
- [ ] Create API client utilities

### Week 3: Upload & API
- [ ] Build UploadZone component
- [ ] Implement drag-and-drop
- [ ] Create API controllers
- [ ] Add API routes
- [ ] Wire up real-time updates

### Week 4: Background Processing
- [ ] Create ProcessMemeJob
- [ ] Build ML service client
- [ ] Add retry logic
- [ ] Implement health checks
- [ ] Add error handling

### Week 5: Testing
- [ ] Set up Vitest
- [ ] Write component tests
- [ ] Write API request specs
- [ ] Test background jobs
- [ ] Integration tests

### Week 6: Deployment
- [ ] Update Dockerfile
- [ ] Configure Docker Compose
- [ ] Set up production builds
- [ ] Deploy to staging
- [ ] Performance testing
- [ ] Production deploy

## Comparison with Other Options

| Feature | Option 1 (Rails API + React SPA) | Option 2 (Rails + Hotwire) | **Option 4 (Rails + Vite + React Islands)** |
|---------|----------------------------------|----------------------------|---------------------------------------------|
| **Services** | 3 (React, Rails, Python) | 2 (Rails, Python) | **2 (Rails, Python)** |
| **Frontend Tech** | React SPA | Hotwire (Turbo + Stimulus) | **React Islands + Vite** |
| **Initial Load** | Slower (JS bundle) | Fast | **Fast (server-rendered)** |
| **Interactivity** | Excellent | Good | **Excellent (where needed)** |
| **SEO** | Requires SSR setup | Excellent | **Excellent** |
| **DX (Developer Experience)** | Good (React ecosystem) | Good (Rails way) | **Excellent (Vite HMR + React)** |
| **Bundle Size** | Large | Small | **Medium (only islands)** |
| **Progressive Enhancement** | No | Yes | **Yes** |
| **React Ecosystem Access** | Full | No | **Full (for islands)** |
| **Deployment Complexity** | High | Low | **Medium** |
| **Timeline** | 7 weeks | 6 weeks | **6 weeks** |

## Key Advantages of Option 4

1. **Best of Both Worlds**: Server-side rendering performance + React interactivity
2. **Vite HMR**: Sub-100ms hot updates with React Fast Refresh
3. **Progressive Enhancement**: Works without JavaScript
4. **shadcn/ui**: Modern, accessible component library
5. **Simpler than SPA**: No separate frontend deployment
6. **Better than Hotwire**: Access to React ecosystem where needed
7. **SEO-Friendly**: Server-rendered HTML
8. **Gradual Adoption**: Can add React islands incrementally

## Conclusion

Option 4 provides the **optimal balance** for meme-search:

- **Modern UX**: shadcn/ui + React for rich interactions
- **Fast Performance**: Server-side rendering + selective hydration
- **Great DX**: Vite's instant HMR + React Fast Refresh
- **Maintainable**: Single Rails codebase with React islands
- **Future-Proof**: Can expand islands or transition to SPA later

This approach is production-ready, well-supported, and increasingly popular in the Rails community for modernizing applications without the complexity of a full SPA architecture.
