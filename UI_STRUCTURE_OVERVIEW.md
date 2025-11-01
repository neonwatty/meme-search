# Meme Search Rails App - UI Structure & Styling Overview

## Project Technology Stack

### Frontend Framework & Styling
- **Rails Version**: 8.0.0+
- **CSS Framework**: Tailwind CSS with `@tailwindcss/forms`, `@tailwindcss/typography`, `@tailwindcss/container-queries`
- **JavaScript Framework**: Hotwired Stimulus (stimulus-rails)
- **Module System**: Rails importmap-rails
- **UI Component Library**: tailwindcss-stimulus-components v6.1.2
- **Dark Mode Support**: Built-in via Tailwind (prefers-color-scheme dark)
- **Font**: Inter (Google Font)

### Key Dependencies
- **turbo-rails**: For Turbo Streams and navigation
- **stimulus-rails**: For Stimulus controllers
- **image_processing**: For image transformations
- **pagy**: For pagination
- **pg + pgvector**: PostgreSQL with vector extension for semantic search
- **importmap-rails**: JavaScript module management

---

## Application Routes & Controllers

### Route Structure (from config/routes.rb)

```
GET  /                                    → image_cores#index (root)
GET  /image_cores                         → image_cores#index (gallery)
GET  /image_cores/:id                     → image_cores#show (detail view)
POST /image_cores                         → image_cores#create
PATCH /image_cores/:id                    → image_cores#update
DELETE /image_cores/:id                   → image_cores#destroy
GET  /image_cores/search                  → image_cores#search (search page)
POST /image_cores/search_items            → image_cores#search_items (ajax search)
POST /image_cores/:id/generate_description → image_cores#generate_description
POST /image_cores/:id/generate_stopper     → image_cores#generate_stopper
POST /image_cores/description_receiver    → image_cores#description_receiver (webhook)
POST /image_cores/status_receiver         → image_cores#status_receiver (webhook)

GET  /settings                            → settings#index
GET  /settings/tag_names                  → settings/tag_names#index
GET  /settings/tag_names/new              → settings/tag_names#new
POST /settings/tag_names                  → settings/tag_names#create
GET  /settings/tag_names/:id              → settings/tag_names#show
GET  /settings/tag_names/:id/edit         → settings/tag_names#edit
PATCH /settings/tag_names/:id             → settings/tag_names#update
DELETE /settings/tag_names/:id            → settings/tag_names#destroy

GET  /settings/image_paths                → settings/image_paths#index
GET  /settings/image_paths/new            → settings/image_paths#new
POST /settings/image_paths                → settings/image_paths#create
GET  /settings/image_paths/:id            → settings/image_paths#show
GET  /settings/image_paths/:id/edit       → settings/image_paths#edit
PATCH /settings/image_paths/:id           → settings/image_paths#update
DELETE /settings/image_paths/:id          → settings/image_paths#destroy

GET  /settings/image_to_texts             → settings/image_to_texts#index
POST /settings/image_to_texts/update_current → settings/image_to_texts#update_current
```

### Controllers

| Controller | Location | Actions | Purpose |
|-----------|----------|---------|---------|
| `ImageCoresController` | `app/controllers/` | index, show, edit, update, destroy, search, search_items, generate_description, generate_stopper, description_receiver, status_receiver | Main CRUD for meme gallery |
| `SettingsController` | `app/controllers/` | index | Settings hub page |
| `Settings::TagNamesController` | `app/controllers/settings/` | index, show, new, create, edit, update, destroy | Tag CRUD |
| `Settings::ImagePathsController` | `app/controllers/settings/` | index, show, new, create, edit, update, destroy | Image directory CRUD |
| `Settings::ImageToTextsController` | `app/controllers/settings/` | index, update_current | Model selection |
| `ImageTagsController` | `app/controllers/` | CRUD actions | Image-Tag associations |
| `ImageEmbeddingsController` | `app/controllers/` | CRUD actions | Vector embeddings |
| `ApplicationController` | `app/controllers/` | Base controller | Rate limiting, auth, CSP |

---

## View Files Organization

