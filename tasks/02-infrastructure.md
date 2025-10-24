# Task 02: React Islands Infrastructure

**Goal**: Create the React Islands mounting system that allows React components to hydrate into Rails-rendered HTML

**Estimated Time**: 3-4 hours

**Prerequisites**: Task 01 complete

---

## Concept Review

React Islands pattern:
1. Rails renders HTML with "mount points" (divs with data attributes)
2. JavaScript finds these mount points
3. React hydrates components into those divs
4. Rest of page remains static Rails HTML

---

## Step 1: Create React Islands Mounting System

### 1.1 Create React Islands Entry Point
Create `app/javascript/entrypoints/react-islands.tsx`:

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Component registry - add React components here
const componentRegistry: Record<string, React.ComponentType<any>> = {
  // Will add components here as we build them
}

// Create TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Mount React Islands
function mountReactIslands() {
  const islands = document.querySelectorAll('[data-react-component]')

  islands.forEach((island) => {
    const componentName = island.getAttribute('data-react-component')
    const propsJson = island.getAttribute('data-props')

    if (!componentName) {
      console.error('React island missing data-react-component attribute', island)
      return
    }

    const Component = componentRegistry[componentName]

    if (!Component) {
      console.error(`React component "${componentName}" not found in registry`, island)
      return
    }

    const props = propsJson ? JSON.parse(propsJson) : {}

    // Create root and render with QueryClient provider
    const root = createRoot(island)
    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <Component {...props} />
        </QueryClientProvider>
      </React.StrictMode>
    )
  })
}

// Mount on page load
document.addEventListener('DOMContentLoaded', mountReactIslands)

// Support for Turbo navigation
document.addEventListener('turbo:load', mountReactIslands)

// Clean up before Turbo cache
document.addEventListener('turbo:before-cache', () => {
  document.querySelectorAll('[data-react-component]').forEach((island) => {
    // Clear innerHTML to prevent hydration issues
    const cloned = island.cloneNode(false)
    island.parentNode?.replaceChild(cloned, island)
  })
})

// HMR support (development only)
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('React islands reloading...')
    mountReactIslands()
  })
}

// Export for testing
export { mountReactIslands, componentRegistry }
```

**Checklist:**
- [ ] `react-islands.tsx` created
- [ ] Component registry structure set up
- [ ] TanStack Query client configured
- [ ] Mount function implemented
- [ ] Turbo integration added
- [ ] HMR support added

### 1.2 Import React Islands in Application
Update `app/javascript/entrypoints/application.ts`:

```typescript
// ... existing imports ...

// Import React Islands system
import './react-islands'

console.log('Vite + React Islands ⚡️ Rails')
```

**Checklist:**
- [ ] React islands imported in application.ts
- [ ] No build errors

---

## Step 2: Create Rails Helper

### 2.1 Create React Helper
Create `app/helpers/react_helper.rb`:

```ruby
module ReactHelper
  def react_island(component_name, props: {}, **html_options, &block)
    # Serialize props to JSON
    props_json = props.to_json

    # Data attributes for mounting
    data_attrs = {
      react_component: component_name,
      props: props_json
    }

    # Merge with any existing data attributes
    html_options[:data] = (html_options[:data] || {}).merge(data_attrs)

    # Add a class for styling
    html_options[:class] = [html_options[:class], 'react-island'].compact.join(' ')

    # Render with fallback content
    content_tag(:div, html_options) do
      if block_given?
        capture(&block)
      else
        # Default loading state
        content_tag(:div, class: 'animate-pulse') do
          content_tag(:div, '', class: 'h-32 bg-gray-200 rounded')
        end
      end
    end
  end
end
```

**Checklist:**
- [ ] `react_helper.rb` created
- [ ] `react_island` helper method defined
- [ ] Props serialization implemented
- [ ] Fallback content support added
- [ ] Loading state default provided

### 2.2 Include Helper in ApplicationHelper
Update `app/helpers/application_helper.rb`:

```ruby
module ApplicationHelper
  include Pagy::Frontend
  include ReactHelper  # Add this line
