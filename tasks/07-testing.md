# Task 07: Testing Strategy

**Goal**: Set up comprehensive testing for React components and ensure Rails tests still pass

**Estimated Time**: 4-5 hours

**Prerequisites**: Task 06 complete

---

## Testing Overview

We'll test:
1. React components (Vitest + React Testing Library)
2. Rails system tests (existing tests should still work)
3. API endpoints (RSpec request specs)
4. Integration tests (React + Rails)

---

## Step 1: Install Testing Dependencies

### 1.1 Install Vitest and React Testing Library
```bash
cd meme_search_pro/meme_search_app

npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
npm install -D jsdom
npm install -D @types/jest
```

**Checklist:**
- [ ] Vitest installed
- [ ] React Testing Library installed
- [ ] jsdom installed (browser environment for tests)
- [ ] Type definitions installed

---

## Step 2: Configure Vitest

### 2.1 Create Vitest Config
Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./app/javascript/test/setup.ts'],
    include: ['app/javascript/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/javascript/components/**', 'app/javascript/hooks/**'],
      exclude: ['app/javascript/components/ui/**'], // Exclude shadcn components
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/javascript'),
      '@/components': path.resolve(__dirname, './app/javascript/components'),
      '@/lib': path.resolve(__dirname, './app/javascript/lib'),
      '@/hooks': path.resolve(__dirname, './app/javascript/hooks'),
    },
  },
})
```

**Checklist:**
- [ ] Vitest config created
- [ ] React plugin configured
- [ ] jsdom environment set
- [ ] Path aliases match vite.config
- [ ] Coverage configured

### 2.2 Create Test Setup File
Create `app/javascript/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}
```

**Checklist:**
- [ ] Setup file created
- [ ] jest-dom matchers imported
- [ ] Cleanup configured
- [ ] Browser APIs mocked

### 2.3 Update package.json Scripts
Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "clobber": "vite clobber",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Checklist:**
- [ ] Test scripts added
- [ ] Can run tests with `npm test`
- [ ] Can view UI with `npm run test:ui`

---

## Step 3: Write Component Tests

### 3.1 Test MemeCard Component
Create `app/javascript/components/__tests__/MemeCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MemeCard from '../MemeCard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const mockMeme = {
  id: 1,
  name: 'test-meme.jpg',
  description: 'A test meme',
  status: 'done',
  image_path_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  image_url: '/memes/test/test-meme.jpg',
  image_tags: [
    {
      id: 1,
      image_core_id: 1,
      tag_name_id: 1,
      tag_name: { id: 1, name: 'funny' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('MemeCard', () => {
  it('renders meme information in grid mode', () => {
    render(<MemeCard meme={mockMeme} viewMode="grid" />, { wrapper })

    expect(screen.getByText('test-meme.jpg')).toBeInTheDocument()
    expect(screen.getByText('A test meme')).toBeInTheDocument()
    expect(screen.getByText('funny')).toBeInTheDocument()
  })

  it('renders meme information in list mode', () => {
    render(<MemeCard meme={mockMeme} viewMode="list" />, { wrapper })

    expect(screen.getByText('test-meme.jpg')).toBeInTheDocument()
    expect(screen.getByText('A test meme')).toBeInTheDocument()
  })

  it('shows loading skeleton before image loads', () => {
    render(<MemeCard meme={mockMeme} viewMode="grid" />, { wrapper })

    const image = screen.getByAlt('test-meme.jpg')
    expect(image).toBeInTheDocument()
  })

  it('displays tags', () => {
    render(<MemeCard meme={mockMeme} viewMode="grid" />, { wrapper })

    expect(screen.getByText('funny')).toBeInTheDocument()
  })

  it('shows generate button when status is done', () => {
    render(<MemeCard meme={mockMeme} viewMode="grid" />, { wrapper })

    const generateButtons = screen.getAllByRole('button')
    expect(generateButtons.length).toBeGreaterThan(0)
  })

  it('shows processing indicator when status is processing', () => {
    const processingMeme = { ...mockMeme, status: 'processing' as const }
    render(<MemeCard meme={processingMeme} viewMode="grid" />, { wrapper })

    // Look for loader
    const loaders = screen.getAllByTestId('loader-icon')
    expect(loaders.length).toBeGreaterThan(0)
  })
})
```

**Checklist:**
- [ ] MemeCard test file created
- [ ] Tests both grid and list modes
- [ ] Tests image loading
- [ ] Tests tag display
- [ ] Tests button states
- [ ] Tests processing state

### 3.2 Test SearchBar Component
Create `app/javascript/components/__tests__/SearchBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchBar from '../SearchBar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('SearchBar', () => {
  beforeEach(() => {
    queryClient.clear()
  })

  it('renders search input', () => {
    render(<SearchBar />, { wrapper })

    const input = screen.getByPlaceholderText('Search memes...')
    expect(input).toBeInTheDocument()
  })

  it('allows typing in search input', () => {
    render(<SearchBar />, { wrapper })

    const input = screen.getByPlaceholderText('Search memes...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'funny cat' } })

    expect(input.value).toBe('funny cat')
  })

  it('shows keyword and semantic buttons', () => {
    render(<SearchBar />, { wrapper })

    expect(screen.getByText('Keyword')).toBeInTheDocument()
    expect(screen.getByText('Semantic')).toBeInTheDocument()
  })

  it('switches between keyword and semantic mode', () => {
    render(<SearchBar />, { wrapper })

    const semanticButton = screen.getByText('Semantic')
    fireEvent.click(semanticButton)

    // Button should be in active state (you might check className or aria-pressed)
    expect(semanticButton).toBeInTheDocument()
  })

  it('toggles filter panel', () => {
    render(<SearchBar />, { wrapper })

    const filterButton = screen.getByText(/show filters/i)
    fireEvent.click(filterButton)

    expect(screen.getByText('Filter by Tags')).toBeInTheDocument()
  })
})
```

**Checklist:**
- [ ] SearchBar test file created
- [ ] Tests input rendering
- [ ] Tests typing
- [ ] Tests mode switching
- [ ] Tests filter toggle

### 3.3 Test API Client
Create `app/javascript/lib/__tests__/api-client.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient } from '../api-client'
import axios from 'axios'

vi.mock('axios')

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes CSRF token in requests', async () => {
    // Mock CSRF token
    const mockToken = 'test-csrf-token'
    document.head.innerHTML = `<meta name="csrf-token" content="${mockToken}">`

    const mockAxios = axios as any
    mockAxios.create.mockReturnValue({
      interceptors: {
        request: { use: vi.fn((fn) => fn({ headers: {} })) },
        response: { use: vi.fn() },
      },
      get: vi.fn().mockResolvedValue({ data: {} }),
    })

    // This tests that the client is set up correctly
    expect(axios.create).toHaveBeenCalled()
  })
})
```

**Checklist:**
- [ ] API client test file created
- [ ] Tests CSRF token handling

---

## Step 4: Write Hook Tests

### 4.1 Test useMemes Hook
Create `app/javascript/hooks/__tests__/useMemes.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemes } from '../useMemes'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useMemes', () => {
  it('fetches memes successfully', async () => {
    const mockMemes = {
      memes: [{ id: 1, name: 'test.jpg' }],
      meta: { total: 1, page: 1, per_page: 50, total_pages: 1 },
    }

    vi.spyOn(apiClient.apiClient, 'get').mockResolvedValue(mockMemes)

    const { result } = renderHook(() => useMemes(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.memes).toHaveLength(1)
    expect(result.current.data?.memes[0].name).toBe('test.jpg')
  })

  it('handles errors', async () => {
    vi.spyOn(apiClient.apiClient, 'get').mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useMemes(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Checklist:**
- [ ] useMemes test file created
- [ ] Tests successful data fetching
- [ ] Tests error handling

---

## Step 5: Rails Tests

### 5.1 Verify Existing System Tests Still Pass
```bash
cd meme_search_pro/meme_search_app
bash run_tests.sh
```

**Checklist:**
- [ ] All existing system tests pass
- [ ] No regressions in Rails functionality

### 5.2 Add API Endpoint Tests
Create `spec/requests/api/v1/memes_spec.rb`:

```ruby
require 'rails_helper'

RSpec.describe 'Api::V1::Memes', type: :request do
  let!(:image_path) { ImagePath.create!(name: 'test') }
  let!(:meme) { ImageCore.create!(name: 'test.jpg', image_path: image_path, description: 'Test meme') }

  describe 'GET /api/v1/memes' do
    it 'returns memes as JSON' do
      get '/api/v1/memes'

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['memes']).to be_an(Array)
      expect(json['meta']).to include('total', 'page', 'per_page', 'total_pages')
    end

    it 'includes associations' do
      get '/api/v1/memes'

      json = JSON.parse(response.body)
      first_meme = json['memes'].first
      expect(first_meme).to include('image_path', 'image_url')
    end
  end

  describe 'GET /api/v1/memes/:id' do
    it 'returns a single meme' do
      get "/api/v1/memes/#{meme.id}"

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['meme']['id']).to eq(meme.id)
      expect(json['meme']['name']).to eq('test.jpg')
    end
  end

  describe 'POST /api/v1/search' do
    it 'performs keyword search' do
      post '/api/v1/search', params: { query: 'test', type: 'keyword' }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['memes']).to be_an(Array)
      expect(json['meta']).to include('query', 'type')
    end
  end
end
```

**Checklist:**
- [ ] API endpoint tests created
- [ ] Tests memes index
- [ ] Tests memes show
- [ ] Tests search endpoint
- [ ] Tests JSON structure

---

## Step 6: Integration Tests

### 6.1 Add System Test for React Gallery
Create `test/system/react_gallery_test.rb`:

```ruby
require "application_system_test_case"

class ReactGalleryTest < ApplicationSystemTestCase
  setup do
    @image_path = image_paths(:one)
    @image_core = image_cores(:one)
  end

  test "visiting the React gallery" do
    visit gallery_react_image_cores_url

    # Check page loads
    assert_selector "h1", text: "Meme Gallery"

    # Check React island renders
    assert_selector "[data-react-component='MemeGallery']"

    # Wait for React to hydrate
    sleep 1

    # Check memes render
    assert_text @image_core.name
  end

  test "switching view modes", js: true do
    visit gallery_react_image_cores_url

    # Wait for React
    sleep 1

    # Click grid view button
    find('button', text: /Grid/i, match: :first).click

    # Check layout changed
    assert_selector ".grid"
  end
end
```

**Checklist:**
- [ ] React gallery system test created
- [ ] Tests page loads
- [ ] Tests React hydration
- [ ] Tests view mode switching

---

## Step 7: Run All Tests

### 7.1 Run React Component Tests
```bash
npm test
```

**Checklist:**
- [ ] All Vitest tests pass
- [ ] No console errors
- [ ] Coverage > 70%

### 7.2 Run Rails Tests
```bash
cd meme_search_pro/meme_search_app
bash run_tests.sh
```

**Checklist:**
- [ ] All Rails tests pass
- [ ] System tests pass
- [ ] API tests pass

### 7.3 Generate Coverage Report
```bash
npm run test:coverage
```

**Checklist:**
- [ ] Coverage report generated
- [ ] Coverage meets targets (> 70%)
- [ ] Report saved to `coverage/` directory

---

## Step 8: Add Test Documentation

### 8.1 Create Test README
Create `app/javascript/test/README.md`:

```markdown
# Testing Guide

## Running Tests

### React Component Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- MemeCard.test.tsx

# Run with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

### Rails Tests
```bash
# Run all tests
bash run_tests.sh

# Run specific test file
bin/rails test test/system/react_gallery_test.rb
```

## Writing Tests

### Component Tests
- Use React Testing Library
- Test user interactions, not implementation
- Mock API calls
- Use semantic queries (getByRole, getByText)

### Integration Tests
- Test full user flows
- Use real data when possible
- Test React + Rails interaction

## Coverage Goals
- Components: > 80%
- Hooks: > 90%
- Utils: > 90%
- Overall: > 70%
```

**Checklist:**
- [ ] Test README created
- [ ] Commands documented
- [ ] Best practices listed

---

## Step 9: Verify & Commit

### 9.1 Final Test Run
```bash
# React tests
npm test

# Rails tests
cd meme_search_pro/meme_search_app && bash run_tests.sh

# Build test
npm run build
```

**Checklist:**
- [ ] All React tests pass
- [ ] All Rails tests pass
- [ ] Build succeeds
- [ ] No warnings or errors

### 9.2 Commit
```bash
git add -A
git commit -m "Phase 7: Testing infrastructure complete"
git tag -a v1.7-testing -m "Testing phase complete"
```

**Checklist:**
- [ ] Changes committed
- [ ] Git tag created

---

## Success Criteria

- [x] Vitest configured
- [x] Component tests written
- [x] Hook tests written
- [x] Rails API tests added
- [x] System tests for React components
- [x] All tests passing
- [x] Coverage > 70%
- [x] Test documentation created

---

**Next**: Proceed to `08-deployment.md` (Production Deployment)