### Directory Structure

```
app/views/
├── layouts/
│   ├── application.html.erb          # Main layout wrapper
│   ├── mailer.html.erb               # Email layout
│   └── action_text/
│       └── contents/
│           └── _content.html.erb
├── shared/
│   ├── _nav.html.erb                 # Navigation bar (all pages)
│   └── _notifications.html.erb       # Flash message notifications
├── image_cores/
│   ├── index.html.erb                # Gallery view (list/grid toggle)
│   ├── show.html.erb                 # Meme detail page
│   ├── edit.html.erb                 # Meme edit page
│   ├── search.html.erb               # Search interface
│   ├── _image_core.html.erb          # Meme card partial (full)
│   ├── _image_only.html.erb          # Meme card partial (grid view)
│   ├── _form.html.erb                # Meme form (unused currently)
│   ├── _edit.html.erb                # Edit form with description & tags
│   ├── _filters.html.erb             # Filter slideover (tags, paths, embeddings)
│   ├── _tag_toggle.html.erb          # Tag selector multi-select
│   ├── _path_toggle.html.erb         # Path selector multi-select
│   ├── _generate_status.html.erb     # Status badge with generate button
│   ├── _search_results.html.erb      # Search results with view toggle
│   ├── _no_search.html.erb           # Empty state for search
│   └── _no_search_results.html.erb   # No results state
├── settings/
│   ├── index.html.erb                # Settings hub
│   ├── tag_names/
│   │   ├── index.html.erb            # Tag list
│   │   ├── new.html.erb              # New tag form
│   │   ├── edit.html.erb             # Edit tag form
│   │   ├── show.html.erb             # Tag detail
│   │   ├── _form.html.erb            # Tag form partial (color picker)
│   │   └── _tag_name.html.erb        # Tag display partial
│   ├── image_paths/
│   │   ├── index.html.erb            # Path list
│   │   ├── new.html.erb              # New path form
│   │   ├── edit.html.erb             # Edit path form
│   │   ├── show.html.erb             # Path detail
│   │   ├── _form.html.erb            # Path form partial
│   │   └── _image_path.html.erb      # Path display partial
│   └── image_to_texts/
│       └── index.html.erb            # Model selection with toggles
├── image_tags/
│   ├── index.html.erb
│   ├── new.html.erb
│   ├── edit.html.erb
│   ├── show.html.erb
│   ├── _form.html.erb
│   └── _image_tag.html.erb
├── image_embeddings/
│   ├── index.html.erb
│   ├── new.html.erb
│   ├── edit.html.erb
│   ├── show.html.erb
│   └── _form.html.erb
├── active_storage/
│   └── blobs/
│       └── _blob.html.erb
└── pwa/
    └── service-worker.js             # PWA service worker
```

---

## Key Pages & Their Structure

### 1. Gallery Page (`/`) - `image_cores#index`

**Purpose**: Display all memes with filtering and view toggling

**Components**:
- Navigation bar (shared)
- Filter button (slideover with tags, paths, embeddings filter)
- View toggle button (list ↔ grid)
- Meme cards (list view or grid)
- Pagination

**Stimulus Controllers Used**:
- `view-switcher`: Toggle between list and grid views
- `slideover`: Filter panel

**Layout**:
- List View (default): Horizontal flex layout with meme cards
- Grid View: 4-column responsive grid (sm:2, md:3, lg:4)
- Pagination: Pagy-based navigation at bottom

**Styling**:
- Dark mode support
- Hover scale effect (hover:scale-105)
- Rounded corners (rounded-2xl)
- Responsive padding and gaps

---

### 2. Search Page (`/image_cores/search`) - `image_cores#search`

**Purpose**: Search memes by keyword or vector similarity

**Components**:
- Search input field (debounced)
- Vector/Keyword toggle switch
- Tag filter dropdown (multi-select)
- View toggle button
- Dynamic search results

**Stimulus Controllers Used**:
- `debounce`: 300ms debounce on search input
- `multi-select`: Tag selection dropdown
- `view-switcher`: List/grid toggle for results

