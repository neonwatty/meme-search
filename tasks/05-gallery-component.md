# Task 05: Gallery React Island Component

**Goal**: Build the main Gallery React Island to replace the current gallery view

**Estimated Time**: 4-5 hours

**Prerequisites**: Task 04 complete

---

## Component Overview

The Gallery component will:
- Display memes in grid/list view
- Support view mode switching
- Show loading states
- Handle pagination
- Integrate with existing ActionCable for real-time updates
- Allow description generation
- Support filtering by tags and paths

---

## Step 1: Create MemeCard Component

### 1.1 Create MemeCard Component
Create `app/javascript/components/MemeCard.tsx`:

```tsx
import React, { useState } from 'react'
import { Card, CardContent, CardFooter } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { Eye, Edit, Trash2, Sparkles, Loader2 } from 'lucide-react'
import type { Meme } from '@/types'
import { useGenerateDescription, useDeleteMeme } from '@/hooks/useMemes'

interface MemeCardProps {
  meme: Meme
  viewMode: 'grid' | 'list'
}

export default function MemeCard({ meme, viewMode }: MemeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const generateDescription = useGenerateDescription()
  const deleteMeme = useDeleteMeme()

  const isGenerating = meme.status === 'in_queue' || meme.status === 'processing'
  const canGenerate = meme.status === 'not_started' || meme.status === 'done' || meme.status === 'failed'

  const handleGenerate = () => {
    if (canGenerate) {
      generateDescription.mutate(meme.id)
    }
  }

  const handleDelete = () => {
    if (confirm(`Delete "${meme.name}"?`)) {
      deleteMeme.mutate(meme.id)
    }
  }

  if (viewMode === 'list') {
    return (
      <Card className="flex flex-row overflow-hidden hover:shadow-lg transition-shadow">
        <div className="w-48 h-32 flex-shrink-0 bg-gray-100 relative">
          {!imageLoaded && (
            <Skeleton className="absolute inset-0" />
          )}
          <img
            src={meme.image_url}
            alt={meme.name}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        </div>
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-2 line-clamp-1">{meme.name}</h3>
            {meme.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{meme.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description yet</p>
            )}
            {meme.image_tags && meme.image_tags.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {meme.image_tags.slice(0, 5).map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.tag_name?.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = `/image_cores/${meme.id}`}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = `/image_cores/${meme.id}/edit`}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Generate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Grid view
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="aspect-square bg-gray-100 relative">
          {!imageLoaded && (
            <Skeleton className="absolute inset-0" />
          )}
          <img
            src={meme.image_url}
            alt={meme.name}
            className="w-full h-full object-cover cursor-pointer"
            onLoad={() => setImageLoaded(true)}
            onClick={() => window.location.href = `/image_cores/${meme.id}`}
            loading="lazy"
          />
          {isGenerating && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-1 w-full">{meme.name}</h3>
        {meme.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{meme.description}</p>
        )}
        {meme.image_tags && meme.image_tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {meme.image_tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.tag_name?.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-1 w-full pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => window.location.href = `/image_cores/${meme.id}/edit`}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
```

**Checklist:**
- [ ] MemeCard component created
- [ ] Grid view implemented
- [ ] List view implemented
- [ ] Image lazy loading
- [ ] Loading states (skeletons)
- [ ] Action buttons (view, edit, generate, delete)
- [ ] Status indicators
- [ ] Tags display

---

## Step 2: Create MemeGallery Component

### 2.1 Create MemeGallery Component
Create `app/javascript/components/MemeGallery.tsx`:

