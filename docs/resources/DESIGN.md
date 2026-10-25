# Orbit design system

The design should be changeable without touching features. That means every colour, radius,
font and shadow a component uses is a **semantic token**, never a literal value.

```
tokens (CSS variables)  →  themes (token sets)  →  primitives (ui.tsx)
        →  patterns (page header, card header, empty state, row)
        →  screens (dashboard, issues, projects, notes)
```

## 1. Tokens

Defined once in `src/index.css`, exposed to Tailwind through `@theme inline`, so components use
ordinary utilities (`bg-surface`, `text-fg-muted`, `border-line`).

### Colour

| Token | Utility | Used for |
| --- | --- | --- |
| `--canvas` | `bg-canvas` | app background |
| `--surface` | `bg-surface` | cards, sidebar, dialogs |
| `--surface-2` | `bg-surface-2` | inputs, hover fills, chips |
| `--surface-3` | `bg-surface-3` | pressed / nested fills |
| `--line` / `--line-strong` | `border-line` | separators, control borders |
| `--fg` | `text-fg` | primary text |
| `--fg-muted` | `text-fg-muted` | secondary text |
| `--fg-subtle` | `text-fg-subtle` | metadata, placeholders |
| `--accent` | `bg-accent` / `text-accent` | primary action, done, selection |
| `--accent-soft` | `bg-accent-soft` | selected pills, tints |
| `--accent-fg` | `text-accent-fg` | text on accent |
| `--ok`, `--warn`, `--danger`, `--info` | `text-ok` … | status semantics |
| `--ok-soft`, `--warn-soft`, `--danger-soft` | `bg-warn-soft` … | status backgrounds |

Status colours are semantic, not decorative: amber means in-progress, violet/accent means done,
rose means overdue/urgent. Keep that mapping when re-theming.

### Type

| Token | Utility | Notes |
| --- | --- | --- |
| `--font-sans` | `font-sans` | UI text (Inter) |
| `--font-mono` | `font-mono` | keys, counts, timestamps |
| `--font-display` | `font-display` | page titles, note titles — per theme |

Type scale in use: 10–11 px metadata, 12–13 px UI, 20–27 px headings, 30–44 px hero.

### Shape and depth

| Token | Utility | Notes |
| --- | --- | --- |
| `--radius-card` | `rounded-card` | cards, dialogs, palettes |
| `--radius-control` | `rounded-control` | buttons, inputs, menu rows |
| `--shadow-sm/md/lg` | `shadow-sm` … | floating layers only |

Radii are per-theme: Orbit is 12/8 px, Paper 6/4 px, Graphite 8/6 px.

## 2. Themes

| Theme | Mode | Character | Display font | Radii |
| --- | --- | --- | --- | --- |
| **Orbit** (default) | dark | violet on near-black, current app | Inter | 12 / 8 |
| **Paper** | light | warm paper, rust accent, editorial | Georgia serif | 6 / 4 |
| **Graphite** | dark | neutral, cyan accent, tighter | Inter | 8 / 6 |

Switching: palette icon in the sidebar footer or top bar, or `⌘K` → *Theme*. The choice is part
of `AppState` and is persisted to SQLite (`meta.theme`) and localStorage.

### Adding a theme

1. Add a token block in `src/index.css`:
   ```css
   [data-theme='forest'] {
     color-scheme: dark;
     --theme-display-font: 'Inter', sans-serif;
     --theme-radius-card: 10px;
     --theme-radius-control: 6px;
     --canvas: #07110c; --surface: #0b1711; /* … all semantic tokens … */
   }
   ```
2. Add it to `THEMES` in `src/lib/themes.ts` with a name, description, mode and three preview
   swatches.
3. Nothing else: the picker, command palette, first-paint script and persistence read from that
   list.

Legacy values `dark` / `light` are mapped to `orbit` / `paper` on load, so old saves keep working.

## 3. Components

### Primitives (`src/components/ui.tsx`)

| Component | Variants / props |
| --- | --- |
| `Button` | `primary`, `secondary`, `ghost`, `danger` · `sm`, `md` |
| `IconButton` | square, requires `label` |
| `Input`, `Select` | tokenised border, focus ring, 32–36 px height |
| `Card`, `CardHeader` | surface + border + `rounded-card` |
| `Progress` | optional `color` for per-project bars |
| `Modal` | portal, Escape + backdrop close, scroll lock |
| `Field` | label + control stack |
| `Avatar`, `Kbd`, `EmptyState`, `PageHeader` | presentational |

### Domain components

`IssueRow`, `StatusIcon`, `PriorityIcon`, `DueChip`, `ProjectDot`, `StatusPicker`,
`PriorityPicker`, `IssueDialog`, `CommandPalette`, `ThemePicker`, `Sidebar`, `Topbar`,
`AppShell`.

### Patterns

- **Page**: `PageHeader` (eyebrow, display title, description, actions).
- **Card**: `Card` + `CardHeader` + content; dividers use `divide-line/60`.
- **List row**: 28–30 px tall, hover fill, metadata on the right.
- **Empty state**: icon in a circle, one sentence, one action.
- **Overlay**: palette or dialog, never both at once.

## 4. Change recipes

| Goal | Change |
| --- | --- |
| New accent colour | `--accent`, `--accent-soft`, `--accent-fg` in each theme |
| Warmer / cooler neutrals | canvas/surface/line tokens |
| More editorial | `--theme-display-font` → serif, smaller radii, lighter lines |
| Denser layout | row padding in `IssueRow`, type sizes in `index.css` consumers |
| New theme | the three steps above |
| New primitive | add to `ui.tsx`, use only semantic utilities, document it here |

Rules of thumb:

1. **No hex values in components.** If a colour is missing, add a token.
2. **No `rounded-lg`/`rounded-xl` in new code** — use `rounded-control` / `rounded-card`.
3. **Headings that belong to a theme** use `font-display`.
4. **Every interactive element** has hover, focus-visible and disabled states.
5. **Motion** stays 150–250 ms and respects `prefers-reduced-motion`.
6. **Contrast**: body text ≥ 4.5:1 against surface; metadata may be lighter but never the only
   carrier of meaning (pair it with an icon or label).

## 5. Explorations

`design/paper.html` and `design/terminal.html` are static mockups of two directions that are
*not* shipped as themes. They exist to compare density, type and colour before committing to a
direction; the rendered images live in `docs/style-paper.png` and `docs/style-terminal.png`.
The Paper theme in the app borrows its palette and serif display from that exploration; the
terminal direction is intentionally not a theme yet.
