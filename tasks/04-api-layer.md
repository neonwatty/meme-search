# Task 04: API Layer for React Components

**Goal**: Create JSON API endpoints that React components will consume

**Estimated Time**: 3-4 hours

**Prerequisites**: Task 03 complete

---

## Strategy

We'll create a new API namespace (`/api/v1`) that returns JSON for React components while keeping existing HTML routes working.

---

## Step 1: Create API Controllers Structure

### 1.1 Create API Directory
```bash
cd meme_search_pro/meme_search_app/app/controllers
mkdir -p api/v1
```

**Checklist:**
- [ ] `app/controllers/api/` created
- [ ] `app/controllers/api/v1/` created

### 1.2 Create API Base Controller
Create `app/controllers/api/v1/base_controller.rb`:

```ruby
module Api
  module V1
    class BaseController < ApplicationController
      # Skip CSRF for API requests (we'll use CSRF token in headers)
      skip_before_action :verify_authenticity_token

      # Always respond with JSON
      respond_to :json

      # Handle errors
      rescue_from ActiveRecord::RecordNotFound, with: :not_found
      rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity

      private

      def not_found
        render json: { error: 'Resource not found' }, status: :not_found
      end

      def unprocessable_entity(exception)
        render json: {
          error: 'Validation failed',
          details: exception.record.errors.full_messages
        }, status: :unprocessable_entity
      end
    end
  end
end
```

**Checklist:**
- [ ] Base controller created
- [ ] CSRF handling configured
- [ ] Error handling implemented
- [ ] JSON-only responses

---

## Step 2: Create Memes API Controller

### 2.1 Create Memes Controller
Create `app/controllers/api/v1/memes_controller.rb`:

```ruby
module Api
  module V1
    class MemesController < BaseController
      before_action :set_meme, only: [:show, :update, :destroy]

      # GET /api/v1/memes
      def index
        @memes = ImageCore.includes(:image_path, :image_tags, :image_embeddings)
                          .order(updated_at: :desc)

        # Pagination
        page = params[:page]&.to_i || 1
        per_page = params[:per_page]&.to_i || 50

        @pagy, @memes = pagy(@memes, page: page, items: per_page)

        render json: {
          memes: @memes.as_json(
            include: {
              image_path: { only: [:id, :name] },
              image_tags: {
                include: { tag_name: { only: [:id, :name] } }
              }
            },
            methods: [:image_url]
          ),
          meta: {
            total: @pagy.count,
            page: @pagy.page,
            per_page: @pagy.items,
            total_pages: @pagy.pages
          }
        }
      end

      # GET /api/v1/memes/:id
      def show
        render json: {
          meme: @meme.as_json(
            include: {
              image_path: { only: [:id, :name] },
              image_tags: {
                include: { tag_name: { only: [:id, :name] } }
              },
              image_embeddings: { only: [:id, :snippet] }
            },
            methods: [:image_url]
          )
        }
      end

      # PATCH /api/v1/memes/:id
      def update
        if @meme.update(meme_params)
          # Recompute embeddings if description changed
          if @meme.previous_changes.key?('description')
            @meme.refresh_description_embeddings
          end

          render json: {
            meme: @meme.as_json(methods: [:image_url])
          }
        else
          render json: {
            error: 'Update failed',
            details: @meme.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/memes/:id
      def destroy
        @meme.destroy
        head :no_content
      end

      # POST /api/v1/memes/:id/generate_description
      def generate_description
        @meme = ImageCore.find(params[:id])

        if @meme.status.in?(['in_queue', 'processing'])
          render json: { error: 'Image already in processing queue' }, status: :unprocessable_entity
          return
        end

        # Update status
        @meme.update(status: :in_queue)

        # Get current model
        current_model = ImageToText.find_by(current: true)

        # Send to ML service
        uri = URI("http://image_to_text_generator:8000/add_job")
        http = Net::HTTP.new(uri.host, uri.port)
        request = Net::HTTP::Post.new(uri)
        request["Content-Type"] = "application/json"
        request.body = {
          image_core_id: @meme.id,
          image_path: "#{@meme.image_path.name}/#{@meme.name}",
          model: current_model.name
        }.to_json

        response = http.request(request)

        if response.is_a?(Net::HTTPSuccess)
          render json: { message: 'Job queued successfully' }, status: :accepted
        else
          @meme.update(status: :failed)
          render json: { error: 'ML service unavailable' }, status: :service_unavailable
        end
      end

      private

      def set_meme
        @meme = ImageCore.find(params[:id])
      end

      def meme_params
        params.require(:meme).permit(:description, tag_ids: [])
      end
    end
  end
end
```

**Checklist:**
- [ ] Memes controller created
- [ ] Index action with pagination
- [ ] Show action
- [ ] Update action
- [ ] Destroy action
- [ ] Generate description action
- [ ] JSON serialization configured
- [ ] Includes associations

