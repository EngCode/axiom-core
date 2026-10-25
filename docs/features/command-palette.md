# Command palette

**Status:** shipped · **Shortcut:** `⌘K` / `Ctrl+K` · **Source:**
[`src/components/command-palette.tsx`](../../src/components/command-palette.tsx)

One search box for navigation, actions, tasks and notes. It is mounted once in
[`App.tsx`](../../src/App.tsx) and can be opened from any page, including the desktop quick
capture window.

## Opening and closing

- `⌘K` / `Ctrl+K` toggles the palette from anywhere (handled in `src/lib/ui.tsx`).
- `Esc` or clicking the backdrop closes it.
- The sidebar Search button and the top bar Search button open it.
- Opening resets the query and the active row; body scrolling is locked while open.

## Groups

| Group | Contents |
| --- | --- |
| **Pages** | Dashboard, Issues (`n open`), Projects (`n active`), Notes (`n notes`) |
| **Actions** | Create issue (`C`), Create note, `Theme: <name>` (cycles to the next theme) |
| **Issues** | Up to 5 recent issues when idle; matching issues while searching (12 results max overall) |
| **Notes** | Up to 4 recent notes when idle; matching notes while searching |

Search is a case-insensitive substring match over the title, subtitle and keywords. Issue
keywords include the key (`WEB-4`) and labels; note keywords include tags.

## Keyboard

| Key | Action |
| --- | --- |
| `↑` / `↓` | Move the active row (wraps around) |
| `Enter` | Run the active row |
| `Esc` | Close |
| Typing | Filters and resets the active row to the first result |

The active row scrolls into view automatically. Rows also respond to hover.

## Running an item

| Item | Result |
| --- | --- |
| Page | Navigates to the route (including Documentation) |
| Create issue | Opens the issue dialog (palette closes first) |
| Create note | Creates a note, then navigates to `/notes?note=<id>` |
| Theme | Applies the next theme in the registry |
| Issue | Opens that issue in the edit dialog |
| Note | Navigates to `/notes?note=<id>` |

The palette always closes before running an item, so two overlays never stack.

## Empty state

“No results for “query”” inside the results area. Footer always shows the navigation hints.

## Known gaps

- Substring matching only — no fuzzy scoring or highlighted matches.
- No command for quick capture, focus/timer, import/export or settings.
- No “recently used” ranking; idle lists are ordered by `updatedAt`.
- Results are capped; there is no pagination.
