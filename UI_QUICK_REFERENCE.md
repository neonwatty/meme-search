# Meme Search Rails App - UI Quick Reference Guide

## File Location Quick Reference

### Core View Files

| Page | View File | Route | Controller |
|------|-----------|-------|-----------|
| **Gallery (Home)** | `app/views/image_cores/index.html.erb` | `/` | `image_cores#index` |
| **Meme Detail** | `app/views/image_cores/show.html.erb` | `/image_cores/:id` | `image_cores#show` |
| **Meme Edit** | `app/views/image_cores/edit.html.erb` | `/image_cores/:id/edit` | `image_cores#edit` |
| **Search** | `app/views/image_cores/search.html.erb` | `/image_cores/search` | `image_cores#search` |
| **Settings Hub** | `app/views/settings/index.html.erb` | `/settings` | `settings#index` |
| **Tags List** | `app/views/settings/tag_names/index.html.erb` | `/settings/tag_names` | `settings/tag_names#index` |
| **Paths List** | `app/views/settings/image_paths/index.html.erb` | `/settings/image_paths` | `settings/image_paths#index` |
| **Models List** | `app/views/settings/image_to_texts/index.html.erb` | `/settings/image_to_texts` | `settings/image_to_texts#index` |

### Reusable Partials

| Component | File | Used In |
|-----------|------|---------|
| Navigation | `app/views/shared/_nav.html.erb` | All pages (layout) |
| Notifications | `app/views/shared/_notifications.html.erb` | All pages (layout) |
| Meme Card (Full) | `app/views/image_cores/_image_core.html.erb` | index, show, search results |
| Meme Card (Grid) | `app/views/image_cores/_image_only.html.erb` | Gallery grid, search grid |
| Edit Form | `app/views/image_cores/_edit.html.erb` | edit.html.erb |
| Search Form | `app/views/image_cores/search.html.erb` | Search page |
| Filters Panel | `app/views/image_cores/_filters.html.erb` | Gallery index |
| Tag Toggle | `app/views/image_cores/_tag_toggle.html.erb` | Filters, edit form, search |
| Path Toggle | `app/views/image_cores/_path_toggle.html.erb` | Filters panel |
| Status Badge | `app/views/image_cores/_generate_status.html.erb` | Meme cards, detail page |
| Search Results | `app/views/image_cores/_search_results.html.erb` | Search page (ajax) |
| Tag Form | `app/views/settings/tag_names/_form.html.erb` | Tag new/edit pages |
| Path Form | `app/views/settings/image_paths/_form.html.erb` | Path new/edit pages |

### Styling Files

| File | Purpose | Location |
|------|---------|----------|
| Tailwind Config | Theme customization, plugins | `config/tailwind.config.js` |
| Main Styles | Custom utilities and components | `app/assets/stylesheets/application.tailwind.css` |
| Asset Manifest | CSS import pipeline | `app/assets/stylesheets/application.css` |
| ActionText Styles | Rich text editor styling | `app/assets/stylesheets/actiontext.css` |

### JavaScript Controllers

| Controller | File | Purpose |
|-----------|------|---------|
| View Switcher | `app/javascript/controllers/view_switcher_controller.js` | List ↔ Grid toggle |
| Debounce | `app/javascript/controllers/debounce_controller.js` | Search input debounce (300ms) |
| Multi-Select | `app/javascript/controllers/multi_select_controller.js` | Tag/Path dropdowns |
| Toggle | `app/javascript/controllers/toggle_controller.js` | Model radio toggles |
| Color Preview | `vendor/javascript/tailwindcss-stimulus-components.js` | Color picker preview |
| Color Picker | `vendor/javascript/tailwindcss-stimulus-components.js` | Hex color input |
| Dropdown | `vendor/javascript/tailwindcss-stimulus-components.js` | Nav dropdown menu |
| Slideover | `vendor/javascript/tailwindcss-stimulus-components.js` | Filter panel animation |

### Action Cable Channels

| Channel | File | Purpose |
|---------|------|---------|
| Image Description | `app/javascript/channels/image_description_channel.js` | Real-time description updates |
| Image Status | `app/javascript/channels/image_status_channel.js` | Real-time status updates |

---

## Visual Hierarchy & Component Flow

### Main Navigation Tree

```
All Pages
├── Navigation Bar (_nav.html.erb)
│   ├── Logo "MemeSearch" → root_path
│   ├── "All memes" → image_cores#index
│   ├── "Search memes" → image_cores#search
│   └── Settings Dropdown (dropdown controller)
│       ├── Paths → settings/image_paths#index
│       ├── Tags → settings/tag_names#index
│       └── Models → settings/image_to_texts#index
├── Main Content (varies by page)
└── Flash Notifications (_notifications.html.erb)
```

### Gallery Index Page Flow

