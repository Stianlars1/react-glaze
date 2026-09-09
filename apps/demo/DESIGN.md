# Demo design system

The structural, type and motion tokens come from `@larsen-utvikling/create-next-app@0.6.0`. The color file was replaced with the actual browser download from Canonical Palette on September 9, 2026.

## Palette provenance

- Primary seed: `#4655F5`.
- Secondary: automatically selected triadic-clockwise companion.
- Background tint: weak.
- Export: shadcn/ui, HSL, values, strict CSS, sRGB.
- Dark mode: media, with the generator's data-theme overrides.
- Tailwind integration: omit. No utility framework is used.
- `src/lib/design-system/theme.css` is the unmodified download.
- SHA-256: `3a08adc1a5133baf6ff1a7dafcffecf7b257d7d476692cfb401b0c3eb9fc6933`.

Use `hsl(var(--token))`, or `hsl(var(--token) / 0.75)` for alpha. The exported primary action can differ from the input seed to satisfy the generator's contrast checks. Those export checks do not verify arbitrary text over the landing artwork.

| Role | Token |
| --- | --- |
| Page | `--background`, `--foreground` |
| Quiet surfaces | `--muted`, `--muted-foreground` |
| Raised surfaces | `--card`, `--card-foreground` |
| Primary action | `--primary`, `--primary-foreground` |
| Companion color | `--secondary`, `--secondary-foreground` |
| Interactive boundary | `--input`, `--ring` |
| Decorative boundary | `--border` |
| Additional artwork hues | `--chart-1` through `--chart-5` |

The strict export does not contain the scaffold's `--accent-1..12`, `--gray-1..12` or `--brand-blue` extensions. Do not introduce a second palette to restore them. Document defaults live in `document.css` so the generated file stays byte-identical.

All global styling follows `layout.tsx` -> `globals.css` -> `design-system/index.css`. The migrated demos retain their original palettes and layout behind `.playground-shell` and `.showcase-shell`; their tokens and selectors cannot affect the landing page. The accepted composition and QA evidence live in the root design lock.

## Spacing - 8 steps, 4px base

| Token | Value | px |
| --- | --- | --- |
| `--space-1` | 0.25rem | 4 |
| `--space-2` | 0.5rem | 8 |
| `--space-3` | 0.75rem | 12 |
| `--space-4` | 1rem | 16 |
| `--space-5` | 1.5rem | 24 |
| `--space-6` | 2rem | 32 |
| `--space-7` | 3rem | 48 |
| `--space-8` | 4rem | 64 |

## Widths

| Token | Value | Use |
| --- | --- | --- |
| `--width-prose` | 65ch | Long-form text |
| `--width-content` | 48rem | Standard content column |
| `--width-wide` | 80rem | Wide layouts |

## Radius and layering

- Radius: `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 16px,
  `--radius-full` pill
- Z-index: `--z-dropdown` 100, `--z-sticky` 200, `--z-overlay` 300,
  `--z-modal` 400, `--z-toast` 500

## Type

| Token | Value | Use |
| --- | --- | --- |
| `--leading-heading` | 1.1 | Headings |
| `--leading-body` | 1.5 | Body copy |
| `--leading-tight` | 1.4 | Floor for anything wrapping to 3+ lines |
| `--tracking-display` | -0.025em | Large display text |
| `--tracking-label` | 0.05em | Small uppercase labels |
| `--tracking-body` | 0 | Reading sizes |

Leading is unitless so it scales with font size. Cap long-form measure at
60-75 characters - that is what `--width-prose` (65ch) is for.

## Motion

From `motion.css`. UI motion stays under 300ms; entrances may be slower than
their matching exit (a common pair is `--duration-enter` in, `--duration-fast`
out).

| Token | Value | Use |
| --- | --- | --- |
| `--duration-press` | 140ms | `:active` feedback |
| `--duration-fast` | 160ms | Hover, color and opacity, exits |
| `--duration-ui` | 200ms | Tooltips, dropdowns, menus |
| `--duration-slow` | 240ms | Modals, drawers, sheets |
| `--duration-enter` | 300ms | Entrances |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entrances, exits, direct response |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Travel between on-screen poses |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets and drawers |
| `--ease-soft` | `cubic-bezier(0.2, 0, 0, 1)` | Cross-fades |
| `--press-scale` | 0.97 | Press feedback on buttons and cards |
| `--press-scale-subtle` | 0.985 | Press feedback on large surfaces |
| `--enter-scale` | 0.96 | Entrance scale - never animate from `scale(0)` |
| `--enter-distance` | 12px | Entrance `translateY` offset |
| `--enter-blur` | 4px | Optional soft reveal, paired with distance |
| `--stagger-item` | 50ms | Delay between peer items |
| `--stagger-group` | 100ms | Delay between semantic chunks |

Under `prefers-reduced-motion` the distance, scale and stagger tokens
collapse to zero, so transitions keep running while movement stops - reduced
means gentler, not absent. Purely decorative continuous animation should
carry `data-motion="decorative"` so it can be switched off.

## Breakpoints (reference)

Media queries cannot read custom properties - use these values directly:
`480px` (sm), `768px` (md), `1024px` (lg), `1280px` (xl).

## Writing style

Only "-" as a dash in all content. Never use non-ASCII dash characters.
