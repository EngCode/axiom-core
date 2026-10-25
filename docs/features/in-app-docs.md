# In-app documentation

**Status:** shipped · **Route:** `/docs` (deep link `?doc=<slug>`) ·
**Sources:** [`src/pages/docs.tsx`](../../src/pages/docs.tsx),
[`src/lib/docs.ts`](../../src/lib/docs.ts),
[`src/components/markdown.tsx`](../../src/components/markdown.tsx)

The documentation in `docs/` is bundled into the app and readable offline from the **Docs** item
in the sidebar, or from the command palette.

## How content gets in

At build time Vite imports every markdown file as raw text:

```ts
import.meta.glob('/docs/**/*.md', { query: '?raw', import: 'default', eager: true })
```

Each file becomes a document with:

| Property | Source |
| --- | --- |
| `slug` | path under `docs/`, without `.md` (`pages/issues`) |
| `title` | first `#` heading, or a prettified filename |
| `section` | folder: `pages/`, `features/`, `resources/`; root files → Project; `README` → Overview |
| `order` | a fixed list in `docs.ts`, unknown files after it |

Adding a page or feature document is therefore just adding a `.md` file under `docs/` — it shows
up in the sidebar and becomes linkable without code changes.

## Navigation

- **Sidebar** — searchable list grouped by section, active document highlighted.
- **Search** — filters on title and full markdown content, live.
- **Deep links** — `/docs?doc=features/quick-capture`; the browser back button walks through
  documents.
- **Command palette** — Pages → *Documentation*.
- **Links inside documents** — relative `.md` links navigate within the viewer; external URLs open
  in a new tab; links to source files are rendered as code (not navigation traps).
- **Scroll position** resets when switching documents.

## Markdown support

[`markdown.tsx`](../../src/components/markdown.tsx) is a small dependency-free renderer. It renders
React elements (never raw HTML) and supports:

- headings with anchor ids, paragraphs, bold, italics, inline code
- fenced code blocks with a language label
- ordered and unordered lists, nested by indentation
- tables with headers
- blockquotes, horizontal rules
- images, resolved from `docs/**/*.png` through Vite's asset pipeline
- relative links between documents, external links, and in-page anchors

Not supported: raw HTML, footnotes, task lists, syntax highlighting, Mermaid.

## Why not a markdown library

The documentation needs a narrow, well-known subset and must work inside the Tauri webview without
extra runtime dependencies. A ~250-line renderer keeps the bundle small and renders through React,
so there is no `dangerouslySetInnerHTML` and no sanitisation gap. If requirements grow (footnotes,
syntax highlighting), swapping in `react-markdown` only touches this component.

## Testing

- `tsc --noEmit` and a production build both include the docs glob.
- Rendered `/docs` and `/docs?doc=pages/issues` in headless Chrome to verify layout, tables, code
  chips, nested links and section grouping.
- All relative links in the markdown set were checked against the filesystem.

## Known gaps

- No “edit this document” or search highlighting.
- No table of contents rail for long documents.
- Search is a substring match, not ranked.
- Docs are read-only and refresh only with a new build.
