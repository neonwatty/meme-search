# Bulk Description Generation - UX Mockups

This directory contains interactive HTML mockups for the bulk description generation feature. All mockups use Tailwind CSS and match the existing Meme Search design system (glassmorphism, dark mode support, gradient buttons).

## Mockup Files

### 1. Filter Panel with Bulk Button (`01-filter-panel-with-bulk-button.html`)

**Purpose**: Shows the primary entry point for bulk generation - button integrated into filter panel.

**Key States Demonstrated**:
- ✅ Normal state with count (23 images without descriptions)
- ✅ Empty state (0 images match criteria)
- ✅ Operation in progress (filters locked with warning)
- ✅ Large batch warning (100+ images)

**Design Decisions**:
- Button placed at bottom of filter panel (before "Apply Filters")
- Collapsible help text explains feature without cluttering UI
- Model name displayed so user knows what will be used
- Count calculated on FULL result set (not just paginated view)

**Open in Browser**: `open 01-filter-panel-with-bulk-button.html`

---

### 2. Progress Overlay (`02-progress-overlay.html`)

**Purpose**: Real-time progress tracking overlay that floats in bottom-right corner.

**Key States Demonstrated**:
- ✅ Initial progress (8/23 - 35%)
- ✅ Near completion (20/23 - 87%)
- ✅ Completed successfully (23/23 - 100%)
- ✅ Completed with errors (21/23 - 91%, retry button)
- ✅ Connection error (network disconnection warning)
- ✅ Minimized badge (compact circular progress)

**Technical Features**:
- Polls backend every 2-10 seconds (exponential backoff)
- Listens to ActionCable for instant updates
- LocalStorage persistence (survives page reloads)
- Time estimates based on 1 second per image
- Auto-dismiss after 5 seconds if 100% success
- Stays visible if errors occurred

**Open in Browser**: `open 02-progress-overlay.html`

---

### 3. Gallery with Status Updates (`03-gallery-with-status-updates.html`)

**Purpose**: Shows how individual image cards update in real-time during bulk operation.

**Key States Demonstrated**:
- ✅ Not started (blue "generate description 🪄" button)
- ✅ In queue (amber badge + cancel button)
- ✅ Processing (emerald badge with shimmer effect)
- ✅ Done (just completed, green ring + success indicator)
- ✅ Done (stable state, description visible)
- ✅ Failed (red ring + error message + retry button)
- ✅ Removing (cancellation in progress, faded)

**ActionCable Integration**:
- Status updates: `image_status_channel` → updates status badge
- Description updates: `image_description_channel` → inserts description text
- No code changes needed - reuses existing channels!

**Open in Browser**: `open 03-gallery-with-status-updates.html`

---

### 4. Complete User Flow (`04-complete-user-flow.html`)

**Purpose**: Step-by-step walkthrough of entire bulk generation process.

**Flow Steps**:
1. **Apply Filters** - User selects tags, paths, has_embeddings=false
2. **Click Button** - Bulk generate button at bottom of filter panel
3. **Confirm** - Native browser confirm() dialog with model & time estimate
4. **Backend Processing** - Rails validates, queues jobs, locks filters
5. **Progress Overlay** - Slides in from bottom-right, starts polling
6. **Real-time Updates** - ActionCable broadcasts update individual cards
7. **Completion** - Success message or error summary with retry option

**Timeline**: Total ~30 seconds for 23 images with Florence-2-base model

**Open in Browser**: `open 04-complete-user-flow.html`

---

## Design System Reference

All mockups follow the existing Meme Search design patterns:

### Colors
- **Primary Actions**: `from-emerald-500 to-teal-600` (gradient)
- **Filters**: `from-indigo-500 to-purple-600` (gradient)
- **Success**: `emerald-500/600` (green)
- **Warning**: `amber-500/600` (yellow/orange)
- **Error**: `red-500/600` (red)
- **Processing**: `blue-500/600` (blue)

### Glassmorphism
- Background: `bg-white/90 dark:bg-slate-800/90`
- Backdrop: `backdrop-blur-lg` (or `xl`, `2xl`)
- Border: `border-white/20 dark:border-white/10`

### Button Styles
- Padding: `px-6 py-3`
- Border radius: `rounded-2xl`
- Shadow: `shadow-lg hover:shadow-xl`
- Transform: `hover:scale-105` (primary buttons only)

