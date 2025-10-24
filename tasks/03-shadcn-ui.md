# Task 03: shadcn/ui Component Library Setup

**Goal**: Install and configure shadcn/ui component library for beautiful, accessible React components

**Estimated Time**: 2-3 hours

**Prerequisites**: Task 02 complete

---

## What is shadcn/ui?

shadcn/ui is NOT a component library you install via npm. Instead, it's a collection of **copy-paste components** that:
- You own and can customize
- Built with Radix UI (accessibility)
- Styled with Tailwind CSS
- Written in TypeScript

---

## Step 1: Install Dependencies

### 1.1 Install Core Dependencies
```bash
cd meme_search_pro/meme_search_app

# Radix UI primitives (used by shadcn/ui)
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select
npm install @radix-ui/react-tabs
npm install @radix-ui/react-toast
npm install @radix-ui/react-slot
npm install @radix-ui/react-separator

# Additional utilities
npm install lucide-react  # Icon library
npm install react-hook-form @hookform/resolvers zod  # Form handling
```

**Checklist:**
- [ ] Radix UI components installed
- [ ] lucide-react (icons) installed
- [ ] Form libraries installed

### 1.2 Verify Existing Dependencies
These should already be installed from Task 01:
- `clsx`
- `tailwind-merge`
- `class-variance-authority`

**Checklist:**
- [ ] Verified existing dependencies

---

## Step 2: Initialize shadcn/ui

### 2.1 Create components.json Config
Create `components.json` in the root directory:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/assets/stylesheets/application.tailwind.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Checklist:**
- [ ] `components.json` created
- [ ] Paths configured for Rails structure
- [ ] CSS variables enabled

### 2.2 Update Tailwind Config
Update `tailwind.config.js` to include shadcn/ui theme:

```javascript
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    './public/*.html',
    './app/helpers/**/*.rb',
    './app/javascript/**/*.{js,jsx,ts,tsx}',
    './app/views/**/*.{erb,haml,html,slim}',
    './app/components/**/*.{rb,erb}'
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
}
```

**Checklist:**
- [ ] Tailwind config updated
- [ ] shadcn/ui colors added
- [ ] Dark mode configured
- [ ] Animations added

### 2.3 Install Tailwind Plugins
```bash
npm install -D tailwindcss-animate @tailwindcss/forms
```

**Checklist:**
- [ ] `tailwindcss-animate` installed
- [ ] `@tailwindcss/forms` installed

### 2.4 Add CSS Variables
Update `app/assets/stylesheets/application.tailwind.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Checklist:**
- [ ] CSS variables added
- [ ] Light mode colors defined
- [ ] Dark mode colors defined
- [ ] Base styles applied

---

## Step 3: Add Core Components

### 3.1 Create Components Directory
```bash
cd meme_search_pro/meme_search_app/app/javascript
mkdir -p components/ui
```

**Checklist:**
- [ ] `components/ui/` directory created

### 3.2 Add Button Component
Create `app/javascript/components/ui/button.tsx`:

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Checklist:**
- [ ] Button component created
- [ ] Variants configured (default, destructive, outline, etc.)
- [ ] Sizes configured (sm, default, lg, icon)

### 3.3 Add Card Component
Create `app/javascript/components/ui/card.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

**Checklist:**
- [ ] Card component created
- [ ] Card subcomponents created (Header, Title, Description, Content, Footer)

### 3.4 Add Badge Component
Create `app/javascript/components/ui/badge.tsx`:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

**Checklist:**
- [ ] Badge component created
- [ ] Variants configured

### 3.5 Add Input Component
Create `app/javascript/components/ui/input.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

**Checklist:**
- [ ] Input component created

### 3.6 Add Skeleton Component (for loading states)
Create `app/javascript/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

**Checklist:**
- [ ] Skeleton component created

---

## Step 4: Test shadcn/ui Components

### 4.1 Create Showcase Component
Create `app/javascript/components/ShadcnShowcase.tsx`:

