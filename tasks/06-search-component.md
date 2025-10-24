# Task 06: Search React Island Component

**Goal**: Build an enhanced Search component as a React Island

**Estimated Time**: 3-4 hours

**Prerequisites**: Task 05 complete

---

## Component Overview

The Search component will:
- Support keyword and vector search
- Show search results in real-time
- Include tag and path filtering
- Provide search suggestions
- Show loading and empty states
- Be significantly better than current Turbo implementation

---

## Step 1: Create SearchBar Component

### 1.1 Create SearchBar
Create `app/javascript/components/SearchBar.tsx`:

```tsx
import React, { useState, useEffect } from 'react'
import { Search, Loader2, Sparkles } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { debounce } from '@/lib/utils'
import { useSearch } from '@/hooks/useSearch'
import { useTags } from '@/hooks/useTags'
import type { Meme } from '@/types'

interface SearchBarProps {
  onResults?: (memes: Meme[], query: string) => void
}

export default function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'keyword' | 'vector'>('keyword')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const searchMutation = useSearch()
  const { data: tags = [] } = useTags()

  // Debounced search
  useEffect(() => {
    if (query.trim().length > 0) {
      const debouncedSearch = debounce(() => {
        searchMutation.mutate({
          query: query.trim(),
          type: searchType,
          tag_ids: selectedTags
        })
      }, 500)

      debouncedSearch()
    }
  }, [query, searchType, selectedTags])

  // Pass results to parent
  useEffect(() => {
    if (searchMutation.data && onResults) {
      onResults(searchMutation.data.memes, query)
    }
  }, [searchMutation.data])

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search memes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-12 h-12 text-lg"
        />
        {searchMutation.isPending && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Type Toggle */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground">Search mode:</span>
        <Button
          variant={searchType === 'keyword' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchType('keyword')}
        >
          Keyword
        </Button>
        <Button
          variant={searchType === 'vector' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchType('vector')}
        >
          <Sparkles className="h-4 w-4 mr-1" />
          Semantic
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Filter by Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground">No tags available</p>
            )}
          </div>
        </Card>
      )}

      {/* Search Info */}
      {searchMutation.data && (
        <div className="text-sm text-muted-foreground">
          Found {searchMutation.data.meta.total} results for "{searchMutation.data.meta.query}"
        </div>
      )}
    </div>
  )
}
```

**Checklist:**
- [ ] SearchBar component created
- [ ] Input field with icon
- [ ] Loading indicator
- [ ] Search type toggle (keyword/semantic)
- [ ] Tag filters
- [ ] Debounced search
- [ ] Results callback

---

## Step 2: Create SearchResults Component

### 2.1 Create SearchResults
Create `app/javascript/components/SearchResults.tsx`:

```tsx
import React from 'react'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import MemeCard from './MemeCard'
import type { Meme } from '@/types'

interface SearchResultsProps {
  memes: Meme[]
  query: string
  isLoading: boolean
  viewMode?: 'grid' | 'list'
}

export default function SearchResults({
  memes,
  query,
  isLoading,
  viewMode = 'grid'
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!query) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          Enter a search query to find memes
        </p>
      </Card>
    )
  }

  if (memes.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          No results found for "{query}"
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try a different search term or search mode
        </p>
      </Card>
    )
  }

  return (
    <div
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'space-y-4'
      }
    >
      {memes.map((meme) => (
        <MemeCard key={meme.id} meme={meme} viewMode={viewMode} />
      ))}
    </div>
  )
}
```

**Checklist:**
- [ ] SearchResults component created
- [ ] Loading state
- [ ] Empty state (no query)
- [ ] No results state
- [ ] Results display
- [ ] Reuses MemeCard component

---

## Step 3: Create Combined Search Component

### 3.1 Create Search Component
Create `app/javascript/components/Search.tsx`:

```tsx
import React, { useState } from 'react'
import { Grid3x3, List } from 'lucide-react'
import { Button } from './ui/button'
import SearchBar from './SearchBar'
import SearchResults from './SearchResults'
import type { Meme } from '@/types'

export default function Search() {
  const [results, setResults] = useState<Meme[]>([])
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const handleResults = (memes: Meme[], searchQuery: string) => {
    setResults(memes)
    setQuery(searchQuery)
    setIsSearching(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Search Memes</h1>
        <p className="text-muted-foreground">
          Use keyword search for exact matches or semantic search for similar meanings
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar onResults={handleResults} />

      {/* View Mode Switcher */}
      {results.length > 0 && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {results.length} Results
          </h2>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <SearchResults
        memes={results}
        query={query}
        isLoading={isSearching}
        viewMode={viewMode}
      />
    </div>
  )
}
```

**Checklist:**
- [ ] Search component created
- [ ] Integrates SearchBar and SearchResults
- [ ] View mode switcher
- [ ] State management
- [ ] Clean layout

---

## Step 4: Register Search Component

### 4.1 Update React Islands Registry
Update `app/javascript/entrypoints/react-islands.tsx`:

```tsx
// ... existing imports ...
import Search from '../components/Search'

const componentRegistry: Record<string, React.ComponentType<any>> = {
  TestIsland,
  ShadcnShowcase,
  MemeGallery,
  Search,  // Add this
}
```