### Status Badges
- **in_queue**: `bg-amber-500 text-white`
- **processing**: `bg-emerald-500 text-white`
- **done**: `bg-blue-500 text-white` (or invisible)
- **failed**: `bg-red-500 text-white`
- **removing**: `bg-red-500 text-white`

---

## Implementation Checklist

Use these mockups as reference when implementing:

### Phase 1: MVP (6-8 hours)
- [ ] Add routes (`bulk_generate_descriptions`, `bulk_operation_status`, `bulk_operation_cancel`)
- [ ] Implement filter logic with proper count calculation (BEFORE pagination)
- [ ] Fix `has_embeddings` filter bug
- [ ] Add Python service health check
- [ ] Implement bulk queueing with error handling
- [ ] Add session-based operation tracking
- [ ] Add bulk button to filter panel (use mockup 01)
- [ ] Add empty state handling
- [ ] Add filter locking during operation
- [ ] Test single-image flow still works

### Phase 2: Progress Overlay (6-8 hours)
- [ ] Create `bulk_progress_controller.js` (use mockup 02 as reference)
- [ ] Create `_bulk_progress.html.erb` partial
- [ ] Implement localStorage persistence
- [ ] Implement polling with exponential backoff
- [ ] Add minimize/cancel functionality
- [ ] Add ETA calculation
- [ ] Add connection error handling
- [ ] Add beforeunload warning
- [ ] Integrate with ActionCable broadcasts
- [ ] Add ARIA live regions for accessibility

### Phase 3: Polish (4-6 hours)
- [ ] Add rate limiting (1 operation per 5 minutes)
- [ ] Fix pagination interaction (count must be on full set)
- [ ] Add retry failed images button
- [ ] Add model name display in overlay
- [ ] Add help text/tooltip in filter panel
- [ ] Optimize ActionCable broadcasts (consider batching for 50+ images)
- [ ] Add keyboard shortcuts (Escape to close)
- [ ] Write Playwright E2E tests

### Testing Scenarios
- [ ] Happy path: 23 images, all succeed
- [ ] Empty state: 0 images match filters
- [ ] Cancel operation: mid-process cancellation
- [ ] Page reload: during operation (should restore progress overlay)
- [ ] Filter lock: try changing filters during operation
- [ ] Connection error: simulate network disconnection
- [ ] Partial failure: 2 images fail, 21 succeed
- [ ] Retry flow: retry 2 failed images

---

## Browser Compatibility

All mockups tested in:
- ✅ Chrome 120+ (recommended)
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

Dark mode toggle: Change `<html class="dark">` to `<html>` to see light mode.

---

## Notes for Developers

1. **Tailwind CDN**: Mockups use Tailwind CDN for simplicity. Production app uses Tailwind via asset pipeline.

2. **Animations**: CSS animations are inline in mockups. In production, move to separate stylesheet or use Tailwind arbitrary values.

3. **ActionCable**: Mockups show static examples. Real implementation will use live WebSocket connections.

4. **Polling Frequency**: Mockups don't implement actual polling. Production should use exponential backoff (start 2s, max 10s).

5. **LocalStorage**: Mockup 02 mentions localStorage but doesn't implement it. Production must persist state for page reload support.

6. **ARIA**: Mockups include basic ARIA attributes. Production should add comprehensive screen reader support.

7. **Error Messages**: Mockups show generic error messages. Production should provide specific error details from backend logs.

---

## Feedback & Iteration

These mockups are **living documents**. As you implement:

1. Open mockups in browser alongside your development server
2. Compare styling, spacing, colors, animations
3. Iterate on mockups if UX improvements discovered during implementation
4. Add new mockup files for edge cases not covered here

---

## Related Documentation

- **Design Analysis**: `/plans/temp/bulk-generation-ux-analysis.md`
- **Feature Design**: `/plans/bulk-description-generation-feature-design.md`
- **Design System Guide**: `/plans/temp/DESIGN_SYSTEM_GUIDE.md`
- **Quick Reference**: `/plans/temp/DESIGN_QUICK_REFERENCE.md`

---

**Created**: 2025-11-11
**Status**: Ready for Implementation
**Estimated Dev Time**: 16-22 hours (all 3 phases)
