# Auto-Scan Feature - HTML Mockups

This directory contains interactive HTML mockups for the auto-scan feature UI/UX design.

## 📁 Files

### 1. `01-path-form-frequency-dropdown.html`
**Purpose**: Mockup of the ImagePath form with the new auto-scan frequency dropdown field

**Features**:
- Frequency dropdown with options: Manual only (default), Every 30 minutes, Every hour, Every 6 hours, Daily
- Help text explaining the opt-in auto-scan feature
- Highlighted with emerald border to show it's a new feature
- Follows existing form input patterns (glassmorphic design, rounded corners, focus states)

**View**: Open in browser to see both light and dark modes (toggle button at bottom)

---

### 2. `02-path-card-all-states.html`
**Purpose**: Comprehensive mockup showing all possible auto-scan status states for path cards

**States Displayed**:
1. **Manual Only** - Auto-scan disabled (default state)
2. **Auto-scan Enabled (Idle, Up to date)** - Green indicator, shows next scan time
3. **Auto-scan Enabled (Due now)** - Amber indicator with "Due for scan now" badge
4. **Currently Scanning** - Blue indicator with spinning icon, Rescan button disabled
5. **Failed Scan** - Red indicator with error message, shows "Retry Now" button
6. **Never Scanned** - Purple indicator for newly created paths with auto-scan enabled

**Visual Indicators**:
- Color-coded backgrounds (emerald=active, amber=due, blue=scanning, red=failed, purple=pending)
- Appropriate icons for each state
- Dynamic button states (disabled when scanning)
- Clear error messaging for failed scans

---

### 3. `03-paths-index-overview.html`
**Purpose**: Full page mockup showing the Paths Index page with multiple paths in different states

**Features**:
- Complete page layout with navigation bar
- Info box explaining auto-scan feature
- Grid layout showing 6 paths with different states simultaneously
- Compact card design optimized for grid view
- Responsive layout (1 column mobile, 2 columns tablet, 3 columns desktop)
- Action buttons (Rescan/Edit) on each card

**Use Case**: Demonstrates how users will see their paths at a glance with mixed auto-scan states

---

### 4. `04-path-edit-form.html`
**Purpose**: Mockup of the ImagePath edit form with auto-scan frequency adjustment

**Features**:
- Editable frequency dropdown (pre-populated with current value)
- Current scan status display showing:
  - Status (Idle, Scanning, Failed, etc.)
  - Last scan time
  - Next scan time
- Help text for changing frequency settings
- Tip box explaining how to disable auto-scan
- Common scenario examples at bottom:
  - Increase scan frequency
  - Reduce scan frequency
  - Disable auto-scan
  - Enable auto-scan

**Use Case**: Shows how users can modify auto-scan settings for existing paths

---

## 🎨 Design System

All mockups follow the existing Meme Search design system:

### Colors
- **Primary Gradient**: Emerald (400→600) for CTAs and active auto-scan
- **Accent**: Fuchsia (500/600) for edit buttons and navigation
- **Status Colors**:
  - Green/Emerald: Active, up to date
  - Amber: Due for scan
  - Blue: Scanning in progress
  - Red: Failed scan
  - Purple: First scan pending
  - Gray: Manual only

### Typography
- **Font**: Inter var (system fallback)
- **Headings**: Gradient text (indigo→purple)
- **Code**: Monospace with gray background

### Components
- **Glassmorphism**: `backdrop-blur` with semi-transparent backgrounds
- **Rounded Corners**: `rounded-2xl` (buttons), `rounded-3xl` (cards)
- **Shadows**: `shadow-lg` with `hover:shadow-xl`
- **Dark Mode**: Full support with `dark:` variants

### Buttons
- **Primary**: Emerald gradient with hover scale
- **Secondary**: White/slate with border
- **Edit**: Fuchsia solid background
- **Delete/Retry**: Red solid background
- **Disabled**: Gray with reduced opacity

---

## 🌓 Dark Mode

All mockups include:
- Full dark mode support
- Toggle button at bottom of page for testing
- Automatic color adjustments for text, backgrounds, and borders
- Consistent contrast ratios in both modes

---

## 📱 Responsive Design

Mockups use Tailwind's responsive breakpoints:
- **Mobile**: Single column layout
- **Tablet** (`md:`): 2 columns
- **Desktop** (`lg:`): 3 columns

---

## 🚀 How to Use

1. Open any HTML file in a modern web browser
2. Click "Toggle Dark Mode" button to test both themes
3. Observe animations (spinning icon on "Scanning" state)
4. Use browser dev tools to test responsive layouts
5. Reference these mockups during implementation

---

## 📋 Implementation Checklist

When implementing these designs:

- [ ] Use exact Tailwind classes from mockups
- [ ] Implement auto-scan frequency dropdown in form
- [ ] Add all 6 status states with appropriate colors/icons
- [ ] Ensure dark mode works correctly
- [ ] Add spinning animation for "Scanning" state
- [ ] Disable "Rescan" button when currently scanning
- [ ] Show error messages in failed state
- [ ] Update button text from "Rescan Now" to "Retry Now" for failed scans
- [ ] Test responsive grid layout
- [ ] Add help text explaining opt-in auto-scan

---

## 🔗 Related Files

- **Design Plan**: `plans/auto-scan-feature-design.md`
- **Implementation**: Will be in `meme_search/meme_search_app/app/views/settings/image_paths/`

---

## 📝 Notes

- All mockups use CDN-loaded Tailwind CSS for portability
- Icons are inline SVGs (Heroicons style)
- No JavaScript functionality (static mockups only)
- Colors match existing app's design system
- Glassmorphic backgrounds use `backdrop-blur-xl`

---

Created: 2025-11-11
Last Updated: 2025-11-11