**Checklist:**
- [ ] Search imported
- [ ] Added to component registry

---

## Step 5: Create Search View

### 5.1 Create React Search View
Create `app/views/image_cores/search_react.html.erb`:

```erb
<div class="max-w-7xl mx-auto py-8">
  <%= react_island "Search" do %>
    <!-- Fallback: Link to regular search -->
    <div class="p-8 text-center">
      <p class="mb-4">Loading search interface...</p>
      <%= link_to "Use classic search", search_image_cores_path, class: "text-primary underline" %>
    </div>
  <% end %>
</div>
```

**Checklist:**
- [ ] Search view created
- [ ] React Island configured
- [ ] Fallback provided

### 5.2 Add Search Route
Update routes in `config/routes.rb`:

```ruby
resources :image_cores do
  collection do
    get "search"
    get "search_react"  # Add this
    post "search_items"
    # ... rest of routes ...
  end
  # ... member routes ...
end
```

**Checklist:**
- [ ] Route added
- [ ] Accessible at `/image_cores/search_react`

---

## Step 6: Test Search Component

### 6.1 Start Development Server
```bash
cd meme_search_pro/meme_search_app
bin/dev
```

**Checklist:**
- [ ] Server starts

### 6.2 Visit Search Page
Navigate to: `http://localhost:3000/image_cores/search_react`

**Checklist:**
- [ ] Page loads
- [ ] Search bar renders
- [ ] No console errors

### 6.3 Test Search Functionality

**Keyword Search:**
- Type a search query
- Wait for debounce
- Check results appear
- Verify results are relevant

**Checklist:**
- [ ] Keyword search works
- [ ] Debouncing works (doesn't search on every keystroke)
- [ ] Results display correctly
- [ ] Loading indicator shows

**Semantic Search:**
- Switch to "Semantic" mode
- Search for a concept (e.g., "happy animals")
- Check semantic results

**Checklist:**
- [ ] Can switch to semantic mode
- [ ] Semantic search works
- [ ] Results are semantically relevant
- [ ] Mode indicator visible

**Tag Filtering:**
- Show filters
- Select one or more tags
- Check results filter

**Checklist:**
- [ ] Filters panel toggles
- [ ] Tags load from API
- [ ] Selecting tags filters results
- [ ] Multiple tags work (AND logic)
- [ ] Deselecting tags updates results

### 6.4 Test Edge Cases

**Empty Query:**
- Clear search input
- Check empty state appears

**No Results:**
- Search for nonsense: "xyzabc123"
- Check "no results" message

**Long Query:**
- Search with a very long query
- Check it handles gracefully

**Special Characters:**
- Search with: `!@#$%`
- Check it doesn't break

**Checklist:**
- [ ] Empty state works
- [ ] No results state works
- [ ] Long queries handled
- [ ] Special characters handled
- [ ] No errors in console

### 6.5 Test View Modes
- Search for something
- Switch between grid and list views
- Check layout changes

**Checklist:**
- [ ] Grid view displays correctly
- [ ] List view displays correctly
- [ ] Switching is instant
- [ ] Results persist when switching

---

## Step 7: Performance Optimization

### 7.1 Add Search Caching
Update `useSearch` hook in `app/javascript/hooks/useSearch.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Meme } from '@/types'

interface SearchParams {
  query: string
  type: 'keyword' | 'vector'
  tag_ids?: number[]
  path_ids?: number[]
}

export function useSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: SearchParams) => {
      const response = await apiClient.post<{
        memes: Meme[]
        meta: {
          total: number
          query: string
          type: string
        }
      }>('/search', params)
      return response
    },
    onSuccess: (data, variables) => {
      // Cache search results
      const cacheKey = ['search', variables.query, variables.type]
      queryClient.setQueryData(cacheKey, data)
    },
  })
}
```

**Checklist:**
- [ ] Search results cached
- [ ] Repeated searches are instant
- [ ] Cache key includes query and type

---

## Step 8: Verify & Commit

### 8.1 Final Checks
- [ ] Search is fast
- [ ] Keyword search works
- [ ] Semantic search works
- [ ] Tag filtering works
- [ ] View modes work
- [ ] No console errors
- [ ] Mobile responsive

### 8.2 Build Test
```bash
npm run build
```

**Checklist:**
- [ ] Build succeeds

### 8.3 Commit
```bash
git add -A
git commit -m "Phase 6: Search React Island component complete"
git tag -a v1.6-search -m "Search component phase complete"
```

**Checklist:**
- [ ] Changes committed
- [ ] Git tag created

---

## Success Criteria

- [x] SearchBar component built
- [x] SearchResults component built
- [x] Combined Search component
- [x] Keyword search works
- [x] Semantic (vector) search works
- [x] Tag filtering functional
- [x] Debounced input
- [x] Loading states
- [x] Empty states
- [x] View mode switching
- [x] Performance optimized
- [x] Mobile responsive

---

## Optional Enhancements

If time permits:
- [ ] Search suggestions/autocomplete
- [ ] Recent searches
- [ ] Save searches
- [ ] Export search results
- [ ] Advanced filters (date range, etc.)
- [ ] Search shortcuts (keyboard)

---

**Next**: Proceed to `07-testing.md` (Testing Strategy)