```tsx
import React, { useState } from 'react'
import { Grid3x3, List, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import MemeCard from './MemeCard'
import { useMemes } from '@/hooks/useMemes'
import type { Meme } from '@/types'

interface MemeGalleryProps {
  initialMemes: Meme[]
  initialPage?: number
  initialPerPage?: number
}

export default function MemeGallery({
  initialMemes,
  initialPage = 1,
  initialPerPage = 50
}: MemeGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [page, setPage] = useState(initialPage)

  const { data, isLoading, isError } = useMemes(page, initialPerPage)

  // Use server-rendered data initially, then client data
  const memes = data?.memes || initialMemes
  const meta = data?.meta

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">Error loading memes. Please try again.</p>
      </Card>
    )
  }

  if (isLoading && !memes.length) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with view switcher */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {meta?.total || memes.length} Memes
          </h2>
          {meta && (
            <p className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.total_pages}
            </p>
          )}
        </div>
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

      {/* Gallery */}
      {memes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No memes found.</p>
        </Card>
      ) : (
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
      )}

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <div className="flex items-center px-4">
            <span className="text-sm">
              Page {page} of {meta.total_pages}
            </span>
          </div>
          <Button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= meta.total_pages || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Next'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Checklist:**
- [ ] MemeGallery component created
- [ ] View mode switcher (grid/list)
- [ ] Uses TanStack Query
- [ ] Server-side data as initial state
- [ ] Client-side pagination
- [ ] Loading states
- [ ] Error handling
- [ ] Empty state

---

## Step 3: Register Gallery Component

### 3.1 Update React Islands Registry
Update `app/javascript/entrypoints/react-islands.tsx`:

```tsx
// ... existing imports ...
import MemeGallery from '../components/MemeGallery'

const componentRegistry: Record<string, React.ComponentType<any>> = {
  TestIsland,
  ShadcnShowcase,
  MemeGallery,  // Add this
}
```

**Checklist:**
- [ ] MemeGallery imported
- [ ] Added to component registry

---

## Step 4: Create New Index View

### 4.1 Create React Islands Version of Index
Create `app/views/image_cores/index_react.html.erb`:

```erb
<div class="flex flex-col w-full min-h-screen">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-4xl font-bold mb-2">Meme Gallery</h1>
    <p class="text-muted-foreground">
      Browse and manage your meme collection
    </p>
  </div>

  <!-- React Island: Gallery -->
  <%= react_island "MemeGallery",
      props: {
        initialMemes: @image_cores.as_json(
          include: {
            image_path: { only: [:id, :name] },
            image_tags: {
              include: { tag_name: { only: [:id, :name] } }
            }
          },
          methods: [:image_url]
        ),
        initialPage: @pagy.page,
        initialPerPage: @pagy.items
      } do %>
    <!-- Fallback: Server-rendered list -->
    <div class="space-y-4">
      <% @image_cores.each do |image_core| %>
        <div class="p-4 border rounded-lg">
          <%= link_to image_core do %>
            <h3 class="font-semibold"><%= image_core.name %></h3>
          <% end %>
        </div>
      <% end %>
    </div>
  <% end %>

  <!-- Pagination (server-side fallback) -->
  <div class="mt-6">
    <%== pagy_nav(@pagy) if @pagy.pages > 1 %>
  </div>
</div>
```

**Checklist:**
- [ ] New index view created
- [ ] React Island configured
- [ ] Props passed from Rails
- [ ] Server-rendered fallback provided
- [ ] Pagination fallback included

### 4.2 Update Controller to Support Both Views
Update `app/controllers/image_cores_controller.rb`:

```ruby
class ImageCoresController < ApplicationController
  # ... existing code ...

  def index
    # ... existing filtering logic ...

    if !params[:selected_tag_names].present? && !params[:selected_path_names].present? && !params[:has_embeddings].present?
      @image_cores = ImageCore.includes(:image_path, :image_tags, :image_embeddings)
                              .order(updated_at: :desc)
      @pagy, @image_cores = pagy(@image_cores)
    else
      # ... existing filter logic ...
    end

    # Check if React mode is enabled
    if params[:react] == 'true' || ENV['USE_REACT_GALLERY'] == 'true'
      render :index_react
    else
      render :index
    end
  end

  # ... rest of controller ...
end
```

**Checklist:**
- [ ] Controller updated
- [ ] Supports both old and new views
- [ ] Can toggle with `?react=true` param
- [ ] Can toggle with ENV var

---

## Step 5: Add Feature Flag Route

### 5.1 Add React Gallery Route
Update `config/routes.rb`:

```ruby
resources :image_cores do
  collection do
    get "search"
    post "search_items"
    post "description_receiver"
    post "status_receiver"
    get "test_island"
    get "shadcn_showcase"
    get "gallery_react"  # Add this for testing
  end
  # ... member routes ...
