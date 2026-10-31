# Media library

**Status:** v2 shipped — series grouping, categories, paginated reads, rebuild flow ·
**Sources:** [`src-tauri/src/library_scan.rs`](../../src-tauri/src/library_scan.rs),
[`src-tauri/src/library_db.rs`](../../src-tauri/src/library_db.rs),
[`src-tauri/src/data/db.rs`](../../src-tauri/src/data/db.rs),
[`src/lib/library-types.ts`](../../src/lib/library-types.ts),
[`src/lib/library-api.ts`](../../src/lib/library-api.ts) ·
**Spec:** [LIBRARY.md](../resources/LIBRARY.md) ·
**Page:** [library.md](../pages/library.md)

The Library answers one question before any other: **“Do I already have this?”** — across movies,
series and any kinds you add. Version 2 changes the unit of the index: **one entry per title**, not
one per episode or season. A 55-series tree with 4,000 episode files becomes 55 cards with season
and episode counts, and the page only loads the slice it is showing.

## Data model (schema v2)

| Table | Holds |
| --- | --- |
| `media_kinds` | user-editable kinds: key, name, icon, colour, order, progress unit, field schema (JSON) |
| `media_categories` | user-editable categories: key, name, order, hidden, `applies_to` kind keys (JSON) |
| `media_items` | one title: kind, category, title, year, status, rating, notes, attributes, cover, provider ids, aggregates |
| `volumes` | a drive: label, volume GUID, serial, capacity, mount path, type, last seen |
| `scan_roots` | a folder the scanner owns: path, kind, default category, depth, last scan |
| `scan_runs` | history of rebuilds: start/finish, roots, imported items/copies, status, message |
| `media_copies` | one file: item, volume, `rel_path`, size, quality, source, hash, season/episode, seen/missing timestamps |
| `media_progress` | position/total per item (episodes, hours, pages) |
| `tags`, `media_tags` | shared vocabulary for library items (also used by notes) |

`media_items` carries the aggregates the grid reads:

| Column | Meaning |
| --- | --- |
| `category_id` | real indexed foreign key to `media_categories` |
| `external_key` | scanner identity; unique per kind, so rescans update instead of duplicate |
| `folder_path` / `primary_path` | where the title lives; used for opening and display |
| `copy_count` | number of indexed files |
| `season_count` / `episode_count` | distinct seasons and known episodes |
| `total_size_bytes` | sum of the files |

Indexes cover `kind_id`, `status`, `title` and the browse path
`(kind_id, category_id, sort_title)`. Per-file copies are only read for the item drawer, never for
the grid.

Paths are stored **relative to the volume**; drive letters are never identity. Volumes carry a GUID
plus serial/label so an unplugged drive can later read as *offline*, not *missing*.

## Categories

Categories are **rows, not enums**. The v2 seed:

| Key | Name | Applies to |
| --- | --- | --- |
| `english` | English | `["movies","series"]` |
| `arabic` | Arabic | `["movies","series"]` |
| `anime` | Anime | `["movies","series"]` |

`applies_to` is why Anime appears under both Movies and Series without being a kind. Adding
Korean, Turkish or Documentary later is one insert. Hiding a category is a flag; nothing is
hard-deleted.

The migration retires the old `kind-anime`: it hides that kind and moves its rows to
`kind-series` + `cat-anime`. Fresh databases never create `kind-anime` at all.

## Seeded kinds

| Key | Name | Progress unit | Example custom fields |
| --- | --- | --- | --- |
| `movies` | Movies | none | resolution |
| `series` | Series | episode | sub or dub |
| `games` | Games | hour | platform, playtime |
| `books` | Books | page | author, pages |
| `music` | Music | none | artist |

Kinds remain data: renaming, reordering, hiding and adding fields are row edits, not migrations.
The v2 scanner writes `kind-movies` or `kind-series`; the other kinds are seeded for later
classifiers.

## Scanning

A scan is an **indexing pass over registered roots**. It reads; it never renames, moves or deletes
anything.

