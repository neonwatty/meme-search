# Frontend Architecture Diagrams & Visual Reference

## Current Architecture Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      Rails 8.0 Application                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              HTML.ERB Views (47 files)                   │   │
│  │  ├─ image_cores/ (main CRUD resources)                  │   │
│  │  ├─ settings/ (configuration pages)                     │   │
│  │  ├─ shared/ (nav, notifications)                        │   │
│  │  └─ layouts/ (master layout)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                                      │
│           │ Stimulus data attributes                            │
│           ↓                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │       Stimulus Controllers (142 LOC, 5 files)            │   │
│  │  ├─ view_switcher (50 LOC) - List/Grid toggle          │   │
│  │  ├─ multi_select (37 LOC) - Tag/Path dropdowns         │   │
│  │  ├─ debounce (15 LOC) - Search form debounce           │   │
│  │  ├─ toggle (16 LOC) - Radio button handling            │   │
│  │  └─ application (19 LOC) - Bootstrap & registration    │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                                      │
│           │ Import Map (ES Modules)                             │
│           ↓                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         External Libraries (CDN)                         │   │
│  │  ├─ @hotwired/stimulus                                  │   │
│  │  ├─ @hotwired/turbo-rails (Turbo Streams)              │   │
│  │  ├─ @rails/actioncable (WebSockets)                    │   │
│  │  ├─ tailwindcss-stimulus-components                    │   │
│  │  └─ trix / @rails/actiontext                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Real-time Communication (WebSockets)            │   │
│  │  ├─ ImageStatusChannel → Status updates                │   │
│  │  └─ ImageDescriptionChannel → Description updates      │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Action Cable Channels (Ruby)                │   │
│  │  ├─ ImageStatusChannel                                  │   │
│  │  └─ ImageDescriptionChannel                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                      Styling Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ├─ Tailwind CSS 3.0 (Utility-first)                           │
│  ├─ Custom Tailwind utilities (application.tailwind.css)       │
│  ├─ Component classes (buttons, forms)                         │
│  └─ Dark mode support (dark: prefix)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Search Feature (Most Complex AJAX Use Case)

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Types in Search Box                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │ input->debounce#search event fired │
        │ (onChange handler)                 │
        └────────────┬───────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────────┐
        │ Debounce Controller waits 300ms    │
        │ clearTimeout() + setTimeout()      │
        └────────────┬───────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────────┐
        │ formTarget.requestSubmit()         │
        │ POST /search_items                 │
        └────────────┬───────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────────────────┐
        │ Rails Controller: ImageCoresController     │
        │ search_items action                        │
        │ - Filters by tags/paths                    │
        │ - Returns results                          │
        └────────────┬───────────────────────────────┘
                     │
                     ↓ (respond_to do |format|)
        ┌────────────────────────────────────┐
        │ format.turbo_stream response       │
        │ turbo_stream.update(                │
        │   "search_results",                │
        │   partial: "search_results"        │
        │ )                                  │
        └────────────┬───────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────────┐
        │ Turbo Stream intercepted by JS     │
        │ DOM#search_results replaced with   │
        │ server-rendered partial            │
        └────────────┬───────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────────┐
        │ view-switcher controller activated │
        │ (on newly inserted DOM)            │
        │ List/grid toggle available         │
        └────────────────────────────────────┘
```

**Timeline:** Input → 300ms delay → Controller action → Partial render → Stream → DOM update → ~500ms total

---

## Data Flow: Real-time Status Updates (WebSocket)

```
┌──────────────────────────────────────┐
│  User clicks "Generate Description"  │
└────────────┬─────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────┐
│ Rails Controller: generate_description action│
│ - Create job in queue                        │
│ - Respond with HTML                          │
└────────────┬───────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────┐
│ Background Job Processing            │
│ (image_to_text_generator service)    │
│ - Processes image                    │
│ - Returns status/description         │
└────────────┬─────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────┐
│ Controller: status_receiver / description... │
│ - Receives webhook from background job      │
│ - Renders partial HTML locally              │
│ - Broadcasts via ActionCable                │
└────────────┬───────────────────────────────────┘
             │
             ↓ (ActionCable.server.broadcast)