end
```

**Checklist:**
- [ ] ReactHelper included in ApplicationHelper
- [ ] Available in all views

---

## Step 3: Create Test React Component & View

### 3.1 Create Test Component
Create `app/javascript/components/TestIsland.tsx`:

```tsx
import React, { useState } from 'react'

interface TestIslandProps {
  message: string
  count: number
}

export default function TestIsland({ message, count: initialCount }: TestIslandProps) {
  const [count, setCount] = useState(initialCount)

  return (
    <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4">🏝️ React Island Test</h2>
      <p className="mb-4">{message}</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition"
        >
          -
        </button>
        <span className="text-3xl font-bold">{count}</span>
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition"
        >
          +
        </button>
      </div>
      <p className="mt-4 text-sm opacity-80">
        ✅ React is working!<br/>
        ✅ Props from Rails received<br/>
        ✅ State management working<br/>
        ✅ Tailwind CSS applied
      </p>
    </div>
  )
}
```

**Checklist:**
- [ ] `TestIsland.tsx` created
- [ ] Component receives props from Rails
- [ ] Local state management works
- [ ] Tailwind styling applied
- [ ] Interactive (buttons work)

### 3.2 Register Test Component
Update `app/javascript/entrypoints/react-islands.tsx`:

```tsx
// ... imports ...
import TestIsland from '../components/TestIsland'

// Component registry
const componentRegistry: Record<string, React.ComponentType<any>> = {
  TestIsland,  // Add this line
}
```

**Checklist:**
- [ ] TestIsland imported
- [ ] TestIsland added to registry

### 3.3 Create Test View
Create `app/views/image_cores/test_island.html.erb`:

```erb
<div class="max-w-2xl mx-auto py-8 space-y-8">
  <h1 class="text-4xl font-bold text-center mb-8">
    React Islands Test Page
  </h1>

  <!-- Static Rails HTML -->
  <div class="p-6 bg-gray-100 rounded-lg">
    <h2 class="text-xl font-bold mb-2">This is static Rails HTML</h2>
    <p>Rendered by Rails, no JavaScript needed.</p>
    <p class="text-sm text-gray-600 mt-2">
      Server time: <%= Time.current.strftime('%Y-%m-%d %H:%M:%S') %>
    </p>
  </div>

  <!-- React Island -->
  <%= react_island "TestIsland",
      props: {
        message: "Hello from Rails! Props work 🎉",
        count: 42
      } do %>
    <!-- Fallback content (shown while React loads) -->
    <div class="p-6 bg-gray-200 rounded-lg animate-pulse">
      <div class="h-8 bg-gray-300 rounded w-1/2 mb-4"></div>
      <div class="h-4 bg-gray-300 rounded w-3/4"></div>
    </div>
  <% end %>

  <!-- More static Rails HTML -->
  <div class="p-6 bg-gray-100 rounded-lg">
    <h2 class="text-xl font-bold mb-2">Back to Rails</h2>
    <p>This is also static Rails HTML.</p>
  </div>

  <!-- Multiple React Islands on same page -->
  <%= react_island "TestIsland",
      props: {
        message: "You can have multiple islands!",
        count: 99
      } %>
</div>
```

**Checklist:**
- [ ] Test view created
- [ ] Shows static Rails HTML
- [ ] Shows React Island
- [ ] Shows fallback content
- [ ] Demonstrates multiple islands

### 3.4 Add Test Route
Update `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  # ... existing routes ...

  resources :image_cores do
    collection do
      get "search"
      post "search_items"
      post "description_receiver"
      post "status_receiver"
      get "test_island"  # Add this line
    end
    # ... existing member routes ...
  end

  # ... rest of routes ...
end
```

**Checklist:**
- [ ] Test route added
- [ ] Accessible at `/image_cores/test_island`

---

## Step 4: Test the Infrastructure

### 4.1 Start Development Server
```bash
cd meme_search_pro/meme_search_app
bin/dev
```

**Checklist:**
- [ ] Rails server starts
- [ ] Vite server starts
- [ ] No errors in terminal

### 4.2 Visit Test Page
Navigate to: `http://localhost:3000/image_cores/test_island`

