# MemeSearch Mockup Suite - Quick Reference Guide

**Fast lookup for key information about the mockup suite**

---

## File Structure

### Core Gallery & Search (5 files)
```
index.html                    - Entry point
gallery-before.html           - Original state (before)
gallery-after-tailwind.html   - Modern gallery (after) ⭐
search-tailwind.html          - Advanced search ⭐
filter-sidebar.html           - Filter demo
```

### Image Details (2 files)
```
image-show.html               - View meme details
image-edit.html               - Edit meme form
```

### Settings - Tags (4 files)
```
settings-tags-index.html      - View all tags
settings-tag-show.html        - View one tag
settings-tag-new.html         - Create tag
settings-tag-edit.html        - Edit tag
```

### Settings - Paths (4 files)
```
settings-paths-index.html     - View all paths
settings-path-show.html       - View one path
settings-path-new.html        - Create path
settings-path-edit.html       - Edit path
```

### Comparison & Demo (2 files)
```
comparison.html               - Before/after comparison
lightbox-demo.html            - Image lightbox demo
```

**Total: 18 HTML files (~228 KB, 3,983 lines of code)**

---

## At a Glance

| Feature | Status | File | Key Pattern |
|---------|--------|------|-------------|
| **Gallery Browsing** | ✅ Complete | gallery-after-tailwind.html | List/Grid/Masonry toggle |
| **Search** | ✅ Complete | search-tailwind.html | Keyword/Vector toggle + tags |
| **Filters** | ✅ Complete | filter-sidebar.html | Slide-in dialog with nested dropdowns |
| **Image Details** | ✅ Complete | image-show.html | Read-only view with generate button |
| **Image Edit** | ✅ Complete | image-edit.html | Editable form with character count |
| **Tag Management** | ✅ Complete | settings-tag-*.html | CRUD with color picker |
| **Path Management** | ✅ Complete | settings-path-*.html | CRUD with validation |
| **Navigation** | ✅ Verified | All files | Fixed navbar + sub-tabs |
| **Dark Mode** | ✅ All pages | All files | Press 'D' to toggle |

---

## Most Important Files

### To Understand the Design
1. **`index.html`** - Overviews all features
2. **`gallery-after-tailwind.html`** - Modern UI showcase (largest file)
3. **`search-tailwind.html`** - Complex interactions
4. **`NAVIGATION_MAP.md`** - See how pages connect

### To Understand Styling
1. **`gallery-after-tailwind.html`** - Glassmorphism examples
2. **`CONVERSION_SUMMARY.md`** - Tailwind CSS patterns
3. **`settings-tag-new.html`** - Form styling
4. Look for these patterns:
   - `bg-*/90 dark:bg-slate-*/90 backdrop-blur-2xl` (glassmorphism)
   - `rounded-2xl shadow-lg hover:shadow-xl` (cards)
   - `columns-1 sm:columns-2 md:columns-3 lg:columns-4` (masonry)

### To Understand Components
1. **Filter chips** → Search for `removeChip()` in gallery-after-tailwind.html
2. **Dropdowns** → Search for `toggleTagDropdown()` in search-tailwind.html or image-edit.html
3. **Toggle switch** → Search for `searchToggle` in search-tailwind.html
4. **Color picker** → Search for `colorPicker` in settings-tag-new.html
5. **Character counter** → Search for `charCount` in image-edit.html
6. **Slide dialog** → See custom CSS animations in filter-sidebar.html

---

## Keyboard Shortcuts

**All Pages:**
- Press `D` - Toggle dark mode

**Lightbox (lightbox-demo.html):**
- `Escape` - Close lightbox
- `Left Arrow` - Previous image
- `Right Arrow` - Next image

---

## Navigation Quick Links

**From any page:**
- Logo → `gallery-after-tailwind.html` (home)
- "All memes" nav → `gallery-after-tailwind.html`
- "Search memes" nav → `search-tailwind.html`
- "Settings" nav → `settings-tags-index.html`

**Settings:**
- "Tags" tab → `settings-tags-index.html`
- "Paths" tab → `settings-paths-index.html`

**From Gallery:**
- Click meme card → `image-show.html`

**From Image Show:**
- "Edit details" → `image-edit.html`
- "Back to memes" → `gallery-after-tailwind.html`

**From Image Edit:**
- "Save" → `image-show.html`
- "Back" → `image-show.html`
- "Back to memes" → `gallery-after-tailwind.html`

**From Settings Tags:**
- "Create new" → `settings-tag-new.html`
- "Adjust/delete" → `settings-tag-show.html`

**From Settings Tag Detail:**
- "Edit this tag" → `settings-tag-edit.html`
- "Back to tags" → `settings-tags-index.html`

---

## Component Patterns (Copy-Paste Ready)