### 2.2 Add Image URL Method to Model
Update `app/models/image_core.rb`, add this method:

```ruby
class ImageCore < ApplicationRecord
  # ... existing code ...

  def image_url
    if Rails.env.production?
      "/memes/#{image_path.name}/#{name}"
    else
      "/memes/#{image_path.name}/#{name}"
    end
  end

  # ... existing code ...
end
```

**Checklist:**
- [ ] `image_url` method added to ImageCore model
- [ ] Returns correct path for image

---

## Step 3: Create Search API Controller

### 3.1 Create Search Controller
Create `app/controllers/api/v1/search_controller.rb`:

```ruby
module Api
  module V1
    class SearchController < BaseController
      # POST /api/v1/search
      def create
        query = search_params[:query]
        search_type = search_params[:type] || 'keyword'
        selected_tags = search_params[:tag_ids] || []
        selected_paths = search_params[:path_ids] || []

        if query.blank?
          render json: { memes: [], meta: { total: 0 } }
          return
        end

        # Perform search based on type
        @memes = case search_type
        when 'keyword'
          keyword_search(query)
        when 'vector'
          vector_search(query)
        else
          []
        end

        # Filter by tags if provided
        if selected_tags.any?
          tag_names = TagName.where(id: selected_tags).pluck(:name)
          @memes = @memes.select do |meme|
            meme_tags = meme.image_tags.map { |t| t.tag_name&.name }
            (meme_tags & tag_names).any?
          end
        end

        # Filter by paths if provided
        if selected_paths.any?
          @memes = @memes.select { |meme| selected_paths.include?(meme.image_path_id) }
        end

        render json: {
          memes: @memes.as_json(
            include: {
              image_path: { only: [:id, :name] },
              image_tags: {
                include: { tag_name: { only: [:id, :name] } }
              }
            },
            methods: [:image_url]
          ),
          meta: {
            total: @memes.length,
            query: query,
            type: search_type
          }
        }
      end

      private

      def keyword_search(query)
        cleaned_query = remove_stopwords(query)
        ImageCore.search_any_word(cleaned_query).limit(50).to_a
      end

      def vector_search(query)
        query_embedding = ImageEmbedding.new(
          image_core_id: ImageCore.first.id,
          snippet: query
        )
        query_embedding.compute_embedding

        neighbor_ids = query_embedding.get_neighbors.map(&:image_core_id).uniq
        neighbor_ids.map { |id| ImageCore.find(id) }
      end

      def remove_stopwords(query)
        stopwords = %w[a i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those am is are was were be been being have has had having do does did doing a an the and but if or as until while of at by for with above below to from up down in out on off over under how all any both each few more most other some such no nor not only own same so than too very s]

        words = query.split
        filtered = words.reject { |word| stopwords.include?(word.downcase) }
        filtered.join(" ")
      end

      def search_params
        params.permit(:query, :type, tag_ids: [], path_ids: [])
      end
    end
  end
end
```

**Checklist:**
- [ ] Search controller created
- [ ] Keyword search implemented
- [ ] Vector search implemented
- [ ] Tag filtering
- [ ] Path filtering
- [ ] Stopword removal

---

## Step 4: Create Tags API Controller

### 4.1 Create Tags Controller
Create `app/controllers/api/v1/tags_controller.rb`:

```ruby
module Api
  module V1
    class TagsController < BaseController
      # GET /api/v1/tags
      def index
        @tags = TagName.order(:name)

        render json: {
          tags: @tags.as_json(only: [:id, :name])
        }
      end
    end
  end
end
```

**Checklist:**
- [ ] Tags controller created
- [ ] Index action returns all tags

---

## Step 5: Create Paths API Controller

### 5.1 Create Paths Controller
Create `app/controllers/api/v1/paths_controller.rb`:

```ruby
module Api
  module V1
    class PathsController < BaseController
      # GET /api/v1/paths
      def index
        @paths = ImagePath.order(:name)

        render json: {
          paths: @paths.as_json(only: [:id, :name])
        }
      end
    end
  end
end
```

**Checklist:**
- [ ] Paths controller created
- [ ] Index action returns all paths

---

## Step 6: Update Routes

### 6.1 Add API Routes
Update `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  # ... existing routes ...

  # API routes for React components
  namespace :api do
    namespace :v1 do
      resources :memes, only: [:index, :show, :update, :destroy] do
        member do
          post :generate_description
        end
      end

      resources :tags, only: [:index]
      resources :paths, only: [:index]

      post 'search', to: 'search#create'
    end
  end

  # ... rest of routes ...
end
```

**Checklist:**
- [ ] API namespace created
- [ ] Memes routes added
- [ ] Tags routes added
- [ ] Paths routes added
- [ ] Search route added

---

## Step 7: Test API Endpoints

### 7.1 Start Server
```bash
cd meme_search_pro/meme_search_app
bin/dev
```

**Checklist:**
- [ ] Server starts without errors

