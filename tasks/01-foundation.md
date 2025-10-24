# Task 01: Foundation Setup

**Goal**: Replace importmap with Vite and set up React + TypeScript infrastructure

**Estimated Time**: 4-6 hours

**Prerequisites**: None (this is the first task)

---

## Step 1: Backup Current State

### 1.1 Create Git Checkpoint
```bash
cd /Users/neonwatty/Desktop/meme-search
git add -A
git commit -m "Checkpoint before React Islands migration"
git tag -a v1.0-pre-migration -m "Pre-migration checkpoint"
```

**Checklist:**
- [ ] All changes committed
- [ ] Git tag created
- [ ] Can rollback to this point if needed

---

## Step 2: Remove Importmap

### 2.1 Update Gemfile
Remove importmap, add vite_rails:

```ruby
# Remove these lines:
# gem "importmap-rails"

# Add these lines:
gem "vite_rails"
```

**Checklist:**
- [ ] Removed `importmap-rails` from Gemfile
- [ ] Added `vite_rails` gem

### 2.2 Run Bundle Install
```bash
cd meme_search_pro/meme_search_app
bundle install
```

**Checklist:**
- [ ] `bundle install` successful
- [ ] No dependency conflicts

### 2.3 Remove Importmap Files
```bash
cd meme_search_pro/meme_search_app
rm config/importmap.rb
```

**Checklist:**
- [ ] `config/importmap.rb` deleted

---

## Step 3: Install Vite

### 3.1 Install Vite Rails
```bash
cd meme_search_pro/meme_search_app
bundle exec vite install
```

This creates:
- `config/vite.json`
- `vite.config.ts`
- Updates `bin/dev`
- Creates `app/javascript/entrypoints/application.js`

**Checklist:**
- [ ] Vite installation completed
- [ ] `vite.config.ts` created
- [ ] `config/vite.json` created
- [ ] `app/javascript/entrypoints/` directory exists

### 3.2 Update Application Layout
Edit `app/views/layouts/application.html.erb`:

**Before:**
```erb
<%= stylesheet_link_tag "tailwind", "inter-font", "data-turbo-track": "reload" %>
<%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
<%= javascript_importmap_tags %>
```

**After:**
```erb
<%= stylesheet_link_tag "tailwind", "inter-font", "data-turbo-track": "reload" %>
<%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>

<% if Rails.env.development? %>
  <%= vite_client_tag %>
  <%= vite_react_refresh_tag %>
<% end %>

<%= vite_javascript_tag 'application' %>
```

**Checklist:**
- [ ] Removed `javascript_importmap_tags`
- [ ] Added Vite tags (client, refresh, javascript)
- [ ] Layout updated

---

## Step 4: Install Node Dependencies

### 4.1 Initialize package.json
```bash
cd meme_search_pro/meme_search_app
npm init -y
```

**Checklist:**
- [ ] `package.json` created

### 4.2 Install Core Dependencies
```bash
# React + TypeScript
npm install react react-dom
npm install -D @types/react @types/react-dom

# Vite plugins
npm install -D @vitejs/plugin-react vite

# TypeScript
npm install -D typescript

# Build tools
npm install -D @types/node
```

**Checklist:**
- [ ] React installed
- [ ] TypeScript installed
- [ ] Vite plugins installed
- [ ] Type definitions installed

### 4.3 Install Additional Dependencies
```bash
# TanStack Query (data fetching)
npm install @tanstack/react-query

# Axios (HTTP client)
npm install axios

# Class utilities (for Tailwind)
npm install clsx tailwind-merge class-variance-authority
```

**Checklist:**
- [ ] TanStack Query installed
- [ ] Axios installed
- [ ] Class utilities installed

---

## Step 5: Configure Vite

### 5.1 Update vite.config.ts
Create/update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    RubyPlugin(),
    react({
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/javascript'),
      '@/components': path.resolve(__dirname, './app/javascript/components'),
      '@/lib': path.resolve(__dirname, './app/javascript/lib'),
      '@/hooks': path.resolve(__dirname, './app/javascript/hooks'),
    },
  },
  server: {
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
})
```

**Checklist:**
- [ ] `vite.config.ts` created/updated
- [ ] React plugin configured
- [ ] Path aliases configured
- [ ] HMR configured

### 5.2 Create TypeScript Config
Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/javascript/*"],
      "@/components/*": ["app/javascript/components/*"],
      "@/lib/*": ["app/javascript/lib/*"],
      "@/hooks/*": ["app/javascript/hooks/*"]
    }
  },
  "include": [
    "app/javascript/**/*",
    "app/javascript/**/*.tsx"
  ],
  "exclude": ["node_modules"]
}
```

**Checklist:**
- [ ] `tsconfig.json` created
- [ ] React JSX configured
- [ ] Path aliases match vite.config.ts
- [ ] Strict mode enabled

---

## Step 6: Create Base JavaScript Structure

### 6.1 Create Application Entry Point
Update `app/javascript/entrypoints/application.js` to `.ts`:

