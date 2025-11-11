# Key Findings Summary: Rails UI/UX Exploration

## Quick Reference

### Current Single-Image Flow

**Button Location**: Appears on every image card in gallery and detail view  
**Pattern**: Form submission with POST request  
**Status Badge**: Color-coded based on 6-state enum (not_started → in_queue → processing → done/removing/failed)  
**Real-Time Updates**: ActionCable WebSocket broadcasts to all connected clients  

```
User clicks "generate description 🪄" button
  ↓
Form POSTs to generate_description_image_core_path
  ↓
Controller changes status to "in_queue" and calls Python /add_job
  ↓
Python service processes image
  ↓
Python calls Rails webhook /status_receiver and /description_receiver
  ↓
Rails broadcasts via ActionCable to update status badge + description in real-time
```

### Gallery/Index View

**Three View Modes** (with persistent preference via sessionStorage):
- List: Flexbox rows (default)
- Grid: 1-4 columns (responsive)
- Masonry: Pinterest-style columns

**Per-Image Display**:
- 450px image (list), 300px (grid/masonry)
- Status badge with action button
- Description text
- Tags with custom colors
- Click to view detail page

**View Switcher**: Top-right button cycles through modes + changes color (cyan → purple → fuchsia)

### Filtering System

**Architecture**: Slideover dialog panel from left
**Trigger**: "Filters" button in top bar

**Three Filter Types**:
1. **Tags**: Multi-select dropdown (checkboxes) - reusable Stimulus controller
2. **Paths**: Multi-select dropdown (same pattern as tags)
3. **Has Embeddings**: Simple toggle checkbox

**Active Filters Display**: Removable chips below filter bar
- Each chip shows filter value (e.g., "Tag: programming")
- X button removes individual filter
- "Clear all" link for reset

### Real-Time Feedback

**Implemented**:
- Status badges change color/text live via WebSocket
- Description textarea updates when generated
- All users see updates simultaneously (broadcast)
- No page refresh needed

**Missing for Bulk Operations**:
- Overall progress bar
- Queued/completed counts
- Time estimates
- Cancel-all button

### Settings Pages

**Three Settings Sections**:
1. **Tag Names** - Create/edit/delete tags with colors
2. **Image Paths** - Manage source directories with "Rescan" button
3. **Image to Text Models** - Select AI model for generation

**Key Pattern**: "Rescan" button in Image Paths settings
- POST action with confirmation
- Returns success message with counts: "Added 5 images, removed 2 orphaned records"
- This is a good precedent for bulk operations

### JavaScript Patterns

**Stimulus Controllers**:
- `view_switcher_controller`: List/grid/masonry toggle
- `multi_select_controller`: Tag/path filter dropdowns
- `toggle_controller`: Generic toggle (e.g., filter panel)
- `debounce_controller`: Search input debouncing

**ActionCable Channels**:
- `ImageStatusChannel`: Broadcasts status badge updates
- `ImageDescriptionChannel`: Broadcasts description text updates

**Key Finding**: No multi-select checkboxes in gallery currently
- Would need to add if implementing gallery-based bulk selection
- Filter panel already has checkbox pattern (can reuse)

---

## Where "Generate All Descriptions" Fits

### RECOMMENDED: Settings Page Approach

**Why**:
- Batch operations are admin tasks (belong in settings)
- "Rescan" button precedent already exists in Image Paths settings
- Isolated from main gallery flow
- Users expect to find bulk operations in configuration area

**Implementation Sketch**:

```
New Route: POST /settings/bulk_operations or POST /image_cores/bulk_generate_descriptions
New Controller Action: BulkGenerateDescriptionsController or image_cores_controller#bulk_generate_descriptions
New Settings View: /app/views/settings/bulk_operations/index.html.erb

UI Elements:
1. Filter section (reuse existing _filters.html.erb partials)
2. Generate button (emerald gradient)
3. Progress bar with real-time updates
4. Status text: "Processing 5 of 15 images"
5. Success message when complete

ActionCable Channel:
- BulkOperationChannel broadcasts {completed: N, total: M, current_image_id: X}
```

### ALTERNATIVE: Filter Panel Button

**Quick approach**: Add button in filter panel footer
```erb
<button data-action="click->bulk#generateFiltered">
  Generate Descriptions for Filtered Images
</button>
```
- Users have already filtered what they want
- One-click action on filtered results
- Minimal UI changes

---

## Design Patterns to Follow

### Button Styling
```
Primary: bg-gradient-to-r from-indigo-500 to-purple-600 + shadow-lg + hover:scale-105
Danger: bg-red-500 + hover:bg-red-400
Secondary: bg-gray-200/80 dark:bg-slate-700/80
```

### Card Pattern
```
bg-white/90 dark:bg-slate-800/90 + backdrop-blur-xl + border border-white/20 + 
rounded-2xl + p-6 + shadow-lg hover:shadow-2xl
```

### Status Badge Pattern
```
px-2 py-1 + rounded-2xl + text-sm + colored background + centered text
```

### Form Submission Pattern
```ruby
form_with(url: action_path, local: true) do |form|
  form.submit "Button Text", class: "button-classes"
end
```

### ActionCable Broadcast Pattern
```ruby
# Controller
ActionCable.server.broadcast "channel_name", { 
  div_id: "target-div", 
  html_content: rendered_html 
}

# JavaScript
received(data) {
  const element = document.getElementById(data.div_id);
  if (element) {
    element.innerHTML = data.html_content;
  }
}
```

---

## File Locations Reference

### Views
- Gallery: `/app/views/image_cores/index.html.erb`
- Image card: `/app/views/image_cores/_image_core.html.erb`
- Image detail: `/app/views/image_cores/_image_core_detail.html.erb`
- Status badge: `/app/views/image_cores/_generate_status.html.erb`
- Filters panel: `/app/views/image_cores/_filters.html.erb`
- Filter chips: `/app/views/image_cores/_filter_chips.html.erb`
- Settings Image Paths: `/app/views/settings/image_paths/index.html.erb`

### Controllers
- Main: `/app/controllers/image_cores_controller.rb`
- Settings: `/app/controllers/settings/image_paths_controller.rb`

### JavaScript
- View switcher: `/app/javascript/controllers/view_switcher_controller.js`
- Status channel: `/app/javascript/channels/image_status_channel.js`
- Description channel: `/app/javascript/channels/image_description_channel.js`

### Models
- ImageCore: `/app/models/image_core.rb` (has status enum)

### Routes
- `/config/routes.rb` (has generate_description, generate_stopper routes)

---

## Implementation Checklist

For a Settings-based bulk generation feature:

- [ ] Create new settings namespace controller (or add to image_cores_controller)
- [ ] Create route: `post "bulk_generate_descriptions"` in image_cores collection
- [ ] Create view: `/app/views/settings/bulk_operations/index.html.erb` (or settings page)
- [ ] Create Stimulus controller for progress tracking
- [ ] Create ActionCable channel: `BulkOperationChannel`
- [ ] Reuse filter components from gallery (_tag_toggle, _path_toggle, _filters)
- [ ] Add progress bar HTML element
- [ ] Add bulk action button with confirmation dialog
- [ ] Implement controller logic to iterate images and queue jobs
- [ ] Add broadcast calls in controller with progress updates
- [ ] Add JavaScript receiver to update progress bar in real-time
- [ ] Test with multiple images in queue
- [ ] Test filtering options (tags, paths, embeddings)
- [ ] Test cancel functionality (if needed)