```tsx
import React from 'react'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'

export default function ShadcnShowcase() {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-4xl font-bold">shadcn/ui Component Showcase</h1>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles and sizes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Tag-like components</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </CardContent>
      </Card>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Card 1</CardTitle>
            <CardDescription>A beautiful card component</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is card content with some text.</p>
          </CardContent>
          <CardFooter>
            <Button>Action</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card 2</CardTitle>
            <CardDescription>Another card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Cards can contain any content.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Minimal card example.</p>
          </CardContent>
        </Card>
      </div>

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
          <CardDescription>Form input fields</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Enter your name" />
          <Input type="email" placeholder="Enter your email" />
          <Input type="password" placeholder="Enter password" />
          <Input disabled placeholder="Disabled input" />
        </CardContent>
      </Card>

      {/* Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loaders</CardTitle>
          <CardDescription>Loading states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Checklist:**
- [ ] Showcase component created
- [ ] All components imported
- [ ] Examples for each component

### 4.2 Register Showcase Component
Update `app/javascript/entrypoints/react-islands.tsx`:

```tsx
// ... imports ...
import TestIsland from '../components/TestIsland'
import ShadcnShowcase from '../components/ShadcnShowcase'  // Add this

const componentRegistry: Record<string, React.ComponentType<any>> = {
  TestIsland,
  ShadcnShowcase,  // Add this
}
```

**Checklist:**
- [ ] ShadcnShowcase imported
- [ ] Added to registry

### 4.3 Create Showcase View
Create `app/views/image_cores/shadcn_showcase.html.erb`:

```erb
<div class="max-w-7xl mx-auto py-8">
  <%= react_island "ShadcnShowcase" %>
</div>
```

**Checklist:**
- [ ] Showcase view created

### 4.4 Add Showcase Route
Update `config/routes.rb`:

```ruby
resources :image_cores do
  collection do
    # ... existing routes ...
    get "test_island"
    get "shadcn_showcase"  # Add this
  end
  # ... member routes ...
end
```

**Checklist:**
- [ ] Route added

---

## Step 5: Test Everything

### 5.1 Start Development Server
```bash
cd meme_search_pro/meme_search_app
bin/dev
```

**Checklist:**
- [ ] Server starts without errors
- [ ] Tailwind CSS compiles with new config

### 5.2 Visit Showcase
Navigate to: `http://localhost:3000/image_cores/shadcn_showcase`

**Checklist:**
- [ ] Page loads
- [ ] All buttons render correctly
- [ ] Different button variants visible
- [ ] Cards display properly
- [ ] Badges render
- [ ] Inputs work
- [ ] Skeleton animations play
- [ ] Dark mode variables loaded (check devtools)

### 5.3 Test Interactions
- Click buttons
- Type in inputs
- Inspect elements in devtools

**Checklist:**
- [ ] Buttons respond to clicks
- [ ] Hover states work
- [ ] Focus states work
- [ ] Inputs accept text
- [ ] No console errors

---

## Step 6: Verify & Commit

### 6.1 Type Check
```bash
npx tsc --noEmit
```

**Checklist:**
- [ ] No TypeScript errors

### 6.2 Build Check
```bash
npm run build
```

**Checklist:**
- [ ] Build succeeds
- [ ] No warnings

### 6.3 Commit
```bash
git add -A
git commit -m "Phase 3: shadcn/ui component library setup complete"
git tag -a v1.3-shadcn -m "shadcn/ui phase complete"
```

**Checklist:**
- [ ] All changes committed
- [ ] Git tag created

---

## Success Criteria

- [x] shadcn/ui configured
- [x] Tailwind CSS variables added
- [x] Core components added (Button, Card, Badge, Input, Skeleton)
- [x] Components render correctly
- [x] Styling works
- [x] Dark mode ready
- [x] Accessible (Radix UI)
- [x] TypeScript types correct

---

**Next**: Proceed to `04-api-layer.md` (Build JSON API for React components)
