# How React Islands Architecture Works with Rails - Complete Guide

## Table of Contents
1. [What is Islands Architecture?](#what-is-islands-architecture)
2. [Why NOT ImportMaps for React](#why-not-importmaps-for-react)
3. [How It Actually Works](#how-it-actually-works)
4. [Real-World Examples](#real-world-examples)
5. [Implementation Approaches](#implementation-approaches)
6. [Popularity and Adoption](#popularity-and-adoption)
7. [Comparison with Other Approaches](#comparison-with-other-approaches)

## What is Islands Architecture?

Islands architecture is a pattern where you render HTML pages on the server (Rails) but selectively "hydrate" interactive components on the client (React). Think of it as islands of interactivity in an ocean of static HTML.

```
Static HTML (Rails)     →    [React Island]    →    Static HTML (Rails)
                             (Interactive)
```

The key insight: **Most of your page is static**, only certain parts need React's interactivity.

## Why NOT ImportMaps for React

**Important**: ImportMaps do NOT work well with React in Rails because:

1. **JSX Compilation Required**: React uses JSX syntax which browsers don't understand
2. **No Build Step**: ImportMaps serve raw JavaScript files
3. **No Transpilation**: TypeScript, modern JS features need compilation

```javascript
// This WON'T work with ImportMaps:
const Component = () => <div>Hello {name}</div>  // JSX syntax

// You'd have to write:
const Component = () => React.createElement('div', null, 'Hello ', name)  // Verbose!
```

**The Solution**: Use `jsbundling-rails` with ESBuild instead.

## How It Actually Works

### Step 1: Rails Renders HTML with Mount Points

```erb
<!-- app/views/memes/index.html.erb -->
<div class="page">
  <!-- Static HTML from Rails -->
  <h1>Meme Gallery</h1>

  <!-- React Island Mount Point -->
  <div id="react-gallery"
       data-component="MemeGallery"
       data-props='<%= @memes.to_json %>'>
    <!-- Fallback content (for SSR/no-JS) -->
    <%= render partial: 'meme', collection: @memes %>
  </div>

  <!-- More static HTML -->
  <footer>© 2024</footer>
</div>
```

### Step 2: JavaScript Finds and Hydrates Islands

```javascript
// app/javascript/application.js
import { createRoot } from 'react-dom/client';
import MemeGallery from './components/MemeGallery';

// After page loads
document.addEventListener('DOMContentLoaded', () => {
  // Find all React mount points
  const islands = document.querySelectorAll('[data-component]');

  islands.forEach(island => {
    const Component = componentMap[island.dataset.component];
    const props = JSON.parse(island.dataset.props || '{}');

    // Hydrate the island
    const root = createRoot(island);
    root.render(<Component {...props} />);
  });
});
```

### Step 3: Build Process (ESBuild)

```javascript
// esbuild.config.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['app/javascript/application.js'],
  bundle: true,
  outdir: 'app/assets/builds',
  loader: {
    '.js': 'jsx',    // This handles JSX!
    '.jsx': 'jsx',
    '.tsx': 'tsx'
  }
});
```

### The Flow:

```
1. Browser requests page
2. Rails renders HTML with empty divs marked for React
3. HTML is immediately usable (progressive enhancement)
4. JavaScript loads
5. React components mount in marked divs
6. Islands become interactive
```

## Real-World Examples

### 1. GitHub (Not Rails, but great example)
GitHub uses islands architecture extensively:
- Most of the page is server-rendered
- React powers the file explorer, code editor, and PR reviews
- Comment boxes are React components

### 2. Hey.com (Basecamp)
While primarily Hotwire, they use selective JavaScript enhancement:
- Calendar widgets
- Rich text editors
- Complex dropdowns

### 3. Dev.to
Uses Preact (lightweight React) islands:
- Article editor
- Comment system
- Interactive code demos

### 4. Popular Rails + React Hybrid Apps

#### Shopify (Polaris + Rails)
```ruby
# They use ViewComponents with React islands
<%= react_component("ResourcePicker",
  props: {
    products: @products,
    onSelect: "handleProductSelect"
  }
) %>
```

#### GitLab
Mix of Vue and React islands in a Rails app:
- Vue for simpler components
- React for complex features like merge request widgets

## Implementation Approaches

### Approach 1: react-rails Gem (Simple but Limited)

```ruby
# Gemfile
gem 'react-rails'

# In your view
<%= react_component("HelloWorld", { greeting: "Hello" }) %>

# Generates:
<div data-react-class="HelloWorld" data-react-props='{"greeting":"Hello"}'></div>
```

**Pros**: Simple setup
**Cons**: No SSR, basic features only

### Approach 2: react_on_rails Gem (Full-Featured)

```ruby
# Gemfile
gem 'react_on_rails', '13.4.0'

# View with server-side rendering
<%= react_component("HelloWorld",
  props: @hello_world_props,
  prerender: true  # Server-side rendering!
) %>
```

**Pros**: SSR support, Redux integration, better hydration
**Cons**: More complex setup

### Approach 3: Custom Implementation (Maximum Control)

```ruby
# app/helpers/react_helper.rb
module ReactHelper
  def react_island(component_name, props = {}, &block)
    content_tag :div,
                capture(&block), # Fallback content
                data: {
                  react_component: component_name,
                  props: props.to_json
                },
                class: "react-island"
  end
end

# Usage in view
<%= react_island("MemeGallery", { memes: @memes }) do %>
  <!-- Fallback HTML -->
  <%= render @memes %>
<% end %>
```

### Approach 4: Modern Setup with jsbundling-rails

```bash
# Setup
rails new myapp -j esbuild
cd myapp
npm install react react-dom

# package.json scripts
{
  "scripts": {
    "build": "esbuild app/javascript/*.* --bundle --outdir=app/assets/builds"
  }
}

# Procfile.dev (for development)
web: bin/rails server
js: npm run build -- --watch
```

## Popularity and Adoption

### Industry Adoption (2024)

1. **Growing Trend**: Islands architecture is gaining popularity
   - Astro framework popularized it
   - Remix exploring "Progressive Enhancement"
   - Next.js App Router supports similar patterns

2. **Rails Community**:
   - Mixed adoption - many stick with Hotwire
   - Teams with existing React expertise adopt it
   - Common in apps migrating from SPAs back to Rails

3. **GitHub Stats** (as of 2024):
   - react-rails: 6.7k stars
   - react_on_rails: 5.1k stars
   - Hotwire (alternative): 4k+ stars

### Who's Using It?

**Startups**: Often choose this for flexibility
- Can start simple with Rails
- Add React complexity only where needed

**Enterprises**: Migration strategy
- Gradual migration from legacy Rails apps
- Or from React SPAs back to server-rendering

**Agencies**: Pragmatic choice
- Use Rails for speed
- React for specific client requirements

## Comparison with Other Approaches

### vs Pure Hotwire
```ruby
# Hotwire Approach
<%= turbo_frame_tag "gallery" do %>
  <%= render @memes %>
<% end %>

# React Island Approach
<%= react_component("MemeGallery", { memes: @memes }) %>
```

**Hotwire Pros**:
- No build step
- Smaller bundle size
- Pure Ruby

**React Islands Pros**:
- React ecosystem
- Better for complex state
- Easier hiring (more React devs)

### vs Full React SPA

**SPA Approach**:
```
Rails API → JSON → React App → Virtual DOM → HTML
```

**Islands Approach**:
```
Rails HTML → React enhances specific divs
```

**Islands Advantages**:
- Better SEO
- Faster initial load
- Works without JavaScript
- Simpler deployment

### vs Next.js/Remix

These modern frameworks also support islands-like patterns:

**Next.js App Router**:
```jsx
// Server Component (like Rails view)
export default function Page() {
  const memes = await fetchMemes(); // Server-side

  return (
    <div>
      <h1>Static Title</h1>
      <ClientGallery memes={memes} /> {/* Client island */}
    </div>
  );
}
```

**Rails + React Islands**:
```erb
<h1>Static Title</h1>
<%= react_component("Gallery", { memes: @memes }) %>
```

Similar concept, but Rails gives you:
- ActiveRecord/database integration
- Mature ecosystem
- Convention over configuration

## Best Practices

### 1. Component Boundaries
```
Use React for:
- Complex forms
- Real-time features
- Rich interactions
- Data visualizations

Use Rails/ERB for:
- Static content
- Simple CRUD
- Navigation
- Layout
```

### 2. Data Passing
```ruby
# Controller
@props = {
  memes: @memes.as_json(only: [:id, :url, :description]),
  currentUser: current_user&.slice(:id, :name),
  apiEndpoint: api_memes_path
}

# View
<%= react_component("Gallery", @props) %>
```

### 3. Performance Tips
- Lazy load React components
- Use React.lazy() for code splitting
- Preload critical components
- Cache Rails HTML aggressively

## Common Pitfalls and Solutions

### Pitfall 1: Hydration Mismatches
```javascript
// Problem: Server HTML doesn't match client
// Solution: Ensure consistent data
<div data-props='<%= @memes.to_json(methods: [:url]) %>'>
```

### Pitfall 2: Turbo Conflicts
```javascript
// Solution: Clean up React components before Turbo cache
document.addEventListener('turbo:before-cache', () => {
  document.querySelectorAll('[data-react-component]').forEach(el => {
    // Unmount React components
    ReactDOM.unmountComponentAtNode(el);
  });
});
```

### Pitfall 3: State Management
```javascript
// Use React Query for server state
const { data } = useQuery({
  queryKey: ['memes'],
  queryFn: () => fetch('/api/memes').then(r => r.json()),
  initialData: props.memes // From Rails
});
```

## Conclusion

React Islands with Rails is a **pragmatic, production-ready approach** that:

1. **Works Today**: Using jsbundling-rails + ESBuild (NOT importmaps)
2. **Growing Adoption**: Especially for teams wanting React without SPA complexity
3. **Best of Both Worlds**: Rails productivity + React interactivity
4. **Progressive Enhancement**: Pages work without JavaScript

It's particularly good for:
- Modernizing legacy Rails apps
- Teams with React expertise
- Apps needing complex UI in specific areas
- SEO-critical applications

The pattern is mature enough for production use, with solid tooling and real-world success stories.