### Glassmorphic Card
```html
<div class="bg-slate-200/90 dark:bg-slate-700/90 backdrop-blur-lg 
  hover:bg-white/95 hover:backdrop-blur-xl dark:hover:bg-slate-700/95 
  transition-all duration-300 rounded-2xl p-4 shadow-lg hover:shadow-2xl">
```

### Gradient Button
```html
<button class="px-6 py-3 text-white font-semibold 
  bg-gradient-to-r from-emerald-400 to-emerald-600 
  rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
```

### Multi-Select Dropdown
```html
<!-- Button -->
<button onclick="toggleTagDropdown()" class="w-full px-6 py-4 ...">
  <span id="selectedTags">Choose tags</span>
  <svg>...</svg>
</button>

<!-- Dropdown -->
<div id="tagDropdown" class="hidden absolute ...">
  <label>
    <input type="checkbox" onchange="updateSelectedTags()">
    <span>Option</span>
  </label>
</div>
```

### Filter Chip
```html
<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
  style="background-color: rgba(255, 107, 107, 0.2); color: #FF6B6B;">
  Tag: funny
  <button onclick="removeChip(this)">
    <svg><!-- X icon --></svg>
  </button>
</span>
```

### Form Input
```html
<input type="text" placeholder="..."
  class="px-6 py-4 text-black dark:text-white 
  bg-white/90 dark:bg-slate-700/90 backdrop-blur-lg 
  border-2 border-indigo-600 dark:border-indigo-400 
  rounded-2xl shadow-lg focus:outline-none focus:ring-4 
  focus:ring-indigo-500/50 transition-all" />
```

### Dialog/Modal
```html
<dialog id="filterModal" class="bg-white/90 dark:bg-slate-800/90 
  backdrop-blur-2xl border border-white/20 dark:border-white/10 
  rounded-2xl p-8 shadow-2xl max-w-md backdrop:bg-black/60">
  <!-- Content -->
</dialog>
```

---

## Design System

### Colors
- **Red:** #FF6B6B (funny)
- **Teal:** #4ECDC4 (programming)
- **Mint:** #95E1D3 (debugging)
- **Pink:** #F38181 (relatable)
- **Yellow:** #FFE66D (other)

### Spacing
- Small: `px-3 py-2` (6px/8px)
- Medium: `px-4 py-3` (16px/12px)
- Large: `px-6 py-4` (24px/16px)

### Border Radius
- Subtle: `rounded-lg` (8px)
- Medium: `rounded-2xl` (16px)
- Round: `rounded-full` (50%)

### Shadows
- Light: `shadow-lg`
- Heavy: `shadow-2xl`
- Hover: `hover:shadow-xl`

### Responsive
- Mobile: `<640px` (1 column)
- Tablet: `640-768px` (2 columns with `sm:`)
- Desktop: `>768px` (3-4 columns with `md:`/`lg:`)

---

## JavaScript Functions (By File)

### gallery-after-tailwind.html
- `toggleView()` - Cycle list/grid/masonry
- `removeChip(button)` - Remove filter chip
- `clearAll()` - Hide all filters
- `openFilterModal()` - Show filter dialog
- `closeFilterModal()` - Hide filter dialog

### search-tailwind.html
- `toggleTagDropdown()` - Open/close tag dropdown
- `updateSelectedTags()` - Update display from checkboxes
- `updateToggleText()` - Update keyword/vector text
- `performSearch(event)` - Execute search
- `toggleView()` - Switch list/grid

### image-edit.html
- `toggleTagDropdown()` - Open/close tag dropdown
- `updateSelectedTags()` - Update display from checkboxes
- `handleSubmit(event)` - Save form
- Character counter (automatic with event listener)

### filter-sidebar.html
- `openFilters()` - Show sidebar dialog
- `closeFilters()` - Hide sidebar with animation
- `applyFilters(event)` - Apply selected filters
- `toggleView()` - Switch gallery view mode
- `toggleTagFilter()` - Open/close tag dropdown
- `togglePathFilter()` - Open/close path dropdown
- `updateTagFilterSelection()` - Update tag display
- `updatePathFilterSelection()` - Update path display

### All Pages
- Dark mode toggle on keydown 'D'

---

## Testing Checklist (Short Version)

- [ ] Open in browser (Chrome, Firefox, Safari, Edge)
- [ ] Click all navigation links (should not be broken)
- [ ] Toggle dark mode with 'D' key
- [ ] On gallery: click view toggle button (list → grid → masonry)
- [ ] On search: type in search box (debounces in 300ms)
- [ ] On search: toggle keyword/vector switch
- [ ] On search: click tag dropdown, select tags
- [ ] On image edit: type in description, count should update
- [ ] On image edit: click color picker, select new color
- [ ] On settings: click "Create new" button for tags and paths
- [ ] Resize browser window (should be responsive)
- [ ] Check mobile (< 640px), tablet (640-768px), desktop (>768px)

