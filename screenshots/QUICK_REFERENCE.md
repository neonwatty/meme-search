# Screenshot Capture Quick Reference

Fast reference for capturing screenshots according to SCREENSHOT_PLAN.md.

## Quick Setup

```bash
# 1. Navigate to Rails app
cd /Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app

# 2. Start development server
./bin/dev

# 3. Open browser to http://localhost:3000/settings/image_paths
```

## Test Data Setup (Rails Console)

```ruby
# Clear existing data
ImagePath.destroy_all

# Create paths for each state
ImagePath.create!(name: "memes", scan_frequency_minutes: nil)
ImagePath.create!(name: "comics", scan_frequency_minutes: 30, last_scanned_at: 15.minutes.ago)
ImagePath.create!(name: "gifs", scan_frequency_minutes: 60, last_scanned_at: 70.minutes.ago)
ImagePath.create!(name: "screenshots", scan_frequency_minutes: 360, scan_status: 1)
ImagePath.create!(name: "reactions", scan_frequency_minutes: 1440, scan_status: 2, last_scan_error: "Permission denied", last_scanned_at: 5.minutes.ago)
ImagePath.create!(name: "test", scan_frequency_minutes: 30, last_scanned_at: nil)
```

## Screenshot Checklist (23 Total)

### Section 1: User Problem (2 screenshots)
- [ ] 01-tracked-path-no-changes.png
- [ ] 02-manual-only-state.png

### Section 2: Manual Rescan (3 screenshots)
- [ ] 01-rescan-button-index.png
- [ ] 02-rescan-in-progress.png
- [ ] 03-rescan-complete-message.png

### Section 3: Create Path with Auto-Scan (4 screenshots)
- [ ] 01-new-path-form.png
- [ ] 02-frequency-dropdown-expanded.png
- [ ] 03-frequency-selected-30min.png
- [ ] 04-path-created-first-scan-pending.png

### Section 4: Auto-Scan States (6 screenshots)
- [ ] 01-manual-only.png
- [ ] 02-up-to-date.png
- [ ] 03-due-now.png
- [ ] 04-scanning.png
- [ ] 05-failed.png
- [ ] 06-first-scan-pending.png

### Section 5: Index Overview (3 screenshots)
- [ ] 01-mixed-states-light-mode.png
- [ ] 02-mixed-states-dark-mode.png
- [ ] 03-full-page-context.png

### Section 6: Edit Frequency (3 screenshots)
- [ ] 01-edit-form-current-settings.png
- [ ] 02-change-frequency-dropdown.png
- [ ] 03-updated-frequency-confirmation.png

### Section 7: Workflow Narrative (2 screenshots/diagrams)
- [ ] 01-problem-workflow-old.png
- [ ] 02-solution-manual-rescan.png
- [ ] 03-solution-auto-scan.png

## Mac Screenshot Shortcuts

- **Window capture**: `Cmd + Shift + 4`, then press `Spacebar`, click window
- **Selection capture**: `Cmd + Shift + 4`, drag to select area
- **Full screen**: `Cmd + Shift + 3`

Screenshots save to Desktop by default. Move to appropriate subdirectory.

## Browser DevTools Screenshots

```javascript
// Full page screenshot (Chrome DevTools Console)
// Cmd+Shift+P → "Capture full size screenshot"

// Or use command:
// Cmd+Shift+P → "Screenshot" → Select type
```

## State Manipulation Commands

```ruby
# In Rails console: bin/rails console

# Set scanning state
path = ImagePath.find_by(name: "screenshots")
path.update_column(:scan_status, 1)  # 0=idle, 1=scanning, 2=failed

# Set failed state with error
path = ImagePath.find_by(name: "reactions")
path.update_columns(scan_status: 2, last_scan_error: "Permission denied")

# Make path due for scan
path = ImagePath.find_by(name: "gifs")
path.update_column(:last_scanned_at, 2.hours.ago)

# Reset to idle
path = ImagePath.find_by(name: "comics")
path.update_column(:scan_status, 0)
```

## Capture Order (Recommended)

1. **Setup test data** (5 min)
2. **Section 4: All states** - Easiest, just navigate and capture (20 min)
3. **Section 5: Overview** - Use existing test data (15 min)
4. **Section 3: Create flow** - New path form workflow (10 min)
5. **Section 2: Manual rescan** - Click rescan button (15 min)
6. **Section 6: Edit** - Edit existing path (10 min)
7. **Section 1: Problem** - Context screenshots (5 min)
8. **Section 7: Diagrams** - Create in Excalidraw/draw.io (20 min)

## File Size Optimization

```bash
# If screenshots are too large (>1MB), optimize:
cd screenshots
find . -name "*.png" -exec pngquant --quality=65-80 --ext .png --force {} \;
```

## Alternative: Use Mockups

If app isn't ready, use mockups for Section 4:

```bash
cd /Users/neonwatty/Desktop/meme-search/plans/mockups

# Capture from these HTML files:
open 01-path-form-frequency-dropdown.html
open 02-path-card-all-states.html
open 03-paths-index-overview.html
open 04-path-edit-form.html
```

## Verify Completion

```bash
# Count screenshots
find screenshots -name "*.png" | wc -l
# Should be 23

# List all captures
tree screenshots -L 2
```

---

Created: 2025-11-11
