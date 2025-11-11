# Auto-Scan Feature Visual Walkthrough - Screenshot Plan

**Purpose**: Create a comprehensive visual narrative documenting the auto-scan feature implementation that addresses GitHub issue #116.

**Created**: 2025-11-11  
**Issue**: [#116 - Automatic Meme Load on New Addition](https://github.com/neonwatty/meme-search/issues/116)

---

## User Pain Point (Issue #116)

**Problem**: "When adding new memes to a custom folder which is already tracked, I need to remove the path and add it again, which deletes the generated descriptions."

**Solution Implemented**:
1. **Manual Rescan** - Existing "Rescan" button allows scanning without removing/re-adding paths
2. **Auto-Scan** - New opt-in feature for automatic scanning at user-configured intervals

---

## Screenshot Directory Structure

```
screenshots/
├── SCREENSHOT_PLAN.md (this file)
├── 01-user-problem/
│   ├── 01-tracked-path-no-changes.png
│   └── 02-manual-only-state.png
├── 02-manual-rescan/
│   ├── 01-rescan-button-index.png
│   ├── 02-rescan-in-progress.png
│   └── 03-rescan-complete-message.png
├── 03-create-path-with-autoscan/
│   ├── 01-new-path-form.png
│   ├── 02-frequency-dropdown-expanded.png
│   ├── 03-frequency-selected-30min.png
│   └── 04-path-created-first-scan-pending.png
├── 04-autoscan-states/
│   ├── 01-manual-only.png
│   ├── 02-up-to-date.png
│   ├── 03-due-now.png
│   ├── 04-scanning.png
│   ├── 05-failed.png
│   └── 06-first-scan-pending.png
├── 05-index-overview/
│   ├── 01-mixed-states-light-mode.png
│   ├── 02-mixed-states-dark-mode.png
│   └── 03-full-page-context.png
├── 06-edit-frequency/
│   ├── 01-edit-form-current-settings.png
│   ├── 02-change-frequency-dropdown.png
│   └── 03-updated-frequency-confirmation.png
└── 07-workflow-narrative/
    ├── 01-problem-workflow-old.png
    ├── 02-solution-manual-rescan.png
    └── 03-solution-auto-scan.png
```

---

## Detailed Screenshot Requirements

### Section 1: User Problem Context (01-user-problem/)

**Purpose**: Show the original user pain point - tracked paths with no easy way to detect new files.

#### 01-tracked-path-no-changes.png
- **State**: Paths index page with 1-2 existing paths
- **Configuration**: All paths set to "Manual only" (default)
- **Highlight**: No automatic detection of new files
- **Caption**: "Before: Tracked paths require manual intervention to detect new memes"

#### 02-manual-only-state.png
- **State**: Close-up of a path card showing "Manual only" status
- **Elements to show**:
  - Gray settings gear icon
  - "Auto-scan: Manual only" text
  - "Rescan Now" button present
- **Caption**: "Manual only mode - the default, conservative setting"

---

### Section 2: Manual Rescan Feature (02-manual-rescan/)

**Purpose**: Demonstrate the existing manual rescan feature that partially addresses the issue.

#### 01-rescan-button-index.png
- **State**: Paths index page showing multiple paths
- **Highlight**: Circle/arrow pointing to "Rescan Now" button
- **Note**: Show in light mode for clarity
- **Caption**: "Manual rescan button available on every path card"

#### 02-rescan-in-progress.png
- **State**: Path card during active scanning
- **Elements to show**:
  - Blue background with spinning refresh icon
  - "Scanning..." text
  - "Rescan Now" button disabled (grayed out)
  - Last scan timestamp
- **Mode**: Light mode
- **Caption**: "Scanning in progress - button disabled to prevent duplicate scans"

#### 03-rescan-complete-message.png
- **State**: After rescan completes, showing flash message
- **Elements to show**:
  - Success flash message: "Added 3 new images, removed 1 orphaned record"
  - Path card showing updated scan status
  - Path now in "idle" state
- **Caption**: "Rescan complete with detailed change summary"

---

### Section 3: Creating Path with Auto-Scan (03-create-path-with-autoscan/)

**Purpose**: Walk through creating a new path with auto-scan enabled from the start.

#### 01-new-path-form.png
- **URL**: `/settings/image_paths/new`
- **State**: Clean form, no selections made
- **Elements to show**:
  - "Directory Name" field (empty)
  - "Scan Frequency" dropdown (default: "Manual only")
  - Help text: "Auto-scan this folder for new/removed images? Default is 'Manual only'."
  - Blue info box with directory path instructions
- **Mode**: Light mode
- **Caption**: "New path form with auto-scan frequency dropdown"

#### 02-frequency-dropdown-expanded.png
- **State**: Dropdown menu expanded showing all options
- **Options visible**:
  - Manual only (selected by default)
  - Every 30 minutes
  - Every hour
  - Every 6 hours
  - Daily
- **Highlight**: Show cursor hovering over "Every 30 minutes"
- **Mode**: Light mode
- **Caption**: "Five frequency options - opt-in design with 'Manual only' as default"

#### 03-frequency-selected-30min.png
- **State**: Form filled out ready to submit
- **Fields**:
  - Directory Name: "comics"
  - Scan Frequency: "Every 30 minutes" selected
- **Mode**: Light mode
- **Caption**: "Path configured for automatic scanning every 30 minutes"

#### 04-path-created-first-scan-pending.png
- **State**: Immediately after path creation
- **Elements to show**:
  - Purple background path card
  - Lightning bolt icon
  - "Scans every 30 minutes" text
  - "First scan pending" badge
  - "Never scanned" timestamp
  - "Scan Now" button (not "Rescan")
- **Mode**: Light mode
- **Caption**: "Newly created path with auto-scan enabled - first scan pending"

---

### Section 4: Auto-Scan Status States (04-autoscan-states/)

**Purpose**: Document all 6 possible auto-scan states for the visual status system.

#### 01-manual-only.png
- **State**: Path with auto-scan disabled
- **Elements**:
  - Gray background
  - Settings gear icon
  - "Auto-scan: Manual only"
  - "Rescan Now" button
- **Mode**: Light mode
- **Caption**: "State 1: Manual only - auto-scan disabled (default)"

#### 02-up-to-date.png
- **State**: Path with auto-scan enabled, not yet due
- **Elements**:
  - Emerald/green background
  - Checkmark icon
  - "Scans every 30 minutes"
  - "Next scan in 15m"
  - "Last: 15 minutes ago"
  - "Rescan Now" button enabled
- **Mode**: Light mode
- **Caption**: "State 2: Up to date - auto-scan active, next scan scheduled"

#### 03-due-now.png
- **State**: Path overdue for automatic scan
- **Elements**:
  - Amber/yellow background
  - Clock icon
  - "Scans every 30 minutes"
  - "Due for scan now" badge
  - "Last: 45 minutes ago"
  - "Rescan Now" button enabled
- **Mode**: Light mode
- **Caption**: "State 3: Due now - scheduled scan will trigger soon"

#### 04-scanning.png
- **State**: Active scan in progress
- **Elements**:
  - Blue background
  - Spinning refresh icon (capture mid-animation)
  - "Scanning..."
  - "Last: 2 minutes ago"
  - "Rescan Now" button disabled
- **Mode**: Light mode
- **Caption**: "State 4: Scanning - concurrent scan protection active"

#### 05-failed.png
- **State**: Scan encountered an error
- **Elements**:
  - Red background
  - Error X icon
  - "Scan failed: Permission denied" (monospace font)
  - "Last attempted: 5 minutes ago"
  - "Retry Now" button (note: changed from "Rescan")
- **Mode**: Light mode
- **Caption**: "State 5: Failed - error displayed with retry option"

#### 06-first-scan-pending.png
- **State**: New path never scanned yet
- **Elements**:
  - Purple background
  - Lightning bolt icon
  - "Scans every 30 minutes"
  - "First scan pending" badge
  - "Never scanned"
  - "Scan Now" button
- **Mode**: Light mode
- **Caption**: "State 6: First scan pending - awaiting initial scan"

---

### Section 5: Index Page Overview (05-index-overview/)

**Purpose**: Show how multiple paths with different states appear in the main interface.

#### 01-mixed-states-light-mode.png
- **URL**: `/settings/image_paths`
- **State**: 4-6 paths displayed in grid layout
- **Path configurations**:
  1. Path "memes" - Manual only (gray)
  2. Path "comics" - Up to date, 30min frequency (green)
  3. Path "gifs" - Due now, 1hr frequency (amber)
  4. Path "screenshots" - Scanning (blue)
  5. Path "reactions" - Failed scan (red)
  6. Path "test" - First scan pending (purple)
- **Mode**: Light mode
- **Show**: Full page with header, grid layout, action buttons
- **Caption**: "Index page showing multiple paths with different auto-scan states"

#### 02-mixed-states-dark-mode.png
- **State**: Same as above
- **Mode**: Dark mode
- **Purpose**: Verify color scheme works in dark mode
- **Caption**: "Dark mode support - all status colors remain distinguishable"

#### 03-full-page-context.png
- **State**: Complete page view
- **Elements**:
  - Settings navigation tabs visible
  - Page header "Manage Directory Paths"
  - "Create new" button
  - Full grid of path cards
  - Pagination if applicable
- **Mode**: Light mode
- **Caption**: "Full page context showing auto-scan feature in production UI"

---

### Section 6: Editing Frequency (06-edit-frequency/)

**Purpose**: Demonstrate how users can change auto-scan settings for existing paths.

#### 01-edit-form-current-settings.png
- **URL**: `/settings/image_paths/{id}/edit`
- **State**: Edit form for an existing path
- **Path**: "comics" with current frequency "Every 30 minutes"
- **Elements to show**:
  - Directory Name field (read-only or disabled)
  - Scan Frequency dropdown (current value pre-selected)
  - Current status display:
    - Status: Idle
    - Last scan: "15 minutes ago"
    - Next scan: "in 15 minutes"
  - Help text and tip boxes
- **Mode**: Light mode
- **Caption**: "Edit form showing current auto-scan configuration"

#### 02-change-frequency-dropdown.png
- **State**: Dropdown expanded to change frequency
- **Current**: "Every 30 minutes"
- **Hover**: "Every 6 hours"
- **Mode**: Light mode
- **Caption**: "Changing scan frequency for existing path"

#### 03-updated-frequency-confirmation.png
- **State**: After saving frequency change
- **Elements**:
  - Flash message: "Directory path successfully updated!"
  - Path card now showing new frequency "Every 6 hours"
  - Updated "Next scan" time
- **Mode**: Light mode
- **Caption**: "Frequency updated - next scan rescheduled automatically"

---

### Section 7: Workflow Narrative (07-workflow-narrative/)

**Purpose**: Visual comparison showing the before/after workflow improvements.

#### 01-problem-workflow-old.png
- **Type**: Diagram or annotated screenshot
- **Content**: Show the old workflow:
  1. Tracked path exists
  2. User adds new memes to folder
  3. New memes NOT detected
  4. User must delete path (loses descriptions!)
  5. User re-adds path
  6. Descriptions regenerated from scratch
- **Annotations**: Red X marks showing pain points
- **Caption**: "Issue #116: Old workflow required deleting paths, losing descriptions"

#### 02-solution-manual-rescan.png
- **Type**: Diagram or annotated screenshot
- **Content**: Show manual rescan workflow:
  1. Tracked path exists
  2. User adds new memes to folder
  3. User clicks "Rescan Now" button
  4. New memes detected and added
  5. Existing descriptions preserved
- **Annotations**: Green checkmarks showing improvements
- **Caption**: "Solution 1: Manual rescan preserves descriptions"

#### 03-solution-auto-scan.png
- **Type**: Diagram or annotated screenshot
- **Content**: Show auto-scan workflow:
  1. Path configured with auto-scan (e.g., every 30 min)
  2. User adds new memes to folder
  3. Auto-scan job detects changes automatically
  4. New memes added without user intervention
  5. Existing descriptions preserved
- **Annotations**: Stars/highlights showing automation
- **Caption**: "Solution 2: Auto-scan enables hands-free meme detection"

---

## Screenshot Capture Workflow

### Prerequisites

1. Start Rails server in test mode
2. Populate test database with sample paths
3. Prepare test meme directories with images
4. Browser window at 1920x1080 resolution
5. Clear browser cache/cookies for clean state

### Environment Setup

```bash
# Terminal 1: Start Rails test server
cd /Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app
RAILS_ENV=test bin/rails server -p 3000

# Terminal 2: Setup test data
cd /Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app
bin/rails runner scripts/seed_test_paths.rb  # Create test paths with various states
```

### Test Data Configuration

Create paths with these configurations for screenshots:

```ruby
# scripts/seed_test_paths.rb
ImagePath.create!(name: "memes", scan_frequency_minutes: nil) # Manual only
ImagePath.create!(name: "comics", scan_frequency_minutes: 30, last_scanned_at: 15.minutes.ago) # Up to date
ImagePath.create!(name: "gifs", scan_frequency_minutes: 60, last_scanned_at: 70.minutes.ago) # Due now
ImagePath.create!(name: "screenshots", scan_frequency_minutes: 360, scan_status: :scanning) # Scanning
ImagePath.create!(name: "reactions", scan_frequency_minutes: 1440, scan_status: :failed, last_scan_error: "Permission denied") # Failed
ImagePath.create!(name: "test", scan_frequency_minutes: 30, last_scanned_at: nil) # First scan pending
```

### Capture Tools

- **Primary**: Browser screenshot (Cmd+Shift+4 on macOS, then spacebar to capture window)
- **Alternative**: Browser DevTools screenshot feature (full page capture)
- **Annotations**: Use Preview.app or similar for arrows/highlights

### Naming Convention

```
{section-number}-{descriptive-name}.png

Examples:
01-tracked-path-no-changes.png
02-frequency-dropdown-expanded.png
03-scanning.png
```

### Quality Standards

- **Resolution**: Minimum 1920x1080 for desktop screenshots
- **Format**: PNG (lossless)
- **Content**: Crop to relevant UI area (remove browser chrome unless needed for context)
- **Annotations**: Use red arrows/circles for highlighting, keep minimal
- **Text**: Ensure all text is readable at 100% zoom
- **Dark Mode**: Verify color contrast in both modes

---

## Screenshot Capture Sequence

### Phase 1: Foundation (Sections 1-2)
1. Capture existing manual-only states
2. Demonstrate manual rescan workflow
3. Show flash messages and feedback

**Time estimate**: 15 minutes

### Phase 2: Auto-Scan Creation (Section 3)
1. Navigate to new path form
2. Capture dropdown states
3. Create path and capture first scan pending state

**Time estimate**: 10 minutes

### Phase 3: Status States (Section 4)
1. Manipulate test data to show each state
2. Capture individual path cards
3. Ensure icon animations are visible (mid-spin for scanning)

**Time estimate**: 20 minutes

### Phase 4: Overview Pages (Section 5)
1. Set up mixed-state paths
2. Capture light mode full page
3. Toggle dark mode and capture
4. Capture full context view

**Time estimate**: 15 minutes

### Phase 5: Edit Workflow (Section 6)
1. Navigate to edit form
2. Capture frequency change process
3. Show confirmation message

**Time estimate**: 10 minutes

### Phase 6: Narrative Diagrams (Section 7)
1. Create workflow diagrams (can use Excalidraw, draw.io, or annotated screenshots)
2. Add annotations showing old vs new workflows

**Time estimate**: 20 minutes

**Total estimated time**: 90 minutes

---

## Usage in Documentation

### Pull Request Description

```markdown
## Visual Walkthrough

### Problem (Issue #116)
![Old workflow](screenshots/07-workflow-narrative/01-problem-workflow-old.png)

### Solution 1: Manual Rescan
![Manual rescan](screenshots/02-manual-rescan/03-rescan-complete-message.png)

### Solution 2: Auto-Scan Feature
![Auto-scan overview](screenshots/05-index-overview/01-mixed-states-light-mode.png)

### All Auto-Scan States
| Manual Only | Up to Date | Due Now |
|-------------|------------|---------|
| ![](screenshots/04-autoscan-states/01-manual-only.png) | ![](screenshots/04-autoscan-states/02-up-to-date.png) | ![](screenshots/04-autoscan-states/03-due-now.png) |

| Scanning | Failed | First Scan |
|----------|--------|------------|
| ![](screenshots/04-autoscan-states/04-scanning.png) | ![](screenshots/04-autoscan-states/05-failed.png) | ![](screenshots/04-autoscan-states/06-first-scan-pending.png) |

### Creating Auto-Scan Path
![Form with dropdown](screenshots/03-create-path-with-autoscan/02-frequency-dropdown-expanded.png)

### Dark Mode Support
![Dark mode](screenshots/05-index-overview/02-mixed-states-dark-mode.png)
```

### README.md or Wiki

Create a user guide section with annotated screenshots showing:
1. How to enable auto-scan
2. What each status means
3. How to troubleshoot failed scans

---

## Post-Capture Checklist

- [ ] All 23 screenshots captured
- [ ] All screenshots properly named per convention
- [ ] Screenshots are clear and readable
- [ ] Annotations added where helpful
- [ ] Dark mode screenshots included
- [ ] File sizes optimized (use `pngquant` if >1MB)
- [ ] Verified all paths work in PR description markdown
- [ ] Screenshots directory added to .gitignore
- [ ] Created README.md in screenshots/ with index

---

## Screenshot Index README

After capturing, create `/screenshots/README.md`:

```markdown
# Auto-Scan Feature Screenshots

Visual documentation for the auto-scan feature implementation (PR #XXX, Issue #116).

## Quick Links

- [User Problem](01-user-problem/)
- [Manual Rescan](02-manual-rescan/)
- [Create with Auto-Scan](03-create-path-with-autoscan/)
- [Status States](04-autoscan-states/)
- [Index Overview](05-index-overview/)
- [Edit Frequency](06-edit-frequency/)
- [Workflow Narrative](07-workflow-narrative/)

## Sections

[Table linking to each screenshot with thumbnail and description]

---

Captured: 2025-11-11
Feature: Auto-Scan for Image Paths
```

---

## Troubleshooting Capture Issues

### Issue: Can't reproduce "Scanning" state
**Solution**: Manually set `scan_status: :scanning` in Rails console:
```ruby
ImagePath.find_by(name: "screenshots").update_column(:scan_status, 1)
```

### Issue: Timestamps not showing correctly
**Solution**: Use Rails console to set `last_scanned_at`:
```ruby
path = ImagePath.find_by(name: "comics")
path.update_column(:last_scanned_at, 15.minutes.ago)
```

### Issue: "Due now" state not appearing
**Solution**: Set scan time in past:
```ruby
path = ImagePath.find_by(name: "gifs")
path.update_columns(
  scan_frequency_minutes: 60,
  last_scanned_at: 70.minutes.ago
)
```

### Issue: Flash messages disappear too quickly
**Solution**: Use browser DevTools to pause JavaScript or manually inject flash:
```javascript
// In browser console
document.querySelector('.flash-container').innerHTML = `
  <div class="flash-notice">Added 3 new images, removed 1 orphaned record.</div>
`;
```

---

## Alternative: Mockup-Based Screenshots

If capturing from running app is difficult, use the HTML mockups:

```bash
# Open mockups in browser
open /Users/neonwatty/Desktop/meme-search/plans/mockups/01-path-form-frequency-dropdown.html
open /Users/neonwatty/Desktop/meme-search/plans/mockups/02-path-card-all-states.html
open /Users/neonwatty/Desktop/meme-search/plans/mockups/03-paths-index-overview.html
open /Users/neonwatty/Desktop/meme-search/plans/mockups/04-path-edit-form.html
```

**Pros**: Clean, controlled, all states visible
**Cons**: Not from real app, may not match production exactly

**Recommendation**: Use mockups for status state documentation (Section 4), use real app for workflow screenshots (Sections 1-3, 5-7).

---

## Success Criteria

- [ ] Visual narrative clearly shows problem (Issue #116) and solutions
- [ ] All 6 auto-scan states documented with screenshots
- [ ] Both light and dark modes represented
- [ ] Screenshots are professional quality (clear, well-cropped, annotated)
- [ ] Workflow comparison makes benefits obvious
- [ ] Documentation is self-explanatory without reading code
- [ ] Screenshots can be used in PR, docs, and user guides

---

## Related Files

- **Feature Design**: `/plans/auto-scan-feature-design.md`
- **UI Mockups**: `/plans/mockups/*.html`
- **Implementation**: `/meme_search/meme_search_app/app/views/settings/image_paths/`
- **Issue**: https://github.com/neonwatty/meme-search/issues/116

---

## Notes

- Screenshots are for documentation only, not tracked in git
- Update this plan if new states or features are added
- Consider creating GIF animations for dynamic states (scanning, etc.)
- Screenshots should be updated if UI significantly changes

---

Created: 2025-11-11
Last Updated: 2025-11-11
