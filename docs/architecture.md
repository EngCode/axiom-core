# Architecture

Orbit is a **native shell around a React application**. Rust owns the window, tray, global
shortcut and database; React owns everything you see. The two communicate through typed Tauri
commands carrying JSON.

## Stack

| Layer | Technology | Version | Role |
| --- | --- | --- | --- |
| Shell | Tauri | 2.12 | windows, tray, hotkeys, single instance, installable binary |
| Core | Rust | 1.97 | commands, SQLite access, lifecycle |
| Database | SQLite via rusqlite | 0.41 (bundled) | durable local state, WAL mode |
| UI runtime | React | 19.3 | components and rendering |
| Language | TypeScript | 5.9 | typed contract between UI and state |
| Build | Vite | 8.3 | dev server/HMR, production bundle |
| Styling | Tailwind CSS | 4.3 | utilities generated from semantic tokens |
| Routing | React Router | 7.18 | four routes, query-string filters |
| Rendering engine | WebView2 | system | renders the UI inside the native window |

No Node runtime ships with the app, and there is no bundled browser: WebView2 is already present
on Windows 10/11.

## The shape of the system

```
┌──────────────────────────── Windows ────────────────────────────┐
│ tray icon · global hotkey · windows · single instance            │
│                                                                  │
│  ┌───────────── Rust shell (src-tauri/src/lib.rs) ────────────┐  │
│  │ commands: load_state · save_state · load_library ·         │  │
│  │           save_media_item · attach_media_copy · upsert_volume │
│  │                                                            │  │
│  │  data/db.rs  ──  SQLite  %APPDATA%\com.orbit.desktop\orbit.db │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │ invoke (JSON)                     │
│  ┌────────────────────────────▼───────────────────────────────┐  │
│  │ React app (src/)                                           │  │
│  │  pages → components → store (reducer) → derive → render     │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │ debounced save                    │
│                        localStorage cache ── cross-window sync    │
└──────────────────────────────────────────────────────────────────┘
```

## Frontend flow

1. **Entry** — `src/main.tsx` asks the Tauri window label whether it is the main window or the
   capture window. Both render the same bundle; the capture window gets a minimal page.
2. **Providers** — `App.tsx` wraps routes in `AppProvider` (data + persistence) and `UIProvider`
   (overlay state + global shortcuts).
3. **Pages** read state through `useApp()` and mutate it only through intent methods
   (`addIssue`, `updateIssue`, `toggleIssueDone`, `addNote`, …).
4. **Reducer** — one reducer in `src/lib/store.tsx` owns every transition: it assigns issue keys,
   timestamps, `completedAt`, activity entries.
5. **Derived values** — `src/lib/derive.ts` computes stats, focus order, project progress and the
   weekly completion series on every render. Nothing derived is persisted.
6. **Persistence** — an effect writes the snapshot to localStorage immediately and schedules a
   SQLite save 400 ms later. A second effect hydrates from SQLite on startup.

Why this shape: the UI cannot drift from the data, there is no cache to invalidate, and swapping
storage (SQLite now, sync later) touches one adapter.

## Desktop shell

- **Startup** opens the main window. `ORBIT_START_HIDDEN=1` starts tray-only.
- **Tray menu** — Quick capture · Open Orbit · Quit.
- **Quick capture** — `Ctrl+Alt+Space` creates a frameless 560×152 window on demand; it is
  destroyed when it loses focus or on `Esc`.
- **Window lifecycle** — closing the main window **destroys** it. The tray keeps the process
  alive; opening the app again recreates the window. No hidden WebView2 processes linger.
- **Single instance** — a second launch hands off to the running process and opens the window.
- **Quit** sets a flag before exiting so the “keep running with no windows” rule does not block it.

Memory measured on this machine, production build:

| State | Working set | Private | WebView2 processes |
| --- | --- | --- | --- |
| Tray only | 31.3 MB | 5.6 MB | 0 |
| Main window open | ~356 MB total | ~226 MB | 6 |
| Release binary | 11.1 MB | — | — |

## Database

SQLite, WAL mode, `PRAGMA user_version = 1`, foreign keys on.

| Group | Tables |
| --- | --- |
| Workspace | `projects`, `issues`, `notes`, `activity`, `counters`, `meta` |
| Library | `media_kinds`, `media_items`, `volumes`, `media_copies`, `media_progress`, `tags`, `media_tags` |

Writes:
- The workspace is saved as a **whole snapshot**: delete + insert in one transaction. Exact
  mirror, simple to reason about, fine at personal scale.
- The library is written through **per-entity commands** because the scanner will produce
  thousands of copies.

Schema changes happen in `src-tauri/src/data/db.rs`: add a migration step and bump
`PRAGMA user_version`. Current version is 1.

## Build and run modes

| Mode | Command | Behaviour |
| --- | --- | --- |
| Browser dev | `pnpm dev` | Vite on 5273; no SQLite, localStorage only |
| Desktop dev | `pnpm dev` + `cargo run --manifest-path src-tauri/Cargo.toml` | window loads the dev server |
| Production | `pnpm build` + `cargo build --release --features custom-protocol` | UI embedded in the binary |

Environment overrides (development / sandboxing only):

| Variable | Effect |
| --- | --- |
| `ORBIT_DATA_DIR` | database folder instead of AppData |
| `ORBIT_WEBVIEW_DATA_DIR` | WebView2 profile folder instead of AppData |
| `ORBIT_START_HIDDEN=1` | start tray-only |

## Security boundaries

- The frontend can call only the registered commands and the permissions listed in
  `src-tauri/capabilities/default.json`.
- The app treats media volumes as **read-only**; it never renames, moves or deletes user files.
- Metadata API keys (future) will live in settings, and only titles/ids leave the machine.
- The SQLite file is plain text-free but unencrypted; OS account permissions are the boundary.

## Known constraints

- Window-open memory is dominated by WebView2; tray-only is ~31 MB.
- Whole-snapshot saves rewrite workspace tables on every change (debounced).
- No installer yet; the release binary runs from `target/release`.
- No sync, auth or export; all state is local.
- Single-window architecture: a second window always shares the same state and database.
