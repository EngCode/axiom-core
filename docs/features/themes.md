# Themes and design tokens

**Status:** shipped · **Sources:** [`src/index.css`](../../src/index.css),
[`src/lib/themes.ts`](../../src/lib/themes.ts),
[`src/components/theme-picker.tsx`](../../src/components/theme-picker.tsx) ·
**Full reference:** [DESIGN.md](../resources/DESIGN.md)

Every colour, radius and display font in the UI is a semantic token. A theme is a set of values
for those tokens; components never know which theme is active.

## Shipped themes

| Theme | Mode | Character | Display font | Radius card / control |
| --- | --- | --- | --- | --- |
| **Orbit** | dark | violet on near-black (default) | Inter | 12 / 8 px |
| **Paper** | light | warm paper, rust accent, serif headings | Georgia | 6 / 4 px |
| **Graphite** | dark | neutral dark, cyan accent | Inter | 8 / 6 px |

## Switching

- Palette icon in the **sidebar footer** (menu opens upwards) or in the **top bar** (downwards).
- Command palette → *Theme: \<name\>* cycles to the next theme.
- The menu lists all themes with a three-swatch preview, name and description; `Esc` or an
  outside click closes it.

## How a theme applies

1. `index.html` runs a tiny pre-paint script: reads `orbit.state.v1` from localStorage, normalises
   the theme id, sets `data-theme` on `<html>` and toggles the `dark` class. This avoids a flash of
   the wrong theme.
2. `AppProvider` repeats the same logic whenever the theme changes: sets `data-theme` and the
   `dark` class based on the registry’s `mode`.
3. CSS blocks `[data-theme='…']` in `index.css` define the token values. Tailwind utilities such as
   `bg-surface` and `text-fg-muted` resolve through `@theme inline`.
4. The theme id is persisted in `AppState.theme` → localStorage and SQLite (`meta.theme`).

Legacy `dark` / `light` values are mapped to `orbit` / `paper` on load.

## Adding a theme

1. Add a `[data-theme='…']` block in `src/index.css` with **all** semantic tokens, the display
   font and both radii.
2. Add an entry to `THEMES` in `src/lib/themes.ts` (id, name, description, mode, three swatches).
3. Done: picker, palette, pre-paint script and persistence all read from that list.

## Design explorations

`design/paper.html` and `design/terminal.html` are static mockups of two directions. Rendered
versions live in `docs/style-paper.png` and `docs/style-terminal.png`. The Paper theme borrows the
first one’s palette and serif display; the terminal direction is not a theme yet.

## Known gaps

- No custom user themes, import/export of themes, or per-workspace themes.
- No automatic following of the Windows light/dark setting.
- The terminal direction would need monospace UI and glyph statuses, not just token changes.
