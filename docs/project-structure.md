# Project structure

Orbit is two applications in one repository: a React frontend and a Rust/Tauri desktop shell.
Both live side by side so the UI can be developed in a browser and shipped inside the desktop app.

```text
personal-manager/
├── index.html                 Vite entry, first-paint theme script
├── package.json               frontend scripts and dependencies
├── vite.config.ts             dev server (5273, strict), React + Tailwind plugins
├── tsconfig.json              strict TypeScript config, `@/` alias → src/
├── pnpm-workspace.yaml        hoisted/copy install layout for Windows
├── README.md                  how to run the project
│
├── src/                       the React application
│   ├── main.tsx               entry: main window or quick-capture window
│   ├── App.tsx                providers, routes, global overlays
│   ├── index.css              design tokens, themes, base styles, motion
│   │
│   ├── pages/                 one file per route
│   │   ├── dashboard.tsx      /
│   │   ├── issues.tsx         /issues
│   │   ├── projects.tsx       /projects
│   │   ├── notes.tsx          /notes
│   │   ├── quick-capture.tsx  desktop capture window
│   │   └── docs.tsx           /docs reference viewer
│   │
│   ├── components/            shell, primitives and domain components
│   │   ├── app-shell.tsx      sidebar + topbar + scroll container
│   │   ├── sidebar.tsx        navigation, projects, theme picker, reset
│   │   ├── topbar.tsx         breadcrumb, search, new issue, theme, avatar
│   │   ├── ui.tsx             Button, Input, Select, Card, Modal, Progress, …
│   │   ├── theme-picker.tsx   theme menu
│   │   ├── issue-row.tsx      one task row
│   │   ├── issue-bits.tsx     status/priority icons, chips, pickers
│   │   ├── issue-dialog.tsx   create/edit task dialog
│   │   ├── markdown.tsx       dependency-free docs renderer
│   │   └── command-palette.tsx  ⌘K palette
│   │
│   └── lib/                   state, logic and adapters
│       ├── types.ts           AppState, Issue, Project, Note, Activity
│       ├── data.ts            seed workspace, storage key, workspace identity
│       ├── meta.ts            status/priority/project vocabularies
│       ├── derive.ts          stats, focus scoring, progress, week series
│       ├── utils.ts           dates, due labels, formatting, `cn()`
│       ├── themes.ts          theme registry and legacy mapping
│       ├── store.tsx          reducer, intent methods, persistence effects
│       ├── ui.tsx             overlay state and global shortcuts
│       ├── docs.ts            markdown library, sections, link resolution
│       ├── db.ts              Tauri ↔ SQLite bridge for the workspace
│       ├── library-types.ts   media entity types
│       ├── library-api.ts     media commands bridge
│       └── tauri.ts           `isTauri()` environment check
│
├── src-tauri/                 the desktop shell and Rust core
│   ├── Cargo.toml             tauri, plugins, rusqlite, release profile
│   ├── tauri.conf.json        product name, windows, build hooks, bundle icons
│   ├── capabilities/          what the webview may call
│   ├── icons/                 app and tray icons
│   └── src/
│       ├── main.rs            Windows entry point
│       ├── lib.rs             tray, hotkey, windows, commands, lifecycle
│       └── data/
│           ├── models.rs      serde models shared with the frontend
│           └── db.rs          schema, migrations, queries, writes
│
├── docs/                      documentation (this folder)
│   ├── README.md              index
│   ├── project-structure.md   this file
│   ├── architecture.md        stack and data flow
│   ├── pages/                 one document per screen
│   ├── features/              one document per feature
│   ├── resources/             product, library and design specs
│   └── *.png                  rendered previews and design directions
│
├── design/                    static HTML explorations (not shipped)
│   ├── paper.html
│   └── terminal.html
│
└── public/                    static assets (favicon)
```

## Where does a change belong?

| You want to… | Start here |
| --- | --- |
| Add or change a screen | `src/pages/` + route in `src/App.tsx` + sidebar in `src/components/sidebar.tsx` |
| Add a reusable control | `src/components/ui.tsx`, documented in `docs/resources/DESIGN.md` |
| Change how tasks are created/updated | `src/lib/store.tsx` (reducer + intent methods) |
| Change derived numbers (counts, focus, progress) | `src/lib/derive.ts` |
| Add a field to tasks, notes or projects | `src/lib/types.ts` → reducer → `src-tauri/src/data/models.rs` → SQLite migration in `db.rs` |
| Add a theme | `src/index.css` + `src/lib/themes.ts` |
| Add an OS feature (tray, hotkey, notification, file access) | `src-tauri/src/lib.rs`, then a command and a bridge in `src/lib/` |
| Change the database schema | `src-tauri/src/data/db.rs`: add a migration step, bump `PRAGMA user_version` |
| Document a page or feature | `docs/pages/` or `docs/features/`, then link it from `docs/README.md` |

## Conventions

- **Routes** are kebab-case paths; filters and selections travel in the query string.
- **Components** are PascalCase files only when they are large (shell, dialog, palette); small
  primitives stay in `ui.tsx`.
- **State changes** go through `useApp()` intent methods, never through direct object mutation.
- **Derived values** are computed in `derive.ts`, not stored in the state.
- **Paths** are stored relative to a volume; absolute paths are resolved at use time.
- **Docs** keep the four statuses — shipped, partial, planned, exploration — and link to code.