1. **Roots define intent.** Each root stores a folder, a kind (`movies`, `series`, `games`, `books`,
   `music` or `auto`), a default category and a depth.
2. **The walker** descends the tree, skipping hidden/system names and ignored folders (`Subs`,
   `Sample`, `Extras`, `Featurettes`, `Trailers`, `Artwork`, …). Limits: 60,000 files and 12 levels.
3. **Classification** by extension: video, book or music. With `auto`, a video whose name matches
   `SxxExx` or `1x03` becomes a series; everything else is a movie. A root kind overrides the
   shape: `movies` never creates episodes, `series` expects them.
4. **Grouping** collapses files into titles (see below).
5. **Category detection** looks for language buckets in the path (`English`, `Arabic`/`عربي`,
   `Anime`/`Animation`/`Cartoons`). A detected bucket overrides the root's default category.
6. **Import** writes one `media_items` row per title, one `media_copies` row per file and one
   `volumes` row per root. Runs are recorded in `scan_runs`.

### Series grouping

| Signal | Examples |
| --- | --- |
| Season folder | `Season 2`, `S02`, `Seassion 02`, `Season 03 Part 2` |
| Suffix on the show folder | `Show S2`, `Arcane S2`, `Dr. Stone Season 3` |
| Ordinal season | `Yakusoku no Neverland 2nd Season` |
| Specials | `Special 2017`, `Specials`, `OVA`, `Movies` inside a show folder |
| Episode patterns | `S02E05`, `2x05`, `Episode 5`, trailing `- 05` |

Rules:

- A show is named after its **own folder**, never after `English`, `Action` or an actor bucket.
- Whole-season folders are popped before naming; a season suffix on the show folder is split off,
  so `Arcane S2` and `Arcane S3` collapse into **Arcane**.
- Sequels stored in separate folders (`Show 2nd Season`) map to season 2 of the same title.
- Season 0 is labelled **Specials**; named specials keep their label.
- `Movies/` inside a show folder is not absorbed into the series — movie-shaped files are imported
  as Movies.

### Movie grouping

- `English/Action/Infinite.2021/Infinite.mkv` → one film, title from the folder.
- A folder with several videos (`Star Wars/`, `RoboCop/`) is a **collection**: each file is its own
  entry, titled from the filename.
- Year-only files (`RoboCop/2014.mkv`) take the folder title and the filename year.
- `CD1`, `Disc 2`, `Part 3` are continuations, not titles.

### Title cleanup

Extensions are removed only for media types, so `Dr. Stone` and `Mr. Robot` keep their dots.
Square-bracket groups are stripped, release tags cut the rest of the name
(`1080p`, `WEB-DL`, `x265`, `DDP`, site tags, …), and a trailing year becomes the year rather than
part of the title. Trailers, samples and featurettes are skipped entirely.

### Stable ids

Every title gets an FNV-1a id derived from its grouping identity (kind + root-relative identity).
Rescans update the same rows, which is what lets the rebuild restore user fields.

## Rebuild flow

The only library write path is `library_rebuild`, exposed as **Rebuild** on the page:

1. **Plan** — read roots, category keys and scan every root into groups without touching the
   database.
2. **Dry run** — `library_rebuild_preview` returns per-root counts, groups, total files/size,
   episode count and warnings. It writes nothing. A warning means a root is offline or unreadable;
   the dry run is still shown, but **Rebuild now** is disabled until the root is back or removed.
3. **Backup** — `VACUUM INTO <data dir>/backups/axiom-before-rebuild-<timestamp>.db`. This is a
   clean database copy, not a copy of a live WAL file. A rebuild with any root warning is refused
   before the backup is written, so an unplugged drive can never empty the index.
4. **Replace the index** — inside one transaction: capture per-item user fields (status, rating,
   notes, cover, original title, provider ids), delete `media_copies` then `media_items`, import
   the new groups, restore user fields by item id, update `scan_roots.last_scan_at` and append a
   `scan_runs` row. Either the whole rebuild commits or nothing changes.
