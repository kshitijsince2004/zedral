# Zedral Design System

> Complete design specification for the Zedral website. Use this as the source of truth when building any new page, component, or feature to ensure visual consistency.

---

## 1. Brand Identity

- **Company**: Zedral — manufacturing intelligence platform
- **Tone**: Professional, precise, trustworthy, B2B SaaS
- **Aesthetic**: Clean, modern, dark-nav with light content areas, isometric line-art illustrations
- **Logo**: `Zicji_logo-2.png` — `h-16` in Navbar, `h-24` in Footer

---

## 2. Color Palette

All colors are defined as **HSL** in `src/index.css` and mapped in `tailwind.config.ts`. Always use semantic tokens — **never hardcode hex or HSL values in components**.

### 2.1 Core Tokens

| Token | HSL Value | Hex (approx) | Usage |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page background (white) |
| `--foreground` | `160 40% 14%` | `#163328` | Body text (deep teal-green) |
| `--primary` | `160 40% 14%` | `#163328` | Nav, buttons, headings, dark sections |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | Text on primary |
| `--secondary` | `150 10% 96%` | `#F4F6F5` | Light gray surfaces |
| `--secondary-foreground` | `160 40% 14%` | `#163328` | Text on secondary |
| `--accent` | `43 90% 55%` | `#F1B824` | Gold/amber highlights |
| `--accent-foreground` | `160 40% 14%` | `#163328` | Text on accent |
| `--muted` | `150 10% 96%` | `#F4F6F5` | Subtle backgrounds |
| `--muted-foreground` | `160 10% 45%` | `#69807A` | Secondary text, captions |
| `--card` | `150 10% 96%` | `#F4F6F5` | Card backgrounds |
| `--card-foreground` | `160 40% 14%` | `#163328` | Card text |
| `--border` | `150 10% 90%` | `#E2E7E5` | Borders & dividers |
| `--input` | `150 10% 90%` | `#E2E7E5` | Input borders |
| `--ring` | `160 40% 14%` | `#163328` | Focus rings |
| `--destructive` | `0 84.2% 60.2%` | `#EF4444` | Error states |
| `--destructive-foreground` | `0 0% 100%` | `#FFFFFF` | Text on destructive |
| `--popover` | `0 0% 100%` | `#FFFFFF` | Popover background |
| `--popover-foreground` | `160 40% 14%` | `#163328` | Popover text |

### 2.2 Specialty Tokens

| Token | HSL Value | Usage |
|---|---|---|
| `--nav-bg` | `160 40% 14%` | Navbar background (dark teal) |
| `--nav-foreground` | `0 0% 100%` | Navbar text (white) |
| `--cta-from` | `160 45% 22%` | CTA gradient start |
| `--cta-to` | `160 50% 12%` | CTA gradient end |
| `--hero-from` | `160 60% 18%` | Hero gradient start |
| `--hero-to` | `160 50% 8%` | Hero gradient end |

### 2.3 Sidebar Tokens

| Token | HSL Value |
|---|---|
| `--sidebar-background` | `150 10% 97%` |
| `--sidebar-foreground` | `160 40% 14%` |
| `--sidebar-primary` | `160 40% 14%` |
| `--sidebar-primary-foreground` | `0 0% 100%` |
| `--sidebar-accent` | `150 10% 94%` |
| `--sidebar-accent-foreground` | `160 40% 14%` |
| `--sidebar-border` | `150 10% 90%` |
| `--sidebar-ring` | `160 40% 14%` |

### 2.4 Opacity Modifiers

Use Tailwind opacity modifiers instead of new color tokens:
- `text-primary-foreground/70` — secondary text on dark
- `text-primary-foreground/50` — tertiary text on dark
- `border-primary-foreground/20` — subtle border on dark
- `text-foreground/60` — muted text on light

---

## 3. Typography

### 3.1 Font Family
- **Primary**: `Inter` — weights 300, 400, 500, 600, 700, 800
- Loaded from Google Fonts in `src/index.css`
- Applied globally via `font-family: 'Inter', sans-serif`

### 3.2 Type Scale

| Use case | Class | Weight |
|---|---|---|
| Hero heading | `text-5xl md:text-7xl` | `font-bold` |
| Page heading (H1) | `text-4xl md:text-5xl` | `font-bold` |
| Section heading (H2) | `text-3xl md:text-4xl` | `font-bold` |
| Subheading (H3) | `text-2xl md:text-3xl` | `font-semibold` |
| Card title | `text-xl` | `font-semibold` |
| Body | `text-base` | `font-normal` |
| Small / caption | `text-sm` | `font-normal` |
| Eyebrow / badge | `text-xs uppercase tracking-wider` | `font-medium` |

### 3.3 Tracking & Leading
- Headings: `tracking-tight`
- Body: default tracking, `leading-relaxed`
- Eyebrows / badges: `tracking-wider` or `tracking-widest`, `uppercase`

---

## 4. Spacing & Layout

### 4.1 Container
- **Max content width**: `max-w-7xl` (1280px)
- **Horizontal padding**: `px-6` (mobile), scales naturally
- **Wrapper pattern**: `max-w-7xl mx-auto px-6`

### 4.2 Section Padding
- **Standard**: `py-20` (80px)
- **Large / hero**: `py-24` to `py-28`
- **Top of hero (under sticky nav)**: `pt-32 md:pt-40`