**Key Features**:
- Real-time search with debounce
- Keyword search (default)
- Vector semantic search (toggle enabled)
- Tag filtering within search
- Conditional rendering (no results, no search)

---

### 3. Meme Detail Page (`/image_cores/:id`) - `image_cores#show`

**Purpose**: View full meme with description and action buttons

**Components**:
- Large meme image (450px)
- Description (read-only textarea)
- Tags display
- Status badge with generate button
- Action buttons: Edit, Back to Gallery, Delete

**Layout**:
- Centered flex column layout
- Image displayed at top
- Description and tags below
- 3 buttons in row at bottom

**Styling**:
- Background badge for status
- Color-coded tag badges (from tag color)
- Button styling (edit=fuchsia, delete=red, back=amber)

---

### 4. Meme Edit Page (`/image_cores/:id/edit`) - `image_cores#edit`

**Purpose**: Edit meme description and tags

**Components**:
- Rendered edit partial with form
- Image (300px)
- Editable description textarea
- Tag multi-select dropdown
- Save button
- Back button (to detail)
- Back to gallery button

**Stimulus Controllers Used**:
- `multi-select`: Tag selection

**Form Features**:
- Inline form submission
- Real-time tag selection
- Description update
- Form validation (model-level)

---

### 5. Settings Hub (`/settings`) - `settings#index`

**Purpose**: Central navigation for all configuration

**Components**:
- 3 main links:
  1. Adjust image tags
  2. Adjust image paths
  3. Adjust image-to-text model

**Styling**: Simple button grid (index-button class)

---

### 6. Tags Settings (`/settings/tag_names`) - `settings/tag_names#index`

**Purpose**: List, create, and manage tags

**Features**:
- Tag list with color badges
- Pagination
- "Create new" button
- Each tag has "Adjust/delete" link

**Create/Edit Tag Form** (`_form.html.erb`):
- Color picker (hex input with preview)
- Tag name input (text field)
- Save button

**Stimulus Controllers**:
- `color-picker`: Manages color selection
- `color-preview`: Updates preview A badge with selected color

---

### 7. Paths Settings (`/settings/image_paths`) - `settings/image_paths#index`

**Purpose**: List and manage image directories

**Features**:
- Path list with descriptions
- Pagination
- "Create new" button
- Each path has "Adjust/delete" link

**Create/Edit Path Form** (`_form.html.erb`):
- Simple text input for subdirectory name
- Validation note (must be subdirectory in /public/memes)
- Save button

---

### 8. Models Settings (`/settings/image_to_texts`) - `settings/image_to_texts#index`

**Purpose**: Select active vision-language model

**Features**:
- Model list with descriptions
- Each model has:
  - Name and description
  - "Learn more" link to resource
  - Toggle switch (on/off)
- Save button

**Stimulus Controllers**:
- `toggle`: Radio-like toggle (only one active)

---

## Styling & Design System

### Typography
- **Font**: Inter (via @tailwindcss/forms)
- **Default Text Color**: Black (light mode), white (dark mode)
- **Sizes**: text-2xl (headings), text-base/sm (body)
- **Font Weight**: font-semibold (headings), font-bold (sections)

### Color Palette

| Purpose | Color | Tailwind Class |
|---------|-------|----------------|
| Primary Accent | Fuchsia/Purple | `bg-fuchsia-500`, `bg-purple-500` |
| Success/Green | Emerald | `bg-emerald-500`, `bg-emerald-300` |
| Warning/Orange | Amber | `bg-amber-500`, `bg-amber-400` |
| Danger/Red | Red | `bg-red-500` |
| Info/Blue | Blue | `bg-blue-500`, `bg-blue-600` |
| Neutral Background | Gray/Slate | `bg-gray-300`, `bg-slate-200`, `bg-slate-700` |
| Text | Black/White | `text-black`, `dark:text-white` |

### Custom Component Classes

**Buttons** (defined in `app/assets/stylesheets/application.tailwind.css`):

