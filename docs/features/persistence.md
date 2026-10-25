# Persistence

**Status:** shipped · **Sources:** [`src-tauri/src/data/db.rs`](../../src-tauri/src/data/db.rs),
[`src-tauri/src/data/models.rs`](../../src-tauri/src/data/models.rs),
[`src/lib/db.ts`](../../src/lib/db.ts), [`src/lib/store.tsx`](../../src/lib/store.tsx)

Workspace state is mirrored into SQLite and cached in localStorage. The database is the durable
store; localStorage is the instant-start cache and the channel between windows.

## Where data lives

| Store | Location | Purpose |
| --- | --- | --- |
| SQLite | `%APPDATA%\com.axiom.core\axiom.db` | durable workspace + library |
| localStorage | WebView2 profile, key `axiom.state.v1` | instant start, cross-window sync, browser mode |

Development overrides: `AXIOM_DATA_DIR` (database folder) and `AXIOM_WEBVIEW_DATA_DIR` (WebView2
profile). Both exist for sandboxed/dev launches; normal installs never set them.

## Database

- SQLite in **WAL** mode, foreign keys on, `PRAGMA user_version = 1`.
- Workspace tables: `projects`, `issues`, `notes`, `activity`, `counters`, `meta`.
- Library tables: `media_kinds`, `media_items`, `volumes`, `media_copies`, `media_progress`,
  `tags`, `media_tags` (see [media-library.md](media-library.md)).

## Write path

```
UI action
  → reducer (new AppState)
  → effect: localStorage.setItem immediately
  → 400 ms debounce
  → invoke('save_state', { state })
  → Rust: one transaction: delete + insert projects/issues/notes/activity,
          upsert counters and meta (theme, sidebarCollapsed, initialized)
```

The workspace is saved as a **whole snapshot**, which keeps the DB an exact mirror and avoids
partial updates. Library entities are written separately by their own commands because the scanner
will produce many rows.

## Read path

1. On mount, `AppProvider` initialises from localStorage (synchronous, no spinner).
2. A second effect calls `load_state` in Tauri. If the database has data (`meta.initialized = 1`),
   the result replaces state; the theme id is normalised (`dark` → `axiom`, `light` → `paper`).
3. If the database is empty, `load_state` returns `null` and the seed state is written by the save
   effect — that is how a fresh install gets its demo workspace.

## Cross-window sync

The main window and quick capture share the same WebView2 origin. Every state change writes
localStorage, which fires a `storage` event in the other window; that window dispatches
`state/replace` with the normalised theme. This keeps capture → dashboard updates live without IPC.

## Reset

Sidebar → **Reset demo data** (confirmed) dispatches `state/reset`, which rebuilds the seed state;
the normal save path then overwrites both stores. Deleting `axiom.db` while the app is closed has
the same effect on next launch.

## Failure behaviour

- `invoke` failures are logged in the console and swallowed; the UI keeps working from memory and
  localStorage.
- If the process is killed within the 400 ms debounce, the last change may not reach SQLite. On the
  next launch SQLite wins, so the tail of an unsaved edit can be lost.
- Two windows writing whole snapshots is last-writer-wins; a simultaneous edit in both could drop
  one side. Granular workspace commands will remove this limitation.

## Legacy data

This release was previously called **Orbit**. Migration is automatic:

- localStorage falls back from `axiom.state.v1` to `orbit.state.v1` and rewrites the new key.
- the database renames `orbit.db` (and its `-wal` / `-shm` files) to `axiom.db` on first start.
- environment overrides prefer `AXIOM_DATA_DIR` / `AXIOM_WEBVIEW_DATA_DIR` / `AXIOM_START_HIDDEN`
  and still accept the old `ORBIT_*` names.
- legacy theme ids `orbit` and `dark` map to `axiom`.
## Verification performed

- Schema and data inspected directly: 4 projects, 17 issues, 5 notes, 6 activity rows, 6 media
  kinds, `user_version = 1`, WAL journal.
- Hydration tested by setting `theme = light` in the database, restarting: the app started in light
  mode, proving SQLite (not the seed) was read. The theme was restored afterwards.

## Known gaps

- No export/import, automatic backups or encryption.
- No per-entity workspace writes (whole snapshot only).
- No sync or multi-device support.
- Activity history is capped at 60 entries.