```
image_cores#index
├── _filters.html.erb (slideover controller)
│   ├── _tag_toggle.html.erb (multi-select controller)
│   ├── _path_toggle.html.erb (multi-select controller)
│   └── Embeddings checkbox
├── View Toggle Button (view-switcher controller)
├── List View (data-view-switcher-target="listView")
│   └── For each image_core:
│       └── _image_core.html.erb
│           ├── Image (450px)
│           ├── Description textarea
│           ├── Tags display
│           └── _generate_status.html.erb
├── Grid View (data-view-switcher-target="gridView")
│   └── For each image_core:
│       └── _image_only.html.erb
│           └── Image only (grid layout)
└── Pagination (pagy-nav)
```

### Meme Detail Page Flow

```
image_cores#show
├── _image_core.html.erb (same as gallery)
│   ├── Image (450px)
│   ├── Description (read-only)
│   ├── Tags display
│   └── Status badge
└── Action Buttons
    ├── Edit → image_cores#edit
    ├── Back to memes → root_path
    └── Delete → image_cores#destroy (with confirmation)
```

### Meme Edit Page Flow

```
image_cores#edit
├── _edit.html.erb (form)
│   ├── Image (300px)
│   ├── Description textarea (editable)
│   ├── _tag_toggle.html.erb (multi-select)
│   │   └── Dynamic tag list from TagName.all
│   ├── Status badge
│   └── Save button
└── Action Buttons
    ├── Back → image_cores#show
    └── Back to gallery → image_cores#index
```

### Search Page Flow

```
image_cores#search
├── Title: "Search"
├── Search Form
│   ├── Search input (debounce controller)
│   ├── Vector/Keyword toggle (inline JS)
│   └── _tag_toggle.html.erb (multi-select)
├── Results Container
│   ├── _no_search.html.erb (initial state)
│   └── OR _search_results.html.erb (after search)
│       ├── View Toggle Button (view-switcher)
│       ├── List View
│       │   └── _image_core.html.erb (multiple)
│       └── Grid View
│           └── _image_only.html.erb (multiple)
```

### Settings Hub Flow

```
settings#index
└── 3 Buttons (index-button style)
    ├── "Adjust image tags" → settings/tag_names#index
    ├── "Adjust image paths" → settings/image_paths#index
    └── "Adjust image-to-text model" → settings/image_to_texts#index
```

### Tags Settings Flow

```
settings/tag_names#index
├── Title: "Current tags"
├── "Create new" button → settings/tag_names#new
├── For each tag:
│   ├── _tag_name.html.erb (color badge display)
│   └── "Adjust/delete" link → settings/tag_names#show
├── Pagination (pagy-nav)
└── Form pages (new/edit):
    └── _form.html.erb
        ├── Color picker (color-picker + color-preview controllers)
        ├── Tag name input
        └── Save button
```

### Paths Settings Flow

```
settings/image_paths#index
├── Title: "Current directory paths"
├── "Create new" button → settings/image_paths#new
├── For each path:
│   ├── _image_path.html.erb (path name display)
│   └── "Adjust/delete" link → settings/image_paths#show
├── Pagination (pagy-nav)
└── Form pages (new/edit):
    └── _form.html.erb
        ├── Path name input
        ├── Validation note
        └── Save button
```

### Models Settings Flow

```
settings/image_to_texts#index
├── Title: "Available models"
├── Form (POST to update_current)
│   └── For each model:
│       ├── Name & description
│       ├── "Learn more" link
│       └── Toggle switch (toggle controller)
└── Save button
```

---

## Styling Quick Lookup

### Button Styles

```scss
// In app/assets/stylesheets/application.tailwind.css

.back-button {
  @apply ml-2 rounded-lg py-3 px-5 bg-amber-400 text-black border border-black;
}

.show-button {
  @apply rounded-lg py-3 px-5 bg-fuchsia-500 text-black border border-black;
}

.edit-button {
  @apply rounded-lg py-3 px-5 bg-fuchsia-500 text-black border border-black;
}

.delete-button {
  @apply rounded-lg py-3 px-5 bg-red-500 text-black border border-black;
}

.new-button {
  @apply rounded-lg py-3 px-5 bg-emerald-500 text-black border border-black;
}

.submit-button {
  @apply rounded-lg py-3 px-5 bg-emerald-300 text-black border border-black;
}

.index-button {
  @apply rounded-lg py-3 px-5 bg-amber-500 text-black border border-black;
}
```

### Common Tailwind Classes Used

**Layout**:
- `flex flex-col` - Column layout (most pages)
- `flex flex-row` - Row layout (buttons, tags)
- `space-x-*` / `space-y-*` - Gaps
- `items-center justify-center` - Centering
- `items-center justify-between` - Space between
- `w-full` / `w-auto` / `w-96` / `w-1/2` / `w-1/4` - Widths
- `h-full` / `h-auto` - Heights

**Colors**:
- `bg-white dark:bg-slate-800` - Page background
- `bg-slate-200 dark:bg-slate-700` - Card background
- `text-black dark:text-white` - Text color
- `bg-gray-300 dark:bg-slate-700` - Nav background
- `border-black dark:border-white` - Borders
- `bg-fuchsia-300` / `bg-indigo-300` / `bg-fuchsia-500` - Interactive