end
```

### 5.2 Add Gallery React Action
Add to `ImageCoresController`:

```ruby
def gallery_react
  @image_cores = ImageCore.includes(:image_path, :image_tags, :image_embeddings)
                          .order(updated_at: :desc)
  @pagy, @image_cores = pagy(@image_cores)
  render :index_react
end
```

**Checklist:**
- [ ] Route added
- [ ] Controller action added
- [ ] Accessible at `/image_cores/gallery_react`

---

## Step 6: Test Gallery Component

### 6.1 Start Development Server
```bash
cd meme_search_pro/meme_search_app
bin/dev
```

**Checklist:**
- [ ] Server starts
- [ ] No errors

### 6.2 Visit React Gallery
Navigate to: `http://localhost:3000/image_cores/gallery_react`

**Checklist:**
- [ ] Page loads
- [ ] Gallery renders
- [ ] Memes display correctly
- [ ] Images load
- [ ] View mode switcher works (grid/list)
- [ ] Action buttons visible
- [ ] Pagination works
- [ ] No console errors

### 6.3 Test Interactions
- Switch between grid and list views
- Click pagination buttons
- Click "Generate" on a meme
- Click "View" on a meme
- Click "Edit" on a meme
- Try to delete a meme (test confirmation)

**Checklist:**
- [ ] Grid view displays correctly
- [ ] List view displays correctly
- [ ] Switching views is instant
- [ ] Pagination changes page
- [ ] Generate button triggers action
- [ ] View button navigates correctly
- [ ] Edit button navigates correctly
- [ ] Delete shows confirmation

### 6.4 Test ActionCable Integration

The existing ActionCable channels should still work. When a description is generated:

**Checklist:**
- [ ] Real-time updates still work
- [ ] Description appears when ML service completes
- [ ] Status updates in real-time
- [ ] React component reflects changes

---

## Step 7: Performance Optimization

### 7.1 Add React.memo
Update `MemeCard.tsx`:

```tsx
import React, { useState, memo } from 'react'
// ... rest of imports ...

function MemeCard({ meme, viewMode }: MemeCardProps) {
  // ... component code ...
}

export default memo(MemeCard, (prevProps, nextProps) => {
  return (
    prevProps.meme.id === nextProps.meme.id &&
    prevProps.meme.updated_at === nextProps.meme.updated_at &&
    prevProps.viewMode === nextProps.viewMode
  )
})
```

**Checklist:**
- [ ] MemeCard memoized
- [ ] Custom comparison function
- [ ] Only re-renders when needed

---

## Step 8: Verify & Commit

### 8.1 Final Tests
- [ ] Gallery loads fast
- [ ] Images lazy load
- [ ] Switching views is smooth
- [ ] No memory leaks
- [ ] Works on mobile (responsive)
- [ ] HMR works during development

### 8.2 Build Test
```bash
npm run build
```

**Checklist:**
- [ ] Build succeeds
- [ ] No errors
- [ ] Assets generated

### 8.3 Commit
```bash
git add -A
git commit -m "Phase 5: Gallery React Island component complete"
git tag -a v1.5-gallery -m "Gallery component phase complete"
```

**Checklist:**
- [ ] All changes committed
- [ ] Git tag created

---

## Success Criteria

- [x] MemeCard component built
- [x] MemeGallery component built
- [x] Grid and list views work
- [x] View mode switching instant
- [x] Pagination functional
- [x] Loading states smooth
- [x] Actions work (generate, view, edit, delete)
- [x] Real-time updates integrated
- [x] Performance optimized
- [x] Responsive design
- [x] No console errors

---

## Optional Enhancements

If time permits:
- [ ] Add keyboard navigation
- [ ] Add "Select all" functionality
- [ ] Add bulk actions
- [ ] Add sorting options
- [ ] Add view density options (compact/comfortable)
- [ ] Add infinite scroll option

---

**Next**: Proceed to `06-search-component.md` (Build the Search React Island)