```css
.back-button         → amber bg, black text
.show-button         → fuchsia bg, black text
.edit-button         → fuchsia bg, black text
.delete-button       → red bg, black text
.new-button          → emerald bg, black text
.submit-button       → emerald-300 bg, black text
.index-button        → amber-500 bg, black text
```

**Form Fields**:
```css
.user-profile-input-field  → text input with indigo focus ring
.search-input-field        → w-96 search box with indigo border
```

**Pagination** (pagy-nav):
- Default: Blue links with borders
- Active (current): Blue bg, white text
- Disabled: Gray text
- Dark mode variants included

### Layout Patterns

**Flexbox Layouts**:
- `flex flex-col`: Column-based layouts (most content)
- `flex flex-row`: Horizontal layouts (buttons, tags)
- Spacing: `space-x-*` (horizontal gap), `space-y-*` (vertical gap)
- Alignment: `items-center`, `justify-center`, `justify-between`

**Responsive Design**:
- Breakpoints: `sm:`, `md:`, `lg:` prefixes
- Grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Width: `w-full`, `w-96`, `w-1/2`, `w-1/4`

**Dark Mode**:
- Background: `bg-white dark:bg-slate-800`
- Text: `text-black dark:text-white`
- Borders: Adjusted for visibility

**Hover Effects**:
- Scale: `hover:scale-105` (meme cards)
- Background: `hover:bg-indigo-300` (nav links)
- Text: `hover:text-black`, `hover:text-indigo-500`

### Special UI Elements

**Search Input Field** (custom class):
- Fixed width: 384px (w-96)
- Indigo border: 2px solid
- Shadow: shadow-lg
- Rounded corners: rounded-lg
- Black text in light mode

**Textarea Styling** (inline in layout):
- Height: 7rem (112px)
- Padding: 12px 20px
- Border: 2px solid #ccc
- Border radius: 4px
- Background: #f8f8f8
- Font size: 16px
- No resize

**Filter Slideover**:
- Position: Slide in from left
- Width: w-96
- Full height
- Dark overlay (backdrop:bg-black/80)
- Smooth animation (300ms)

---

## JavaScript & Stimulus Controllers

### Installed Controllers

1. **`view_switcher_controller.js`**
   - Targets: listView, gridView, toggleButton
   - Toggles between list and grid layouts
   - Persists preference in sessionStorage
   - Updates button text and colors dynamically

2. **`debounce_controller.js`**
   - Targets: form
   - 300ms debounce on input
   - Auto-submits search form after typing

3. **`multi_select_controller.js`**
   - Targets: options, selectedItems
   - Dropdown toggle for checkbox lists
   - Updates selected items display
   - Closes on outside click

4. **`toggle_controller.js`**
   - Handles radio-like toggle switches (models)
   - Ensures only one radio per group is checked
   - 10ms delay for smooth animation

### Imported Libraries

**tailwindcss-stimulus-components** (v6.1.2):
- Alert: Auto-dismiss notifications
- Autosave: Form auto-save with status
- ColorPreview: Color picker with contrast preview
- Dropdown: Menu dropdowns with keyboard nav
- Modal: Dialog modal with animations
- Popover: Toggleable popovers
- Slideover: Side panel (like filters)
- Tabs: Tabbed interface
- Toggle: On/off toggle switches

**Naming Convention**: 
- Controller names use kebab-case: `data-controller="color-picker"`
- Action handlers use camelCase: `data-action="input->color-picker#update"`

### Action Cable (WebSockets)

**Channels** (`app/javascript/channels/`):
- `image_description_channel.js`: Receives real-time description updates
- `image_status_channel.js`: Receives real-time status updates
- Updates DOM in real-time when meme descriptions are generated

---

## Form Components & Interactions

### Multi-Select Pattern

**Used in**:
- Tag filter (search page, filters panel, edit form)
- Path filter (filters panel)
- Model selection (edit form)

**HTML Structure**:
```erb
<div data-controller="multi-select">
  <div data-action="click->multi-select#toggle" class="border rounded-md p-3">
    <input readonly data-multi-select-target="selectedItems" placeholder="Choose tags">
  </div>
  <div data-multi-select-target="options" class="hidden">
    <div class="p-2 flex items-center">
      <input type="checkbox" value="tag-name">
      <label>Tag Name</label>
    </div>
  </div>
</div>
```