**Interactions**:
- `hover:scale-105` - Meme card zoom
- `hover:bg-indigo-300` - Nav link hover
- `hover:text-black` - Text hover
- `transition-transform duration-300` - Animation
- `ring ring-purple-500` - Focus ring
- `peer-checked:bg-purple-600` - Checked states

**Responsive**:
- `sm:grid-cols-2` - Tablet
- `md:grid-cols-3` - Small desktop
- `lg:grid-cols-4` - Desktop

**States**:
- `hidden` - Hidden (toggle with JS)
- `sr-only` - Screen reader only
- `disabled` / `cursor-not-allowed` - Disabled states

---

## Stimulus Controller Integration Pattern

### Basic Pattern

```erb
<!-- Data attributes bind view to JavaScript -->
<div data-controller="controller-name">
  <div data-action="event->controller-name#action">
    <!-- Trigger element -->
  </div>
  <div data-controller-target="targetName">
    <!-- Target element -->
  </div>
</div>
```

### Example: Multi-Select

```erb
<div data-controller="multi-select">
  <!-- Toggle trigger -->
  <div data-action="click->multi-select#toggle" class="border rounded-md p-3">
    <input readonly data-multi-select-target="selectedItems" placeholder="Choose items">
  </div>
  
  <!-- Options list (hidden by default) -->
  <div data-multi-select-target="options" class="hidden">
    <input type="checkbox" data-action="change->multi-select#updateSelection">
  </div>
</div>
```

---

## Form Patterns

### Form Field Styling Pattern

```erb
<div class="flex flex-col">
  <%= label_tag :field_name %>
  <%= form.text_field :field_name, class: "user-profile-input-field" %>
</div>
```

### Multi-Select Pattern

```erb
<div data-controller="multi-select">
  <div data-action="click->multi-select#toggle" class="border rounded-md p-3 bg-white shadow-md cursor-pointer">
    <input readonly name="selected_names" data-multi-select-target="selectedItems" placeholder="Choose items">
  </div>
  <div data-multi-select-target="options" class="absolute hidden bg-white border rounded-md shadow-lg z-10">
    <% items.each do |item| %>
      <div class="p-2 flex items-center">
        <%= form.checkbox_field :items, value: item.name, data-action: "change->multi-select#updateSelection" %>
        <%= form.label :items, item.name %>
      </div>
    <% end %>
  </div>
</div>
```

### Color Picker Pattern

```erb
<div data-controller="color-preview">
  <p data-color-preview-target="preview" style="background-color: #ba1e03;">A</p>
  <%= form.color_field :color, 
      value: tag.color || '#ba1e03',
      data-action: "input->color-preview#update" %>
</div>
```

---

## State Management

### SessionStorage (View Preference)

```javascript
// view_switcher_controller.js
this.viewMode = sessionStorage.getItem("viewMode") || "list";
sessionStorage.setItem("viewMode", mode);
```

- Persists list/grid preference within session
- Survives page navigations but resets on browser close

### DOM State (Visibility)

```javascript
// Toggle hidden class
element.classList.toggle("hidden", !isVisible);
```

- Uses Tailwind's `hidden` class
- JavaScript toggles class presence

### Form State (Multi-Select)

```javascript
// Track checked checkboxes
const selected = Array.from(checkboxes)
  .filter(checkbox => checkbox.checked)
  .map(checkbox => checkbox.value);
```

---

## CSS Custom Utilities

### In `application.tailwind.css`

```css
@layer utilities {
  .user-profile-input-field {
    @apply text-black mt-1 block w-full px-3 py-2 border rounded-md ...;
  }
  
  .search-input-field {
    @apply w-96 text-black block px-4 py-3 border-2 border-indigo-600 ...;
  }
  
  .pagy-nav {
    @apply flex items-center space-x-2;
  }
}

@layer components {
  .back-button {
    @apply ml-2 rounded-lg py-3 px-5 bg-amber-400 text-black ...;
  }
  // ... more button styles
}
```

---

## Key Takeaways

1. **Tailwind-First**: All styling uses Tailwind utilities, no custom CSS except small tweaks
2. **Stimulus for Interactivity**: JavaScript is minimal and focused on user interactions
3. **Component Reuse**: Partials are heavily reused (meme cards, forms, toggles)
4. **Dark Mode Built-in**: All colors have dark mode variants
5. **Responsive Grid**: 1-4 columns depending on screen size
6. **State in sessionStorage**: Only view preference persists across reloads
7. **Real-time via WebSocket**: Action Cable for live description/status updates
8. **SEO-Friendly**: All links are regular anchors, not JavaScript
9. **Accessible Forms**: Proper labels, checkboxes, inputs with ARIA attributes
10. **Mobile-First**: Layout adapts responsively from mobile to desktop

