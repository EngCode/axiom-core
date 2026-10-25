# Notes

**Route:** `/notes` · **Deep link:** `/notes?note=<id>` · **New:** `/notes?new=1` ·
**Status:** shipped · **Source:** [`src/pages/notes.tsx`](../../src/pages/notes.tsx)

A two-pane writing surface: a searchable list on the left, a distraction-free editor on the right.
Everything is saved as you type — there is no save button.

## List pane

- **Order:** pinned notes first, then by `updatedAt` descending.
- **Search:** matches title, content and tags, case-insensitive; while searching the list is
  filtered live and shows “No notes match that search.” when empty.
- **Item:** pin marker, title, an 80-character excerpt, up to two tags and a relative timestamp.
- **New note:** the `+` button (and header action) creates “Untitled note” and selects it.

## Editor pane

| Element | Behaviour |
| --- | --- |
| Header status | “Pinned” or “Note”, plus `saved <relative time>` |
| Project select | assigns the note to a project or leaves it unassigned |
| Pin | toggles pinned state (affects list ordering) |
| Delete | confirms, deletes, then selects the next note or clears the selection |
| Title | single-line, serif display type |
| Tags | chips with a remove button; `+ tag` input accepts `Enter` or `,` |
| Content | plain text, auto-growing height, per-keystroke save |

Tag editing details:

- `Enter` or `,` commits the typed tag (leading `#` stripped, duplicates removed).
- `Backspace` with an empty input removes the last tag.
- The project selector is in the editor header on wide screens.

## Creating, selecting and deleting

- New notes are created immediately with an empty body and “Untitled note”.
- Selection is URL-driven (`?note=<id>`) so a note can be linked and reopened.
- `/notes?new=1` creates a note once, then replaces the URL with the new note id. A ref guard
  prevents React Strict Mode from creating two notes.
- Deleting the last note shows the empty editor state with a create action.

## Empty states

- No notes at all: list shows “No notes yet.”, editor shows “Start your first note”.
- No notes for the current search: list message only.

## Data

Notes live in `AppState.notes`; edits go through `updateNote`, which also refreshes `updatedAt`.
The note body is plain text in this version — no Markdown rendering, attachments or backlinks.

## Known gaps

- No Markdown or rich text, no checklists or slash commands.
- No backlinks, wiki links, or note ↔ task conversion.
- No export, folder hierarchy, or note history.
- Search is a substring match, not a full-text index.
