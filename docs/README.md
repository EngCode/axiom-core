# Axiom Core documentation

Axiom Core is a personal workspace and media library for Windows: tasks, projects and notes in one
keyboard-first interface, wrapped in a native Tauri shell with a local SQLite database.

This folder explains **what exists**, **where it lives**, and **what is still planned**. Every
page and feature has its own document; the product-level specs live in
[resources](resources/SPEC.md).

## Start here

| Document | What it answers |
| --- | --- |
| [Project structure](project-structure.md) | Which folder or file owns which concern |
| [Architecture](architecture.md) | The stack, data flow, persistence and desktop shell |
| [Pages](pages/dashboard.md) | What each screen does and which features it contains |
| [Features](features/command-palette.md) | Behaviour of each cross-cutting feature |
| [Product spec](resources/SPEC.md) | Vision, scope, roadmap, open questions |
| [Library spec](resources/LIBRARY.md) | Media module: kinds, categories, copies, volumes, scanning |
| [Design system](resources/DESIGN.md) | Tokens, themes, components, change recipes |
| [Core API](resources/CORE-API.md) | Versioned read and issue mutation API |
| [Local API](resources/LOCAL-API.md) | Connect an external AI client over localhost |
| [Backup](features/backup.md) | Export/import the workspace, covers and attachments |

## Pages

| Route | Page | Document | Primary features |
| --- | --- | --- | --- |
| `/` | Dashboard | [dashboard.md](pages/dashboard.md) | greeting, stats, focus list, quick add, projects, week chart, recent notes, activity |
| `/issues` | Issues | [issues.md](pages/issues.md) | status groups, filters, search, inline complete, edit dialog |
| `/issues?project=<id>` | Project-scoped issues | [issues.md](pages/issues.md) | same list filtered to one project |
| `/projects` | Projects | [projects.md](pages/projects.md) | progress cards, create, archive, restore, per-project task |
| `/projects/:id` | Project detail | [project-detail.md](pages/project-detail.md) | stats, overview, issues, planned milestones/documents |
| `/notes` | Notes | [notes.md](pages/notes.md) | note list, search, editor, tags, pin, autosave |
| `/notes?note=<id>` | Note deep link | [notes.md](pages/notes.md) | opens a specific note |
| `/documents` | Documents | [documents.md](pages/documents.md) | planned long-form pages; status surface only |
| `/library` | Library | [library.md](pages/library.md) | category tree, search, filters, paginated grid, item drawer, rebuild |
| `/tools` | Tools catalog | [tools.md](pages/tools.md) | searchable categories, recent tools |
| `/tools/:id` | Tool workspace | [tools.md](pages/tools.md) | local image resize, convert, tint, palette |
| `/user` | User | [settings.md](pages/settings.md) | profile, appearance, Local API, backup, help, local data |
| *(desktop window)* | Quick capture | [quick-capture.md](features/quick-capture.md) | global hotkey, one-line capture |

Unknown routes redirect to the dashboard.

## Features

| Feature | Status | Document | Main code |
| --- | --- | --- | --- |
| Command palette (`⌘K`) | shipped | [command-palette.md](features/command-palette.md) | `src/components/command-palette.tsx` |
| Issue create/edit dialog | shipped | [issue-dialog.md](features/issue-dialog.md) | `src/components/issue-dialog.tsx` |
| Quick capture (global hotkey) | shipped, minimal | [quick-capture.md](features/quick-capture.md) | `src-tauri/src/lib.rs`, `src/pages/quick-capture.tsx` |
| Themes and design tokens | shipped | [themes.md](features/themes.md) | `src/index.css`, `src/lib/themes.ts` |
| Persistence (SQLite + cache) | shipped | [persistence.md](features/persistence.md) | `src-tauri/src/data/`, `src/lib/db.ts` |
| Keyboard model | shipped | [keyboard.md](features/keyboard.md) | `src/lib/ui.tsx`, components |
| Media library | v2 shipped | [media-library.md](features/media-library.md) | `src-tauri/src/library_scan.rs`, `src-tauri/src/library_db.rs`, `src/pages/library.tsx` |
| Documents | shipped | [documents.md](pages/documents.md) | `src/pages/documents.tsx`, `src/components/document-list.tsx` |
| In-app documentation | shipped | [in-app-docs.md](features/in-app-docs.md) | `src/pages/docs.tsx`, `src/lib/docs.ts` |
| Personalization | shipped | [personalization.md](features/personalization.md) | `src/lib/identity.ts`, `src/pages/settings.tsx` |
| Project workspace | shipped | [project-detail.md](pages/project-detail.md) | `src/pages/project-detail.tsx`, `src/lib/actions.ts` |
| Installer | CI releases | [installer.md](features/installer.md) | `.github/workflows/release.yml`, `src-tauri/tauri.conf.json`, `src-tauri/resources/seed/` |
| Core API v1 | shipped | [CORE-API.md](resources/CORE-API.md) | `src-tauri/src/data/api.rs`, `src/lib/core-api.ts` |
| Local API | shipped | [LOCAL-API.md](resources/LOCAL-API.md) | `src-tauri/src/http_api.rs`, `src/lib/local-api.ts` |
| Backup & restore | shipped | [backup.md](features/backup.md) | `src-tauri/src/backup.rs`, `src/lib/backup.ts` |
| Settings & appearance | shipped | [settings.md](pages/settings.md) | `src/pages/settings.tsx`, `src/lib/appearance.ts` |

Status vocabulary used throughout the docs:

- **shipped** — works in the current build.
- **partial** — works, with known gaps listed in the document.
- **planned** — designed, not implemented.
- **exploration** — a mockup or idea only.

## Reading order for new work

1. [Architecture](architecture.md) — understand where state and effects live.
2. The page document you are changing.
3. The relevant feature documents.
4. The [design system](resources/DESIGN.md) before changing any visual.
5. The [product spec](resources/SPEC.md) and [library spec](resources/LIBRARY.md) before adding scope.