---

## Rails Integration Checklist

When converting to Rails:

1. **Partials to Create:**
   - `_navbar.html.erb` (navigation bar)
   - `_filter_modal.html.erb` (filter dialog)
   - `_image_card.html.erb` (list view card)
   - `_tag_form.html.erb` (tag new/edit form)
   - `_path_form.html.erb` (path new/edit form)
   - `_gallery_view_toggle.html.erb` (view switcher buttons)

2. **Stimulus Controllers to Create:**
   - `GalleryController` (view toggling, filters)
   - `SearchController` (search form, debouncing)
   - `FilterModalController` (modal open/close)
   - `TagFormController` (color picker, dropdowns)
   - `PathFormController` (validation)
   - `ImageEditController` (character count)

3. **Data to Wire:**
   - Replace static `@image_cores` with controller instance variable
   - Replace static `@tags` with controller instance variable
   - Replace static `@paths` with controller instance variable
   - Wire form submissions to controller actions
   - Add CSRF tokens to forms
   - Use Rails link helpers instead of hardcoded hrefs

4. **Tailwind Config:**
   - Copy all color definitions to `tailwind.config.js`
   - Configure dark mode toggle persistence
   - Add custom utilities if needed

---

## File Sizes Ranked (Largest to Smallest)

```
1. settings-tailwind.html     27 KB (legacy, can delete)
2. comparison.html            23 KB
3. gallery-after-tailwind.html 19 KB ⭐
4. search-tailwind.html       17 KB
5. filter-sidebar.html        17 KB
6. lightbox-demo.html         15 KB
7. image-edit.html            12 KB
8. gallery-before.html        9.5 KB
9. settings-tag-new.html      8.9 KB
10. settings-tag-edit.html    8.9 KB
11. index.html                7.6 KB
12. settings-tags-index.html  7.4 KB
13. settings-paths-index.html 5.9 KB
14. settings-path-new.html    6.1 KB
15. settings-path-edit.html   6.6 KB
16. image-show.html           6.4 KB
17. settings-path-show.html   4.4 KB
18. settings-tag-show.html    4.3 KB
```

---

## Common Search Terms in Files

| Need | Search in File | Search Term |
|------|---|---|
| View toggle logic | gallery-after-tailwind.html | `toggleView()` |
| Filter removal | gallery-after-tailwind.html | `removeChip()` |
| Dropdown logic | search-tailwind.html | `toggleTagDropdown()` |
| Search logic | search-tailwind.html | `performSearch()` |
| Color picker | settings-tag-new.html | `colorPicker` |
| Character count | image-edit.html | `charCount` |
| Dark mode | Any file | `document.documentElement.classList.toggle('dark')` |
| Animations | filter-sidebar.html | `@keyframes slide-` |

---

## Pro Tips

1. **Want to reuse a component?**
   - Copy the HTML from the relevant mockup
   - Update IDs and class names as needed
   - Keep the Tailwind utility classes as-is

2. **Want to understand navigation?**
   - Read `NAVIGATION_MAP.md` first
   - Then trace through the files manually

3. **Want to convert to Rails?**
   - Use `CONVERSION_SUMMARY.md` as a template
   - Extract Tailwind patterns first
   - Create ERB partials with the exact same markup

4. **Want better performance?**
   - Replace picsum.photos URLs with local image paths
   - Minify HTML in production
   - Cache Tailwind CSS locally

5. **Want to debug styling?**
   - The mockups use pure Tailwind (no custom CSS in gallery-after-tailwind.html)
   - Open browser DevTools and inspect classes
   - All classes are from Tailwind CDN

---

## Version Info

- **Mockup Suite Version:** 1.0
- **Last Updated:** November 1, 2024
- **Tailwind Version:** CDN (latest)
- **Browser Support:** Chrome 76+, Firefox 103+, Safari 9+, Edge 79+
- **Responsive Breakpoints:** 4 (base, sm, md, lg)
- **Dark Mode:** Manual toggle with 'D' key

---

## Support Files

- **`MOCKUP_SUITE_OVERVIEW.md`** - Detailed documentation (this file's parent)
- **`NAVIGATION_MAP.md`** - Navigation structure and links
- **`CONVERSION_SUMMARY.md`** - Tailwind CSS conversion guide
- **`README.md`** - How to view and interact with mockups

---

**Start here:** Open `index.html` in your browser
**Quick preview:** Open `gallery-after-tailwind.html`
**Understand navigation:** Read `NAVIGATION_MAP.md`
**Learn CSS patterns:** Check `CONVERSION_SUMMARY.md`