### 4.3 Border Radius
- **Base**: `0.75rem` (`--radius`)
- **lg**: `var(--radius)` → `rounded-lg`
- **md**: `calc(var(--radius) - 2px)` → `rounded-md`
- **sm**: `calc(var(--radius) - 4px)` → `rounded-sm`
- **Pills / badges**: `rounded-full`

### 4.4 Grid Gaps
- Card grids: `gap-6` to `gap-8`
- Tight grids: `gap-4`

---

## 5. Components

### 5.1 Buttons (`src/components/ui/button.tsx`)
Variants: `default` (primary), `secondary`, `outline`, `ghost`, `link`, `destructive`
- Default: `bg-primary text-primary-foreground`
- Outline: `border border-input bg-background`
- Sizes: `sm`, `default`, `lg`, `icon`
- Always `rounded-md`

### 5.2 Cards
- `bg-card text-card-foreground`
- Subtle `border border-border`
- Padding: `p-6` to `p-8`
- Optional hover: `hover:shadow-lg transition-shadow`

### 5.3 Badges / Eyebrows
- `rounded-full px-3 py-1`
- `text-xs uppercase tracking-wider`
- Border style: `border border-primary-foreground/20` on dark, `border border-border` on light
- Often paired with a status dot (small filled circle in `bg-accent`)

### 5.4 Navbar (`src/components/Navbar.tsx`)
- Sticky: `sticky top-0 z-50`
- Background: `bg-nav` (dark teal)
- Text: `text-nav-foreground` with `/70` opacity for inactive links
- Height: `h-16`
- Logo: `h-16`

### 5.5 Footer
- Dark background (`bg-primary`)
- Logo at `h-24` above the navigation grid
- Multi-column link grid

### 5.6 Forms / Inputs
- Border: `border-input`
- Background: `bg-background`
- Focus ring: `ring-ring`
- Rounded: `rounded-md`

---

## 6. Section Patterns

### 6.1 Dark Hero Section
```tsx
<section className="bg-primary pt-32 pb-20 md:pt-40 md:pb-28">
  <div className="max-w-7xl mx-auto px-6">
    <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 px-3 py-1 text-xs uppercase tracking-wider text-primary-foreground/70">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      Eyebrow
    </span>
    <h1 className="mt-6 text-5xl md:text-7xl font-bold text-primary-foreground tracking-tight">
      Headline <span className="italic text-primary-foreground/45">accent</span>
    </h1>
  </div>
</section>
```

### 6.2 Light Content Section
```tsx
<section className="bg-background py-20">
  <div className="max-w-7xl mx-auto px-6">
    {/* content */}
  </div>
</section>
```

### 6.3 CTA Section
- Use gradient: `bg-gradient-to-br from-[hsl(var(--cta-from))] to-[hsl(var(--cta-to))]`
- White text, gold accent button

---

## 7. Imagery & Illustrations

- **Style**: Large, minimal isometric line-art
- **Blending**: `mix-blend-multiply` for seamless background integration
- **Treatment**: No containers, no shadows — illustrations float
- **Color accents**: Subtle gold (`--accent`) highlights within line art

---

## 8. Animations

### 8.1 Framer Motion
- Page transitions via `PageTransition.tsx`
- Section reveal: `initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}`
- Stagger children for lists

### 8.2 CSS Animations (`src/index.css`)
- `animate-marquee` — 30s linear infinite (logos / testimonials)
- `animate-marquee-reverse` — reverse direction
- `animate-logo-scroll` — 20s linear infinite
- `animate-accordion-down` / `animate-accordion-up` — Radix accordion

### 8.3 Transitions
- Default: `transition-colors` for hover states
- Duration: `duration-200` to `duration-300`

---

## 9. Responsive Breakpoints

Tailwind defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px (Navbar switches to desktop here)
- `xl`: 1280px
- `2xl`: 1400px (container max)

Mobile-first: write base styles, then layer `md:` and `lg:` overrides.

---

## 10. Key Principles

1. **Always use semantic tokens** — `bg-primary`, `text-foreground`, `border-border`. Never hardcode `bg-[#163328]` or `text-[hsl(160,40%,14%)]`.
2. **All colors in HSL** in `index.css` and `tailwind.config.ts`.
3. **Opacity via Tailwind modifiers** — `text-primary-foreground/50`, not new color tokens.
4. **Dark sections** = `bg-primary` + `text-primary-foreground` (+ opacity modifiers for hierarchy).
5. **Light sections** = `bg-background` or `bg-secondary` + `text-foreground`.
6. **Container pattern**: `max-w-7xl mx-auto px-6` for every section's inner wrapper.
7. **Mobile-first**: design for mobile, scale up with `md:` / `lg:`.
8. **Consistency over cleverness**: reuse existing patterns from `Hero`, `Features`, `CTA` rather than inventing new ones.

---

## 11. File Reference

| File | Purpose |
|---|---|
| `src/index.css` | CSS variables (color tokens), font import, custom keyframes |
| `tailwind.config.ts` | Tailwind theme extension, color mapping |
| `src/components/ui/*` | shadcn primitives (button, card, badge, etc.) |
| `src/components/Navbar.tsx` | Sticky dark navigation |
| `src/components/Hero.tsx` | Reference hero pattern |
| `src/components/CTA.tsx` | Reference gradient CTA pattern |