┌──────────────────────────────────────┐
│ WebSocket Message to Browser         │
│ {                                    │
│   div_id: "status-image-core-...",  │
│   status_html: "..."                │
│ }                                    │
└────────────┬─────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────┐
│ ImageStatusChannel (JavaScript)                 │
│ received(data) {                                │
│   const statusDiv =                            │
│     document.getElementById(data.div_id)       │
│   statusDiv.innerHTML = data.status_html       │
│ }                                              │
└────────────┬───────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────┐
│ DOM Updated - User sees status       │
│ - Processing → Complete              │
│ - Description displayed              │
└──────────────────────────────────────┘
```

**Key Issue:** Server-rendered HTML mixed with client-side updates. React requires refactoring to send JSON instead.

---

## Component Integration Matrix

```
┌──────────────────────────────────────────────────────────────────────┐
│ STIMULUS CONTROLLER → VIEWS → FORM FIELDS                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  VIEW-SWITCHER                                                       │
│  └─ Session Storage (viewMode)                                      │
│     ├─ image_cores/index.html.erb                                   │
│     │  ├─ data-view-switcher-target="listView"                      │
│     │  ├─ data-view-switcher-target="gridView"                      │
│     │  └─ button→click→view-switcher#toggleView                     │
│     │                                                               │
│     └─ image_cores/_search_results.html.erb                         │
│        ├─ Same targets                                              │
│        └─ Same toggle button                                        │
│                                                                     │
│  MULTI-SELECT                                                       │
│  └─ Form hidden field (selected_tag_names)                          │
│     ├─ image_cores/_tag_toggle.html.erb                            │
│     │  ├─ data-multi-select-target="options"                        │
│     │  ├─ data-multi-select-target="selectedItems"                  │
│     │  └─ checkbox→change→multi-select#updateSelection             │
│     │                                                               │
│     ├─ image_cores/_path_toggle.html.erb                           │
│     │  └─ Same pattern for path selection                           │
│     │                                                               │
│     └─ image_cores/_edit.html.erb (in form)                        │
│        ├─ form.fields_for :image_tags                              │
│        ├─ checkbox→change→multi-select#updateSelection             │
│        └─ Form submission updates associations                      │
│                                                                     │
│  DEBOUNCE                                                           │
│  └─ Timer management                                                │
│     └─ image_cores/search.html.erb                                 │
│        ├─ form_with (data-controller="debounce")                   │
│        ├─ input→input→debounce#search                              │
│        └─ 300ms delay before form submit                           │
│                                                                     │
│  TOGGLE                                                             │
│  └─ Radio button state                                              │
│     └─ settings/image_to_texts/index.html.erb                      │
│        ├─ input[name="current_id"]                                 │
│        └─ radio→change→toggle#toggle                               │
│                                                                     │
│  APPLICATION                                                        │
│  └─ Registers pre-built components                                 │
│     ├─ Alert (notifications)                                       │
│     │  └─ shared/_notifications.html.erb                          │
│     ├─ Dropdown (navigation)                                       │
│     │  └─ shared/_nav.html.erb                                    │
│     ├─ Slideover (filters)                                         │
│     │  └─ image_cores/_filters.html.erb                           │
│     └─ ColorPreview (color picker)                                 │
│        └─ settings/tag_names/_form.html.erb                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## View File Dependencies & Imports

```
layouts/application.html.erb
│
├─ shared/_nav.html.erb
│  └─ data-controller="dropdown" (pre-built)
│
├─ shared/_notifications.html.erb
│  └─ data-controller="alert" (pre-built)
│
└─ yield → main content
   │
   ├─ image_cores/index.html.erb
   │  ├─ _filters.html.erb
   │  │  ├─ data-controller="slideover" (pre-built)
   │  │  ├─ data-controller="view-switcher" (custom)
   │  │  └─ _tag_toggle.html.erb → multi-select
   │  │     _path_toggle.html.erb → multi-select
   │  │
   │  ├─ data-controller="view-switcher"
   │  ├─ data-view-switcher-target="listView"
   │  └─ data-view-switcher-target="gridView"
   │
   ├─ image_cores/search.html.erb
   │  ├─ form with debounce controller
   │  ├─ _tag_toggle.html.erb (inside form)
   │  └─ #search_results div → Turbo target
   │
   ├─ image_cores/show.html.erb
   │  └─ Displays image details
   │
   ├─ image_cores/edit.html.erb
   │  └─ _edit.html.erb partial
   │     └─ _edit.html.erb
   │        ├─ form with multi-select
   │        ├─ _tag_toggle.html.erb inside form
   │        └─ Form submission updates associations
   │
   └─ settings/...
      ├─ tag_names/
      │  ├─ _form.html.erb
      │  │  └─ color-preview controller (pre-built)
      │  └─ Show/Edit views
      ├─ image_paths/
      │  └─ CRUD views
      └─ image_to_texts/
         └─ index.html.erb with toggle controller
```

---