**Checklist:**
- [ ] Page loads successfully
- [ ] Static Rails HTML appears
- [ ] React Island renders
- [ ] Props from Rails received correctly
- [ ] Counter buttons work (state management)
- [ ] Tailwind styles applied
- [ ] No JavaScript errors in console

### 4.3 Test Hot Module Replacement
1. Edit `TestIsland.tsx` (change button text)
2. Save file
3. Browser should update without reload

**Checklist:**
- [ ] HMR works for React components
- [ ] Changes appear instantly
- [ ] Component state preserved during HMR

### 4.4 Test Turbo Compatibility
1. Navigate away from test page
2. Use browser back button
3. Test page should work again

**Checklist:**
- [ ] Turbo navigation works
- [ ] React remounts after navigation
- [ ] No duplicate mounting
- [ ] No console errors

---

## Step 5: Create API Client Utility

### 5.1 Create API Client
Create `app/javascript/lib/api-client.ts`:

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api/v1',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
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
        return Promise.reject(new Error(message))
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

**Checklist:**
- [ ] `api-client.ts` created
- [ ] CSRF token handling added
- [ ] Error handling implemented
- [ ] TypeScript types defined

### 5.2 Create Utility Functions
Create `app/javascript/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// shadcn/ui utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date helper
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Debounce helper
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
```

**Checklist:**
- [ ] `utils.ts` created
- [ ] `cn` utility for Tailwind
- [ ] Date formatting helper
- [ ] Debounce helper

---

## Step 6: Create TypeScript Types

### 6.1 Create Type Definitions
Create `app/javascript/types/index.ts`:

```typescript
// Meme/ImageCore types
export interface Meme {
  id: number
  name: string
  description: string | null
  status: 'not_started' | 'in_queue' | 'processing' | 'done' | 'removing' | 'failed'
  image_path_id: number
  created_at: string
  updated_at: string
  image_path?: ImagePath
  image_tags?: ImageTag[]
  image_embeddings?: ImageEmbedding[]
}

export interface ImagePath {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface TagName {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface ImageTag {
  id: number
  image_core_id: number
  tag_name_id: number
  tag_name?: TagName
  created_at: string
  updated_at: string
}

export interface ImageEmbedding {
  id: number
  image_core_id: number
  snippet: string
  embedding: number[]
  created_at: string
  updated_at: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

// Component prop types
export interface GalleryProps {
  memes: Meme[]
  viewMode?: 'grid' | 'list'
}

export interface SearchProps {
  onSearch: (query: string, type: 'keyword' | 'vector') => void
  initialQuery?: string
}
```

**Checklist:**
- [ ] Type definitions created
- [ ] Match Rails model structure
- [ ] API response types defined
- [ ] Component prop types defined

---

## Step 7: Verify & Commit

### 7.1 Run Type Check
```bash
cd meme_search_pro/meme_search_app
npx tsc --noEmit
```

**Checklist:**
- [ ] No TypeScript errors
- [ ] All types resolve correctly

### 7.2 Test Build
```bash
npm run build
```

**Checklist:**
- [ ] Build succeeds
- [ ] Assets generated correctly
- [ ] No warnings

### 7.3 Final Test
1. Visit test page again
2. Check browser console
3. Verify everything works

**Checklist:**
- [ ] Test page loads
- [ ] React island works
- [ ] No console errors
- [ ] HMR still functional

### 7.4 Commit Progress
```bash
git add -A
git commit -m "Phase 2: React Islands infrastructure complete"
git tag -a v1.2-infrastructure -m "Infrastructure phase complete"
```

**Checklist:**
- [ ] All changes committed
- [ ] Git tag created
- [ ] Ready for Phase 3

---

## Success Criteria

- [x] React Islands mounting system works
- [x] Rails helper created and functional
- [x] Test component renders correctly
- [x] Props pass from Rails to React
- [x] State management works
- [x] HMR functional
- [x] Turbo compatible
- [x] API client ready
- [x] TypeScript types defined
- [x] No console errors

---

**Next**: Proceed to `03-shadcn-ui.md` (shadcn/ui Component Library Setup)
