# Bulk Generation Feature - Simple Mockups (START HERE!)

**Created**: 2025-11-11  
**Purpose**: Clear, focused mockups showing exactly what's being added/modified

---

## 🎯 Quick Overview

This feature adds **bulk description generation** to the existing gallery page (`/image_cores`).

**What changes:**
1. ✏️ **Filter panel** - Add 1 new section (bulk generation button)
2. ➕ **Progress overlay** - New floating component (bottom-right corner)
3. ✅ **Everything else** - Unchanged (gallery, cards, top bar, etc.)

---

## 📄 Mockup Files (Open These!)

### **SIMPLE-01**: Filter Panel Before/After
**File**: `SIMPLE-01-filter-panel-before-after.html`

Shows side-by-side comparison of filter panel:
- **Left**: Current filter panel (no bulk button)
- **Right**: Modified filter panel (with bulk button)

**Key Changes**:
- Add "23 images without descriptions" count box
- Add "Generate All Descriptions (23)" button
- Add border divider above standard filter buttons
- **Total new code**: ~30 lines in `_filters.html.erb`

**Open**: `open SIMPLE-01-filter-panel-before-after.html`

---

### **SIMPLE-02**: Progress Overlay Placement
**File**: `SIMPLE-02-progress-overlay-placement.html`

Shows WHERE the progress overlay appears on the page.

**Key Info**:
- Position: Fixed bottom-right corner (`bottom-8 right-8`)
- Floats above all page content (z-index: 50)
- Does NOT modify existing page layout
- Appears after user confirms bulk generation
- **New file**: `_bulk_progress.html.erb` + Stimulus controller

**Open**: `open SIMPLE-02-progress-overlay-placement.html`

---

### **SIMPLE-03**: Complete Page Context
**File**: `SIMPLE-03-page-context-diagram.html`

Shows the BIG PICTURE:
- Current page structure (top bar, chips, gallery, pagination)
- Where modified component fits (filter panel)
- Where new component appears (progress overlay)
- User journey (8 steps from opening page to completion)
- File mapping (what to modify vs. what to create)

**Open**: `open SIMPLE-03-page-context-diagram.html`

---

## 🗺️ Which Page Are We Modifying?

**Page**: `/image_cores` (Gallery Index)

**Current Route**: Already exists
```ruby
# config/routes.rb
resources :image_cores  # index action renders index.html.erb
```

**Current Template**: `app/views/image_cores/index.html.erb`
```erb
<!-- Existing structure -->
<%= render "filters" %>        <!-- We modify THIS partial -->
<%= render "filter_chips" %>   <!-- Unchanged -->
<!-- Gallery grid -->            <!-- Unchanged -->
<!-- Pagination -->               <!-- Unchanged -->
```

---

## 📋 Implementation Checklist

### Phase 1: Add Bulk Button to Filter Panel

**File**: `app/views/image_cores/_filters.html.erb`

**Where**: Between "Has embeddings" checkbox and footer buttons

**Add**:
```erb
<!-- NEW SECTION: Bulk Generation -->
<div class="border-t border-gray-200/50 dark:border-gray-700/50 pt-4">
  <!-- Count display -->
  <div class="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 ...">
    <p>23 images without descriptions</p>
  </div>

  <!-- Bulk button -->
  <%= form_with(url: bulk_generate_descriptions_image_cores_path, ...) do %>
    <%= form.submit "Generate All Descriptions (23)", class: "..." %>
  <% end %>
</div>
```

**Lines of code**: ~30

---

### Phase 2: Add Progress Overlay

**New File**: `app/views/image_cores/_bulk_progress.html.erb`

**Render Where**: In layout or conditionally in index view

**Structure**:
```erb
<div data-controller="bulk-progress" class="fixed bottom-8 right-8 ...">
  <!-- Header with model name -->
  <!-- Progress bar -->
  <!-- Status counts -->
  <!-- Cancel button -->
</div>
```

**New File**: `app/javascript/controllers/bulk_progress_controller.js`

**Responsibilities**:
- Poll backend every 2-10s for status counts
- Update progress bar and percentage
- Handle minimize/cancel actions
- Save state to localStorage
- Auto-dismiss when complete

**Lines of code**: ~150 (controller) + ~80 (partial)

---

### Phase 3: Add Controller Actions

**File**: `app/controllers/image_cores_controller.rb`

**Add 3 actions**:
1. `bulk_generate_descriptions` - Queue all images
2. `bulk_operation_status` - Return counts (for polling)
3. `bulk_operation_cancel` - Cancel in_queue jobs

**Add routes**:
```ruby
# config/routes.rb
resources :image_cores do
  collection do
    post :bulk_generate_descriptions
    get :bulk_operation_status
    post :bulk_operation_cancel
  end
end
```

**Lines of code**: ~100 (controller) + ~10 (routes)

---

## 🎨 Design Tokens (Copy-Paste Ready)

### Bulk Button
```
Classes: w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition duration-200
```

### Count Display
```
Classes: bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-4
```

### Progress Overlay
```
Classes: fixed bottom-8 right-8 w-96 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 p-6 z-50
```

---

## ❓ Common Questions

**Q: Does this change the existing gallery?**  
A: No. Gallery grid, image cards, top bar, pagination all unchanged.

**Q: Does this break single-image generation?**  
A: No. Individual "generate description 🪄" buttons still work exactly the same.

**Q: Where does the bulk button appear?**  
A: In the filter panel (left sidebar), above "Apply Filters" button.

**Q: Can users still browse during bulk generation?**  
A: Yes. Progress overlay is fixed position and doesn't block anything.

**Q: What if user closes the browser?**  
A: Progress overlay saves state to localStorage. Restores on page reload.

**Q: What if bulk generation fails?**  
A: Progress overlay shows failed count + retry button. Individual cards show red "failed" badge.

---

## 🚀 Ready to Implement?

1. **Start with**: SIMPLE-03 (page context diagram)
2. **Then review**: SIMPLE-01 (filter panel changes)
3. **Finally check**: SIMPLE-02 (progress overlay placement)
4. **Begin coding**: Filter panel modifications (easiest first)

**Estimated time**: 6-8 hours for Phase 1+2 (MVP with progress overlay)

---

## 📚 Related Documentation

- **Design Analysis**: `/plans/temp/bulk-generation-ux-analysis.md` (comprehensive UX review)
- **Feature Design**: `/plans/bulk-description-generation-feature-design.md` (original design doc)
- **Current Page Structure**: `/plans/temp/CURRENT_GALLERY_STATE.md` (detailed breakdown)

---

**Questions?** All mockups have detailed notes at the bottom explaining implementation.