```bash
mv app/javascript/entrypoints/application.js app/javascript/entrypoints/application.ts
```

Create `app/javascript/entrypoints/application.ts`:

```typescript
// Import CSS
import '../../assets/stylesheets/application.css'

// Import Turbo & Stimulus (keep existing functionality)
import '@hotwired/turbo-rails'
import './controllers'

// Import ActionCable channels
import './channels'

console.log('Vite + React ⚡️ Rails')
```

**Checklist:**
- [ ] `application.js` renamed to `application.ts`
- [ ] Imports updated
- [ ] CSS import added
- [ ] Turbo/Stimulus still imported

### 6.2 Move Existing JavaScript Files
```bash
cd meme_search_pro/meme_search_app/app/javascript

# Move channels
mkdir -p entrypoints/channels
mv channels/*.js entrypoints/channels/

# Move controllers (Stimulus)
mkdir -p entrypoints/controllers
mv controllers/*.js entrypoints/controllers/
```

**Checklist:**
- [ ] Channels moved to `entrypoints/channels/`
- [ ] Stimulus controllers moved to `entrypoints/controllers/`
- [ ] Old directory structure cleaned up

### 6.3 Create Directory Structure
```bash
cd meme_search_pro/meme_search_app/app/javascript

# Create React directories
mkdir -p components
mkdir -p lib
mkdir -p hooks
mkdir -p types
```

**Checklist:**
- [ ] `components/` directory created
- [ ] `lib/` directory created
- [ ] `hooks/` directory created
- [ ] `types/` directory created

---

## Step 7: Update Procfile.dev

### 7.1 Update Procfile.dev
Update `Procfile.dev` (or create if doesn't exist):

```
web: bin/rails server -p 3000
js: npm run dev
css: bin/rails tailwindcss:watch
```

**Checklist:**
- [ ] `Procfile.dev` updated
- [ ] Vite dev server included
- [ ] Rails server configured
- [ ] Tailwind watch included

### 7.2 Update package.json Scripts
Update `package.json` to include:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "clobber": "vite clobber"
  }
}
```

**Checklist:**
- [ ] `dev` script added
- [ ] `build` script added
- [ ] `clobber` script added

---

## Step 8: Test Basic Setup

### 8.1 Start Development Server
```bash
cd meme_search_pro/meme_search_app
bin/dev
```

**Checklist:**
- [ ] Rails server starts successfully
- [ ] Vite dev server starts successfully
- [ ] No JavaScript errors in browser console
- [ ] Existing Stimulus controllers still work
- [ ] Tailwind CSS still applies

### 8.2 Test Hot Module Replacement
1. Edit a JavaScript file
2. Save
3. Browser should update without full reload

**Checklist:**
- [ ] HMR works for JavaScript changes
- [ ] No page reload required
- [ ] Changes appear instantly

---

## Step 9: Create Test React Component

### 9.1 Create Test Component
Create `app/javascript/components/HelloReact.tsx`:

```tsx
import React from 'react'

interface HelloReactProps {
  name: string
}

export default function HelloReact({ name }: HelloReactProps) {
  return (
    <div className="p-4 bg-blue-100 rounded">
      <h2 className="text-xl font-bold">Hello from React!</h2>
      <p>Welcome, {name}</p>
    </div>
  )
}
```

**Checklist:**
- [ ] `HelloReact.tsx` created
- [ ] TypeScript syntax used
- [ ] Tailwind classes used

### 9.2 Update Application Entry Point
Update `app/javascript/entrypoints/application.ts`:

```typescript
// ... existing imports ...

// Test React import
import HelloReact from '../components/HelloReact'

console.log('Vite + React ⚡️ Rails')
console.log('React component loaded:', HelloReact)
```

**Checklist:**
- [ ] React component imported
- [ ] No TypeScript errors
- [ ] Build succeeds

---

## Step 10: Verify & Commit

### 10.1 Check for Errors
```bash
# Check TypeScript
npx tsc --noEmit

# Check build
npm run build
```

**Checklist:**
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Assets generated in `app/assets/builds/`

### 10.2 Commit Progress
```bash
git add -A
git commit -m "Phase 1: Vite + React foundation setup complete"
git tag -a v1.1-foundation -m "Foundation phase complete"
```

**Checklist:**
- [ ] All changes committed
- [ ] Git tag created
- [ ] Ready for next phase

---

## Troubleshooting

### Issue: Vite dev server won't start
**Solution**: Check `config/vite.json` for correct port settings

### Issue: React not found
**Solution**: Ensure `node_modules` is not in `.gitignore`, run `npm install`

### Issue: TypeScript errors
**Solution**: Check `tsconfig.json` paths match actual structure

### Issue: Tailwind not working
**Solution**: Ensure CSS imports in `application.ts`

---

## Success Criteria

- [x] Vite installed and configured
- [x] React + TypeScript working
- [x] HMR functioning
- [x] Existing Stimulus/Turbo still work
- [x] Build produces correct assets
- [x] No console errors
- [x] Ready for Phase 2

---

**Next**: Proceed to `02-infrastructure.md` (React Islands System)
