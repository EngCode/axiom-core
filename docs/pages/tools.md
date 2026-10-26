# Tools

**Routes:** `/tools` catalog · `/tools/:toolId` workspace ·
**Status:** image utilities shipped ·
**Sources:** [`src/pages/tools.tsx`](../../src/pages/tools.tsx),
[`src/pages/tool-workspace.tsx`](../../src/pages/tool-workspace.tsx),
[`src/lib/tools.ts`](../../src/lib/tools.ts)

Tools are local utilities for design and development — not profile or app settings. The catalog is
built to grow: every tool has an id, category, description and its own route.

## Catalog

- Search across name, description and keywords.
- Category filters (Image, Colour) with counts.
- Recently opened tools, stored in `localStorage` (`axiom.tools.recent`).
- Cards link to `/tools/<id>`; unknown ids render a not-found state.

## Shipped tools

| Tool | Category | What it does |
| --- | --- | --- |
| **Resize** | Image | width/height with locked aspect ratio and 25/50/75/100 % presets |
| **Convert** | Image | PNG, JPEG and WebP output with quality for lossy formats |
| **Tint** | Colour | colour wash with adjustable strength |
| **Palette** | Colour | extracts dominant colours and copies hex values |

Processing runs in a canvas in the WebView. Files never leave the machine.

## Adding a tool

1. Add a `ToolDefinition` to `TOOLS` in `src/lib/tools.ts` (id, name, category, keywords, icon).
2. If it is an image tool, add a mode to `ToolControls` and `applyTool` in the workspace.
3. If it is a different kind of tool, add a workspace branch keyed by tool id.
4. The catalog, search, filters, recent list and top-bar title read from the registry; no extra
   navigation code.

## Next

- Batch processing and saved presets.
- Contrast checker, SVG optimiser, pattern generator.
- Tool-specific recent files (paths only, no uploads).