### 7.2 Test with curl

**Test Memes Index:**
```bash
curl http://localhost:3000/api/v1/memes | jq
```

**Test Memes Show:**
```bash
curl http://localhost:3000/api/v1/memes/1 | jq
```

**Test Tags:**
```bash
curl http://localhost:3000/api/v1/tags | jq
```

**Test Paths:**
```bash
curl http://localhost:3000/api/v1/paths | jq
```

**Test Search:**
```bash
curl -X POST http://localhost:3000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "funny cat", "type": "keyword"}' | jq
```

**Checklist:**
- [ ] Memes index returns JSON
- [ ] Memes show returns JSON
- [ ] Tags returns JSON
- [ ] Paths returns JSON
- [ ] Search returns results
- [ ] All responses have correct structure
- [ ] Pagination metadata included

### 7.3 Test with Browser Console

Open browser console and run:

```javascript
// Test API client (from Task 02)
const response = await fetch('/api/v1/memes')
const data = await response.json()
console.log(data)

// Test search
const searchResponse = await fetch('/api/v1/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
  },
  body: JSON.stringify({
    query: 'test',
    type: 'keyword'
  })
})
const searchData = await searchResponse.json()
console.log(searchData)
```

**Checklist:**
- [ ] Fetch from browser works
- [ ] CSRF token accepted
- [ ] JSON responses correct

---

## Step 8: Create Custom Hooks

### 8.1 Create useMemes Hook
Create `app/javascript/hooks/useMemes.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Meme } from '@/types'

export function useMemes(page: number = 1, perPage: number = 50) {
  return useQuery({
    queryKey: ['memes', page, perPage],
    queryFn: async () => {
      const response = await apiClient.get<{
        memes: Meme[]
        meta: {
          total: number
          page: number
          per_page: number
          total_pages: number
        }
      }>(`/memes?page=${page}&per_page=${perPage}`)
      return response
    },
  })
}

export function useMeme(id: number) {
  return useQuery({
    queryKey: ['memes', id],
    queryFn: async () => {
      const response = await apiClient.get<{ meme: Meme }>(`/memes/${id}`)
      return response.meme
    },
    enabled: !!id,
  })
}

export function useUpdateMeme() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Meme> }) => {
      return apiClient.put(`/memes/${id}`, { meme: data })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memes'] })
    },
  })
}

export function useDeleteMeme() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/memes/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memes'] })
    },
  })
}

export function useGenerateDescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient.post(`/memes/${id}/generate_description`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memes'] })
    },
  })
}
```

**Checklist:**
- [ ] `useMemes` hook created
- [ ] `useMeme` hook created
- [ ] `useUpdateMeme` mutation created
- [ ] `useDeleteMeme` mutation created
- [ ] `useGenerateDescription` mutation created
- [ ] Query invalidation on mutations

### 8.2 Create useSearch Hook
Create `app/javascript/hooks/useSearch.ts`:

```typescript
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Meme } from '@/types'

interface SearchParams {
  query: string
  type: 'keyword' | 'vector'
  tag_ids?: number[]
  path_ids?: number[]
}

export function useSearch() {
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
  })
}
```

**Checklist:**
- [ ] `useSearch` hook created
- [ ] Handles keyword and vector search
- [ ] Supports filtering

### 8.3 Create useTags Hook
Create `app/javascript/hooks/useTags.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface Tag {
  id: number
  name: string
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await apiClient.get<{ tags: Tag[] }>('/tags')
      return response.tags
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
```

**Checklist:**
- [ ] `useTags` hook created
- [ ] Cached for 10 minutes

---

## Step 9: Verify & Commit

### 9.1 Check Routes
```bash
bin/rails routes | grep api
```

**Checklist:**
- [ ] All API routes listed
- [ ] Correct HTTP methods
- [ ] Correct paths

### 9.2 Test All Endpoints
Use curl or Postman to test:
- [ ] GET /api/v1/memes
- [ ] GET /api/v1/memes/:id
- [ ] PATCH /api/v1/memes/:id
- [ ] DELETE /api/v1/memes/:id
- [ ] POST /api/v1/memes/:id/generate_description
- [ ] GET /api/v1/tags
- [ ] GET /api/v1/paths
- [ ] POST /api/v1/search

### 9.3 Commit
```bash
git add -A
git commit -m "Phase 4: API layer for React components complete"
git tag -a v1.4-api -m "API layer phase complete"
```

**Checklist:**
- [ ] All changes committed
- [ ] Git tag created

---

## Success Criteria

- [x] API namespace created
- [x] Memes API controller working
- [x] Search API working
- [x] Tags and Paths APIs working
- [x] All endpoints return JSON
- [x] Pagination implemented
- [x] Error handling working
- [x] Custom hooks created
- [x] CSRF protection maintained

---

**Next**: Proceed to `05-gallery-component.md` (Build the Gallery React Island)