### Color Picker Pattern

**Used in**: Tag creation/editing

**HTML Structure**:
```erb
<div data-controller="color-preview">
  <p data-color-preview-target="preview" style="background-color: #ba1e03;">A</p>
  <input type="color" data-action="input->color-preview#update" value="#ba1e03">
</div>
```

### Toggle Switch Pattern

**Used in**: Model selection, vector search toggle

**HTML Structure**:
```erb
<div data-controller="toggle">
  <input type="checkbox" id="model-1" name="current_id" data-action="change->toggle#toggle">
  <label for="model-1">Toggle Label</label>
</div>
```

---

## Navigation Structure

### Main Navigation Bar (`_nav.html.erb`)

**Location**: Rendered on all pages via layout

**Components**:
1. **Logo/Brand**: "MemeSearch" (links to root)
2. **Nav Links** (flex row, center-aligned):
   - "All memes" → root_path
   - "Search memes" → search_image_cores_path
   - Settings dropdown
3. **Settings Dropdown** (Stimulus dropdown):
   - Paths
   - Tags
   - Models

**Styling**:
- Gray background: `bg-gray-300 dark:bg-slate-700`
- Active link: Fuchsia background with padding/rounded
- Hover: Indigo background
- Dropdown: White menu with gray hover states
- Keyboard nav: Up/Down arrows to navigate menu items

---

## Flash Messages & Notifications

**Location**: `shared/_notifications.html.erb`

**Features**:
- Displayed after every page action
- Supports key/value pairs from flash hash
- Styling varies by message type:
  - Notice: Green/success styling
  - Alert: Red/danger styling

---

## Responsive Design Details

### Breakpoints Used
- **sm**: 640px (small phones → tablets)
- **md**: 768px (tablets)
- **lg**: 1024px (desktops)

### Key Responsive Patterns

**Grid Gallery**:
```
Mobile: grid-cols-1       (1 column)
Tablet: sm:grid-cols-2    (2 columns)
Small Desktop: md:grid-cols-3 (3 columns)
Large Desktop: lg:grid-cols-4 (4 columns)
```

**Navigation**:
- Absolute positioning at top
- Flex row layout
- Responsive spacing with inset-x positioning
- Dropdown menus adjust on smaller screens

**Modals/Popovers**:
- Fixed width on desktop (w-96 for filters)
- Full height sliding panels
- Touch-friendly on mobile

---

## Assets & Configuration

### CSS Files
- `application.tailwind.css`: Main Tailwind config and utilities
- `application.css`: Asset pipeline manifest
- `actiontext.css`: ActionText editor styling

### JavaScript Entry Points
- `application.js`: Main JS bundle (imports stimulus, channels)
- `controllers/index.js`: Stimulus controller auto-registration
- `channels/index.js`: Action Cable channel registration

### Configuration
- `tailwind.config.js`: Tailwind theme extension, plugins
- `importmap.json`: JavaScript dependency mapping

---

## Key UX Patterns

### Real-Time Updates
- WebSocket Action Cable for description/status updates
- No page reload required
- DOM updates via Turbo Streams

### Search Experience
- Debounced input (300ms)
- Results update in place
- Can toggle vector/keyword search
- Can filter by tags within search
- View toggle (list/grid) for results

### Form Interactions
- Multi-select dropdowns with checkboxes
- Color picker with live preview
- Radio-like toggles (models)
- Submit buttons with custom styling
- Form validation at model level

### View Management
- List view (default): Full card details visible
- Grid view: Compact image-only cards
- View preference persists in sessionStorage
- Button text updates to reflect state

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| View files | 45+ |
| Controllers | 8 |
| Stimulus controllers (custom) | 6 |
| Imported library controllers (tailwindcss-stimulus-components) | 9 |
| Custom CSS components | 8 button styles + utilities |
| Routes | 30+ |
| Key pages | 8+ |
| Responsive breakpoints used | 3 (sm, md, lg) |

