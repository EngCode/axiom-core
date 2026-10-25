# Keyboard model

**Status:** shipped · **Sources:** [`src/lib/ui.tsx`](../../src/lib/ui.tsx),
[`src/lib/store.tsx`](../../src/lib/store.tsx), dialogs and palette components

The app is usable with a mouse, but the core loop is designed for the keyboard.

## Global shortcuts

| Keys | Action | Where handled |
| --- | --- | --- |
| `⌘K` / `Ctrl+K` | Toggle the command palette | `UIProvider` global listener |
| `C` | New issue (ignored while typing) | `UIProvider` global listener |
| `⌘J` / `Ctrl+J` | New issue (secondary binding) | `UIProvider` global listener |
| `Esc` | Close palette or dialog | palette input / `Modal` |
| `Ctrl+Alt+Space` | Toggle quick capture (desktop) | Rust global shortcut |

`C` is suppressed inside `input`, `textarea`, `select` and content-editable elements via
`isEditableTarget`. It also does not fire while the issue dialog is already open.

## In the command palette

| Keys | Action |
| --- | --- |
| `↑` / `↓` | Move the active row, wrapping at the ends |
| `Enter` | Run the active row |
| Typing | Filter; the active row resets to the first result |
| `Esc` | Close |

## In dialogs

| Keys | Action |
| --- | --- |
| `⌘/Ctrl + Enter` | Submit the issue form |
| `Esc` | Close (discards unsaved changes) |

The issue dialog focuses the title field on open. The form is keyed by issue id, so fields reset
between issues.

## On pages

| Context | Keys | Action |
| --- | --- | --- |
| Dashboard quick-add | `Enter` | Create a task due today |
| Notes tag input | `Enter` or `,` | Commit a tag |
| Notes tag input | `Backspace` (empty) | Remove the last tag |
| Search fields | typing filters immediately | — |

## Implementation notes

- Global shortcuts live in `src/lib/ui.tsx`, not in pages, so they work on every route.
- The palette owns its arrow-key handling and stops propagation so the page never scrolls.
- The issue dialog listens on its form, which also catches `⌘Enter` from the description.
- The quick-capture shortcut is registered in Rust; if it fails, the error is logged and the tray
  remains functional.

## Known gaps

- Shortcuts are not configurable.
- No chord sequences or per-page shortcut maps.
- No `⌘Z` undo yet (destructive actions use confirmation dialogs).
- No shortcuts for changing status, priority or due date directly from a row.