5. **Report** — imported/removed items and copies, duration and the backup path.

Workspace tables are not touched. If a title's grouping identity changes (renamed folder, moved
root), its id changes and user fields cannot be matched; the backup is the recovery path.

## Commands and bridge

| Command | Purpose |
| --- | --- |
| `pick_media_folder` | native folder picker for a new root |
| `library_categories` | list categories |
| `library_roots` / `save_scan_root` / `delete_scan_root` | manage scan roots |
| `library_overview` | totals, kinds, category counts (`byKind`), volumes, roots |
| `library_query` | one page of title cards; filters, sort and pagination run in SQLite |
| `library_item` | one title with seasons and per-file copies |
| `library_set_cover` | set or clear an item's poster |
| `library_recent_runs` | recent rebuild history |
| `library_rebuild_preview` | dry run |
| `library_rebuild` | backup, rescan and replace the index |

TypeScript wrappers live in `src/lib/library-api.ts` and return empty data outside Tauri, so the
browser build stays usable.

## Performance model

- **Server-side pagination.** `library_query` receives `kind`, `category`, `status`, `search`,
  `sort` (`title`, `recent`, `size`, `episodes`), `page` and `pageSize`; it returns cards plus
  `total`, `page`, `pageSize` and `pageCount`.
- **Aggregates only.** The grid query joins kinds and categories but never loads copies.
- **Isolation.** The library is not in the workspace snapshot, `AppState` or `localStorage`, so
  thousands of indexed files do not slow notes, documents or app startup.
- **Off the UI thread.** Scanning, backup and import run in an async command; the page shows a
  running state and reloads the overview when done.
- **SQLite scratch in memory.** `temp_store = MEMORY` avoids `SQLITE_CANTOPEN` when the OS temp
  folder is locked down during a large import.

## Local API

Read-only routes mirror the bridge; see [LOCAL-API.md](../resources/LOCAL-API.md):

| Method | Route |
| --- | --- |
| GET | `/v1/library/overview` |
| GET | `/v1/library/categories` |
| GET | `/v1/library/roots` |
| GET | `/v1/library/runs` |
| GET | `/v1/library/items?kind=&category=&status=&search=&sort=&page=&pageSize=` |
| GET | `/v1/library/items/{id}` |

## Lifecycle and derived states (planned)

- Status: `wishlist → downloading → acquired → in progress → completed` (or `dropped`).
- Derived, never stored: **missing** (volume online, path gone), **offline** (volume not
  connected), **duplicate** (more than one copy), **unlinked** (scanned file with no item).

The v2 UI shows and preserves `status` but does not edit it yet.

## Milestones

| Milestone | Scope | State |
| --- | --- | --- |
| **M1 — Catalog** | kinds nav, item grid, volumes, wishlist, search, detail | partial — grid, categories, detail, covers |
| **M2 — Scanner** | roots, walker, filename parsing, grouping, rebuild, health | shipped — roots, parsing, series grouping, rebuild |
| **M3 — Metadata** | TMDB/IGDB fetch queue, covers, local cache, refresh | partial — manual covers only |
| **M4 — Depth** | episode progress, playtime, ratings, saved filters | not started |
| **M5 — Portability** | import/export, bulk edit, duplicate merge | not started |

## What exists today

- Schema v2 with categories, scan roots, scan history, aggregates and browse indexes.
- Scanner v2 with season/title parsing, collection handling, category detection and stable ids.
- Idempotent rebuild with automatic backup and user-field restoration.
- Server-side paginated query, item detail and read-only HTTP routes.
- A Library page with a Movies/Series → English/Arabic/Anime tree, search, filters, pager,
  poster drawer and rebuild/roots dialogs.

## What does not exist yet

- Volume detection by GUID/serial and drive polling.
- Incremental scans; every update is a full rebuild.
- Metadata providers, automatic posters from the network or API keys.
- Progress/status/rating/notes editing from the drawer.
- Saved filters and a category editor UI.
- Derived missing/offline/duplicate health views.
