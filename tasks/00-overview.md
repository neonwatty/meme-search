# React Islands Migration - Overview & Master Checklist

## Migration Strategy

This migration converts meme-search from importmap-rails to **Vite + React Islands** architecture. We'll maintain all existing functionality while progressively enhancing specific components with React.

## Architecture Goals

```
┌─────────────────────────────────────────────────────────┐
│ Rails HTML (Fast, SEO-friendly)                        │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│ │ Static Nav │  │React Island│  │Static Footer│        │
│ │   (ERB)    │  │  (Gallery) │  │   (ERB)    │        │
│ └────────────┘  └────────────┘  └────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Current State Analysis

### ✅ Already Have
- Rails 7.2 (solid foundation)
- Tailwind CSS (will reuse)
- Turbo + Stimulus (can keep for simple interactions)
- ActionCable (real-time updates)
- PostgreSQL + pgvector (no changes needed)
- Python ML service (no changes needed)

### ❌ Need to Add
- Vite (replace importmap)
- React 18 + TypeScript
- shadcn/ui component library
- TanStack Query (data fetching)
- React Islands mounting system
- API endpoints for React

## Migration Phases

### Phase 1: Foundation (Week 1)
Set up Vite, React, and basic infrastructure
- [ ] Task 01: Foundation Setup

### Phase 2: Infrastructure (Week 1-2)
Create React Islands system
- [ ] Task 02: Infrastructure Setup
- [ ] Task 03: shadcn/ui Setup

### Phase 3: API Layer (Week 2)
Build JSON API for React components
- [ ] Task 04: API Layer

### Phase 4: Components (Week 2-3)
Convert high-value components to React
- [ ] Task 05: Gallery Component
- [ ] Task 06: Search Component

### Phase 5: Testing (Week 3-4)
Test all components
- [ ] Task 07: Testing Setup

### Phase 6: Deployment (Week 4)
Deploy to production
- [ ] Task 08: Deployment

## Success Criteria

- [ ] All existing functionality works
- [ ] Gallery is a React Island with grid/list views
- [ ] Search is a React Island with autocomplete
- [ ] Real-time updates via ActionCable still work
- [ ] ML service integration unchanged
- [ ] Page loads are fast (< 2s)
- [ ] SEO remains intact (server-rendered HTML)
- [ ] Tests pass (system + component)

## Risk Mitigation

1. **Backwards Compatibility**: Keep old views working during migration
2. **Feature Flags**: Use environment variables to toggle new UI
3. **Parallel Routes**: Run old and new routes side-by-side
4. **Database Backups**: Take snapshots before each phase
5. **Rollback Plan**: Can revert to importmap if needed

## Component Priority

### High Priority (Do First)
1. **Gallery** - Most complex, highest value
2. **Search** - Second most interactive
3. **Filter Panel** - Good candidate for React

### Medium Priority (Do If Time)
4. Settings pages
5. Edit forms

### Low Priority (Keep as Rails)
- Navigation (already simple)
- Footer (static)
- Show pages (mostly static)

## Key Files to Create

```
meme-search/
├── tasks/                    # This directory
├── package.json              # New - npm dependencies
├── vite.config.ts           # New - Vite configuration
├── tsconfig.json            # New - TypeScript config
├── components.json          # New - shadcn/ui config
├── app/
│   ├── javascript/
│   │   ├── entrypoints/     # New - Vite entry points
│   │   ├── components/      # New - React components
│   │   ├── lib/             # New - Utilities
│   │   └── hooks/           # New - Custom hooks
│   ├── controllers/
│   │   └── api/             # New - API endpoints
│   │       └── v1/
│   │           ├── memes_controller.rb
│   │           └── search_controller.rb
│   └── helpers/
│       └── react_helper.rb  # New - React island helper
└── Procfile.dev             # Update - add Vite dev server
```

## Next Steps

1. ✅ Read this overview
2. → Proceed to `01-foundation.md`
3. Work through tasks sequentially
4. Update checkboxes as you complete items
5. Take git snapshots after each major phase

## Emergency Contacts

- React Islands Pattern: `plans/react_islands_rails_explained.md`
- Full Plan: `plans/option4_rails_vite_react_islands.md`
- Vite Rails Docs: https://vite-ruby.netlify.app/
- shadcn/ui Docs: https://ui.shadcn.com/

---

**Current Phase**: Not Started
**Last Updated**: 2024-10-24
**Status**: Ready to begin Phase 1