## Migration Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Rails 8.0 + Vite                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         React Components (~15-20 files)                  │   │
│  │  ├─ layouts/                                            │   │
│  │  │  └─ Layout.tsx                                       │   │
│  │  ├─ pages/                                              │   │
│  │  │  ├─ ImageCoresIndex.tsx                             │   │
│  │  │  ├─ ImageCoresShow.tsx                              │   │
│  │  │  ├─ ImageCoresEdit.tsx                              │   │
│  │  │  ├─ ImageCoresSearch.tsx                            │   │
│  │  │  └─ Settings/...                                    │   │
│  │  ├─ components/                                         │   │
│  │  │  ├─ ViewSwitcher.tsx                                │   │
│  │  │  ├─ MultiSelect.tsx                                 │   │
│  │  │  ├─ SearchForm.tsx                                  │   │
│  │  │  ├─ StatusDisplay.tsx                               │   │
│  │  │  └─ [Other UI components]                           │   │
│  │  ├─ hooks/                                              │   │
│  │  │  ├─ useDebounce.ts                                  │   │
│  │  │  ├─ useWebSocket.ts                                 │   │
│  │  │  └─ useFetch.ts                                     │   │
│  │  └─ App.tsx                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                                      │
│           │ React Router (or keep Rails routing)                │
│           ↓                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         shadcn/ui Components                             │   │
│  │  ├─ Select (replaces multi-select)                      │   │
│  │  ├─ Button, Input, Form                                 │   │
│  │  ├─ Dialog, AlertDialog                                 │   │
│  │  ├─ DropdownMenu                                        │   │
│  │  └─ Toast/Notification system                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                                      │
│           │ Vite bundling                                       │
│           ↓                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         NPM Dependencies                                 │   │
│  │  ├─ react@18, react-dom@18                              │   │
│  │  ├─ react-hook-form                                     │   │
│  │  ├─ @radix-ui/react-*                                   │   │
│  │  ├─ tailwindcss                                         │   │
│  │  └─ [20+ supporting libs]                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Real-time Communication (WebSockets)            │   │
│  │  ├─ Custom WebSocket hook → React state                │   │
│  │  ├─ JSON responses from backend                         │   │
│  │  └─ StatusDisplay component updates                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Action Cable Channels (Ruby)                │   │
│  │              (Same as today)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                      Styling Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ├─ Tailwind CSS 3.0 (unchanged)                               │
│  ├─ CSS modules or TailwindCSS-in-JS                           │
│  ├─ Dark mode (same as today)                                  │
│  └─ Component-based styling (no class toggles)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Phasing Strategy

```
PHASE 1: Setup (Weeks 1-2)
┌─────────────────────────────────────────────┐
│ ├─ Install vite_rails gem                   │
│ ├─ Configure Vite + React + TypeScript      │
│ ├─ Add shadcn/ui                            │
│ ├─ First React component test               │
│ └─ Verify build pipeline                    │
└─────────────────────────────────────────────┘
                    ↓
PHASE 2: Components (Weeks 3-8)
┌─────────────────────────────────────────────┐
│ ├─ ViewSwitcher.tsx (from view_switcher)   │
│ ├─ MultiSelect.tsx (from multi_select)     │
│ ├─ SearchForm.tsx (from debounce)          │
│ ├─ StatusDisplay.tsx (new from channels)   │
│ ├─ useDebounce hook                        │
│ ├─ useWebSocket hook                       │
│ └─ Form infrastructure + validation        │
└─────────────────────────────────────────────┘
                    ↓
PHASE 3: Pages (Weeks 9-14)
┌─────────────────────────────────────────────┐
│ ├─ Search.tsx (highest priority)            │
│ ├─ Index.tsx (list + filter)                │
│ ├─ Edit.tsx (form submission)               │
│ ├─ Show.tsx (read-only display)             │
│ ├─ Settings pages (lower priority)          │
│ └─ Keep Rails rendering for remaining      │
└─────────────────────────────────────────────┘
                    ↓
PHASE 4: Real-time (Weeks 15-17)
┌─────────────────────────────────────────────┐
│ ├─ WebSocket client in React                │
│ ├─ Update backend to send JSON              │
│ ├─ Status display component                 │
│ ├─ Description display component            │
│ └─ Integration testing                      │
└─────────────────────────────────────────────┘
                    ↓
PHASE 5: Polish (Weeks 18-19)
┌─────────────────────────────────────────────┐
│ ├─ Remove Stimulus dependencies             │
│ ├─ Remove importmap.rb                      │
│ ├─ Optimize bundle                          │
│ ├─ Full test coverage                       │
│ └─ Production deployment                    │
└─────────────────────────────────────────────┘

PARALLEL: Keep both systems running during migration
- Feature flags control which version is rendered
- Can roll back individual features
- Zero downtime migration possible
```

---

## Complexity Comparison

```
CURRENT (Stimulus)           FUTURE (React)
─────────────────           ──────────────

142 LOC JS                   ~1,200 LOC React
5 controllers                15-20 components
23 data attributes           Props & hooks
Server renders HTML          Client renders JSON
Direct DOM manipulation      Virtual DOM
sessionStorage state         React state / hooks
Simple → tight coupling      Flexible → composition
No build step               Vite build pipeline
CDN imports                 npm dependencies
No TypeScript               TypeScript ready

MIGRATION COMPLEXITY SUMMARY
────────────────────────────
View Switching:        Low    (simple state)
Multi-Select:          Medium (form integration)
Search Debounce:       Low    (custom hook)
Real-time Updates:     Medium (new architecture)
Overall:               MODERATE
```

