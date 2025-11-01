# Remaining Tailwind Mockups - Systematic Creation Plan

## Overview

This plan outlines the systematic creation of 11 additional Tailwind mockups to complete the meme-search application mockup suite, matching the Rails app structure exactly.

---

## Current Status

### ✅ Completed Mockups (3)
1. **gallery-after-tailwind.html** - All Memes index page
2. **search-tailwind.html** - Search page with filters
3. **settings-tailwind.html** - Settings dashboard (tabbed interface - NOT used in final Rails app)

### 📋 Mockups to Create (11)

---

## Priority 1: Core User Flows (3 mockups)

### 1. Image Show/Detail Page
**File**: `mockups/image-show.html`
**Rails View**: `app/views/image_cores/show.html.erb`
**Route**: `GET /image_cores/:id`

**Key Elements**:
- Navigation bar (same as other pages)
- Large image display (max-width: 450px)
- Description textarea (disabled, read-only display)
- Tag badges with custom colors from database
- Generate description button with status indicator (not_started → in_queue → processing → done)
- Action buttons:
  - "Edit details" (purple gradient)
  - "Back to memes" (gray)
  - "Delete" (red gradient with confirmation)

**Glassmorphism Pattern**:
```
Container: bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl
Image: rounded-2xl shadow-2xl
Textarea: bg-white/90 dark:bg-slate-700/90 backdrop-blur-lg
Buttons: gradient backgrounds with hover effects
```

**Data to Show** (sample):
- Image: `/memes/sample-meme.jpg`
- Description: "A funny meme about coding at 3am with multiple bugs"
- Tags: funny (#FF6B6B), programming (#4ECDC4), relatable (#95E1D3)
- Status: "done" (green badge)

---

### 2. Image Edit Page
**File**: `mockups/image-edit.html`
**Rails View**: `app/views/image_cores/edit.html.erb`
**Route**: `GET /image_cores/:id/edit`

**Key Elements**:
- Navigation bar
- Image preview (max-width: 450px)
- Editable description textarea
- Multi-select tag dropdown with checkboxes (Tom Select style)
  - Color-coded tag options
  - Live selection preview
- Generate description button with status
- Form buttons:
  - "Save" (emerald gradient)
  - "Back" (gray)
  - "Back to memes" (gray)

**Interactive Features**:
- Tag dropdown opens/closes
- Tag selection updates display
- Character count for description
- Form validation on submit

**Glassmorphism Pattern**:
```
Form container: bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl p-8
Tag dropdown: bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl
Tag options: hover:bg-slate-100 dark:hover:bg-slate-700
```

**Data to Show**:
- Pre-filled description
- 2-3 tags already selected
- Available tags: funny, programming, debugging, relatable

---

### 3. Filter Sidebar/Modal
**File**: `mockups/filter-sidebar.html`
**Rails View**: `app/views/image_cores/_filters.html.erb`
**Route**: Used on index page as slideover dialog

**Key Elements**:
- Slide-out dialog from left (300px width, 300ms animation)
- Backdrop overlay (dark/50 backdrop-blur-sm)
- Close button (top right, X icon)
- Filter sections:
  1. **Tags** - Multi-select checkboxes with color badges
  2. **Paths** - Multi-select checkboxes
  3. **Embeddings** - Single checkbox "Has embeddings?"
- Action buttons:
  - "Apply filters" (purple gradient)
  - "Close without filtering" (gray)
- View toggle button:
  - "Switch to Grid View" / "Switch to List View" / "Switch to Masonry View"

**Animation Pattern**:
```
Dialog: translate-x-[-100%] → translate-x-0 (transition-transform duration-300)
Backdrop: opacity-0 → opacity-100 (transition-opacity duration-300)
Open state: Add 'open' class to dialog element
```

**Glassmorphism Pattern**:
```
Dialog: bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl
Sections: border-b border-gray-200 dark:border-gray-700
Checkboxes: rounded with focus:ring-4 focus:ring-purple-300
```

**Data to Show**:
- Tags: funny, programming, debugging, relatable (with colors)
- Paths: example_memes_1, example_memes_2
- All filters initially unchecked

---

## Priority 2: Settings - Tag Management (4 mockups)

### 4. Tags Index Page
**File**: `mockups/settings-tags-index.html`
**Rails View**: `app/views/settings/tag_names/index.html.erb`
**Route**: `GET /settings/tag_names`

**Key Elements**:
- Navigation bar with "Settings" active (but no sub-navigation)
- Page header: "Current tags" with bottom border
- "Create new" button (top right, fuchsia gradient)
- Tag list (glassmorphic cards):
  - Tag name badge with custom color
  - "Adjust / delete" link (right side)
- Pagination controls (if > 10 items)
- Empty state: "No tags yet. Create your first tag!"

**Layout**:
```
- Max-width: 4xl container
- List: space-y-4
- Each item: flex justify-between items-center p-4
```

**Data to Show**:
- funny (#FF6B6B)
- programming (#4ECDC4)
- debugging (#95E1D3)
- relatable (#F38181)

---

### 5. Tag Show/Detail Page
**File**: `mockups/settings-tag-show.html`
**Rails View**: `app/views/settings/tag_names/show.html.erb`
**Route**: `GET /settings/tag_names/:id`

**Key Elements**:
- Navigation bar
- Tag display (large badge with color)
- Action buttons (stacked vertically):
  - "Edit this tag" (fuchsia gradient)
  - "Back to tags" (gray)
  - "Delete this tag" (red gradient with confirmation)

**Layout**:
```
- Centered container (max-w-2xl)
- Tag badge: text-3xl px-8 py-4 rounded-2xl
- Buttons: w-full max-w-xs space-y-4
```

**Data to Show**:
- Tag: "funny" (#FF6B6B)

---

### 6. Tag New Form
**File**: `mockups/settings-tag-new.html`
**Rails View**: `app/views/settings/tag_names/new.html.erb`
**Route**: `GET /settings/tag_names/new`

**Key Elements**:
- Navigation bar
- Form header: "New tag"
- Color picker section:
  - Color input (native HTML5 color picker)
  - Hex text input (synchronized)
  - Live preview circle showing letter "A" with selected color
- Tag name text input
- Action buttons:
  - "Save" (emerald gradient)
  - "Back to tags" (gray)

**Interactive Features**:
```javascript
// Synchronize color picker and hex input
function updateColorPreview() {
    const colorPicker = document.getElementById('colorPicker');
    const hexInput = document.getElementById('hexInput');
    const preview = document.getElementById('colorPreview');

    preview.style.backgroundColor = colorPicker.value;
    hexInput.value = colorPicker.value.substring(1).toUpperCase();
}

function updateColorFromHex() {
    const hexInput = document.getElementById('hexInput');
    const colorPicker = document.getElementById('colorPicker');
    const preview = document.getElementById('colorPreview');

    let hex = hexInput.value.replace('#', '');
    if (hex.length === 6 && /^[0-9A-F]+$/i.test(hex)) {
        const fullHex = '#' + hex;
        colorPicker.value = fullHex;
        preview.style.backgroundColor = fullHex;
    }
}
```

**Layout**:
```
- Form container: max-w-2xl mx-auto
- Glassmorphic form: bg-white/90 dark:bg-slate-800/90 p-8
- Color preview: w-16 h-16 rounded-full flex items-center justify-center
- Preview text: "A" in white, font-bold text-2xl
```

**Default Values**:
- Color: #FF6B6B (coral red)
- Hex input: "FF6B6B"
- Tag name: empty

---

### 7. Tag Edit Form
**File**: `mockups/settings-tag-edit.html`
**Rails View**: `app/views/settings/tag_names/edit.html.erb`
**Route**: `GET /settings/tag_names/:id/edit`

**Key Elements**:
- Same as Tag New Form but:
  - Header: "Edit tag"
  - Pre-filled values from existing tag
  - Additional "Back" button (to show page)

**Pre-filled Data**:
- Tag name: "funny"
- Color: #FF6B6B
- Hex input: "FF6B6B"

---

## Priority 3: Settings - Path Management (4 mockups)

### 8. Paths Index Page
**File**: `mockups/settings-paths-index.html`
**Rails View**: `app/views/settings/image_paths/index.html.erb`
**Route**: `GET /settings/image_paths`

**Key Elements**:
- Navigation bar with "Settings" active
- Page header: "Current directory paths" with bottom border
- "Create new" button (top right, fuchsia gradient)
- Path list (glassmorphic cards):
  - Path name in gray pill/badge
  - "Adjust / delete" link (right side)
- Pagination controls
- Empty state: "No paths yet. Add your first directory path!"

**Layout**:
```
- Max-width: 4xl container
- List: space-y-4
- Each item: flex justify-between items-center p-4
- Path badge: bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-full font-mono
```

**Data to Show**:
- example_memes_1
- example_memes_2

---

### 9. Path Show/Detail Page
**File**: `mockups/settings-path-show.html`
**Rails View**: `app/views/settings/image_paths/show.html.erb`
**Route**: `GET /settings/image_paths/:id`

**Key Elements**:
- Navigation bar
- Path display (large gray pill with monospace font)
- Action buttons (stacked vertically):
  - "Edit this directory path" (fuchsia gradient)
  - "Back to directory paths" (gray)
  - "Delete this directory path" (red gradient with confirmation)

**Layout**:
```
- Centered container (max-w-2xl)
- Path pill: text-xl px-6 py-3 rounded-2xl font-mono
- Buttons: w-full max-w-xs space-y-4
```

**Data to Show**:
- Path: "example_memes_1"

---

### 10. Path New Form
**File**: `mockups/settings-path-new.html`
**Rails View**: `app/views/settings/image_paths/new.html.erb`
**Route**: `GET /settings/image_paths/new`

**Key Elements**:
- Navigation bar
- Form header: "New directory path"
- Help text (italic, gray):
  - "Enter a valid subdirectory in /public/memes (e.g., 'archive', '2024', 'funny')"
  - "Path must exist and contain image files"
- Path text input (monospace font)
- Action buttons:
  - "Save" (emerald gradient)
  - "Back to directory paths" (gray)

**Layout**:
```
- Form container: max-w-2xl mx-auto
- Glassmorphic form: bg-white/90 dark:bg-slate-800/90 p-8
- Text input: font-mono px-4 py-3
- Help text: text-sm text-gray-600 dark:text-gray-400 italic mt-2
```

**Default Values**:
- Path input: empty
- Placeholder: "example_memes_new"

---

### 11. Path Edit Form
**File**: `mockups/settings-path-edit.html`
**Rails View**: `app/views/settings/image_paths/edit.html.erb`
**Route**: `GET /settings/image_paths/:id/edit`

**Key Elements**:
- Same as Path New Form but:
  - Header: "Editing image path"
  - Pre-filled path value
  - Additional "Back" button (to show page)

**Pre-filled Data**:
- Path: "example_memes_1"

---

## Consistent Design Patterns Across All Mockups

### Navigation Bar
```html
<nav class="bg-gray-300/80 dark:bg-slate-700/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-lg fixed top-0 left-0 right-0 z-50">
  <div class="container mx-auto px-6 py-4">
    <div class="flex items-center justify-between">
      <a href="gallery-after-tailwind.html" class="text-2xl font-bold text-slate-800 dark:text-white">
        MemeSearch
      </a>
      <ul class="flex space-x-8">
        <li><a href="gallery-after-tailwind.html" class="...">All memes</a></li>
        <li><a href="search-tailwind.html" class="...">Search memes</a></li>
        <li><a href="settings-tags-index.html" class="...">Settings</a></li>
      </ul>
    </div>
  </div>
</nav>
```

### Glassmorphism Containers
```html
<!-- Main container -->
<div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-2xl">

<!-- Form inputs -->
<input class="w-full px-4 py-3 text-black dark:text-white bg-white/90 dark:bg-slate-700/90 backdrop-blur-lg border border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all" />

<!-- Textarea -->
<textarea class="w-full px-4 py-3 text-black dark:text-white bg-white/90 dark:bg-slate-700/90 backdrop-blur-lg border border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-fuchsia-500/50 resize-none"></textarea>
```

### Button Styles
```html
<!-- Primary action (Save) -->
<button class="px-6 py-3 text-white font-semibold bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
  Save
</button>

<!-- Edit action -->
<button class="px-6 py-3 text-white font-semibold bg-gradient-to-r from-fuchsia-400 to-fuchsia-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
  Edit
</button>

<!-- Delete action -->
<button class="px-6 py-3 text-white font-semibold bg-gradient-to-r from-red-400 to-red-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all" onclick="return confirm('Are you sure?')">
  Delete
</button>

<!-- Secondary action (Back/Cancel) -->
<button class="px-6 py-3 text-gray-700 dark:text-gray-300 font-semibold bg-white/90 dark:bg-slate-700/90 backdrop-blur-lg border border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg hover:shadow-xl transition-all">
  Back
</button>
```

### Tag Badges
```html
<span class="px-3 py-1 rounded-full text-sm font-semibold" style="background-color: rgba(255, 107, 107, 0.3); color: #FF6B6B;">
  funny
</span>
```

### Dark Mode Toggle
```javascript
// Press 'D' key to toggle dark mode
document.addEventListener('keydown', (e) => {
    if (e.key === 'd') {
        document.documentElement.classList.toggle('dark');
    }
});
```

---

## Implementation Order

### Phase 1: Core User Flows (Create first)
1. Image Show/Detail Page
2. Image Edit Page
3. Filter Sidebar/Modal

**Rationale**: These are the most frequently used screens in the app. Users view and edit memes constantly.

### Phase 2: Settings - Tag Management
4. Tags Index Page
5. Tag Show/Detail Page
6. Tag New Form
7. Tag Edit Form

**Rationale**: Tags are critical for organization. Complete the full CRUD flow.

### Phase 3: Settings - Path Management
8. Paths Index Page
9. Path Show/Detail Page
10. Path New Form
11. Path Edit Form

**Rationale**: Paths are administrative but necessary. Similar structure to tags.

---

## File Naming Convention

```
mockups/
├── gallery-after-tailwind.html      ✅ Complete
├── search-tailwind.html             ✅ Complete
├── settings-tailwind.html           ✅ Complete (tabbed, not used in final)
├── image-show.html                  📋 Priority 1.1
├── image-edit.html                  📋 Priority 1.2
├── filter-sidebar.html              📋 Priority 1.3
├── settings-tags-index.html         📋 Priority 2.1
├── settings-tag-show.html           📋 Priority 2.2
├── settings-tag-new.html            📋 Priority 2.3
├── settings-tag-edit.html           📋 Priority 2.4
├── settings-paths-index.html        📋 Priority 3.1
├── settings-path-show.html          📋 Priority 3.2
├── settings-path-new.html           📋 Priority 3.3
└── settings-path-edit.html          📋 Priority 3.4
```

---

## Testing Checklist (Apply to Each Mockup)

### Visual Tests
- [ ] Navigation bar displays correctly
- [ ] Correct nav item is active (fuchsia background)
- [ ] Page title/header centered and bold
- [ ] Glassmorphism visible on containers
- [ ] Buttons have gradient backgrounds
- [ ] Forms have proper spacing and alignment
- [ ] All text is readable in light/dark modes

### Functional Tests
- [ ] All links work (relative paths)
- [ ] Forms can be filled out
- [ ] Buttons show hover effects (scale, shadow)
- [ ] Dark mode toggle works (press 'D')
- [ ] All colors update in dark mode
- [ ] Interactive features work (dropdowns, color picker, etc.)
- [ ] Delete buttons show confirmation dialog
- [ ] Responsive at mobile/tablet/desktop sizes

### Consistency Tests
- [ ] Matches glassmorphism pattern from gallery/search pages
- [ ] Button gradients match established colors
- [ ] Font sizes and weights consistent
- [ ] Border radius consistent (rounded-2xl, rounded-3xl)
- [ ] Shadow levels consistent
- [ ] Spacing consistent (p-4, p-6, p-8)

---

## Documentation After Completion

For each mockup, document:
1. File path and Rails view mapping
2. Key Tailwind classes used
3. Interactive JavaScript features
4. Sample data shown
5. Screenshots (optional)

Create summary markdown files:
- `PRIORITY_1_SUMMARY.md` - Core user flows
- `PRIORITY_2_SUMMARY.md` - Tag management
- `PRIORITY_3_SUMMARY.md` - Path management

---

## Success Criteria

- ✅ All 11 mockups created with 100% Tailwind utilities
- ✅ Zero custom CSS
- ✅ Consistent glassmorphism styling
- ✅ Full dark mode support
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ All interactive features working
- ✅ Proper navigation between pages
- ✅ Ready to apply to Rails ERB templates

---

## Total Mockups After Completion

**14 total mockup files**:
- 3 existing (gallery, search, settings-tabbed)
- 11 new (matching Rails exactly)

**Ready for Rails integration!** 🚀
