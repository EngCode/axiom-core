# Media library

**Status:** data layer shipped · scan/import MVP shipped · metadata and depth **planned** ·
**Sources:** [`src-tauri/src/data/db.rs`](../../src-tauri/src/data/db.rs),
[`src/lib/library-types.ts`](../../src/lib/library-types.ts),
[`src/lib/library-api.ts`](../../src/lib/library-api.ts) ·
**Spec:** [LIBRARY.md](../resources/LIBRARY.md)

The Library answers one question before any other: **“Do I already have this?”** — across games,
movies, series, anime and any kinds you add. The database and commands exist today; there is no
Library screen yet.

## Data model (shipped)

| Table | Holds |
| --- | --- |
| `media_kinds` | user-editable kinds: name, icon, colour, order, progress unit, field schema (JSON) |
| `media_items` | one title: kind, title, year, status, rating, notes, attributes (JSON), cover, provider ids |
| `volumes` | a drive: label, volume GUID, serial, capacity, mount path, type, last seen |
| `media_copies` | one file: item, volume, `rel_path`, size, quality, source, hash, seen/missing timestamps |
| `media_progress` | position/total per item (episodes, hours, pages) |
| `tags`, `media_tags` | shared vocabulary for library items (also used by notes) |

Paths are stored **relative to the volume**; drive letters are never identity. Volumes carry a GUID
plus serial/label so an unplugged drive reads as *offline*, not *missing*.

## Seeded kinds

| Key | Name | Progress unit | Example custom fields |
| --- | --- | --- | --- |
| `movies` | Movies | none | resolution |
| `series` | Series | episode | sub or dub |
| `anime` | Anime | episode | sub or dub, season count |
| `games` | Games | hour | platform, playtime |
| `books` | Books | page | author, pages |
| `music` | Music | none | artist |

Kinds are rows, not enums: renaming, reordering, hiding and adding fields are data changes, not
migrations. See the field-schema shape in [library-types.ts](../../src/lib/library-types.ts).

## Commands and bridge

| Command | Purpose |
| --- | --- |
| `load_library` | whole snapshot: kinds, items, copies, volumes, progress |
| `save_media_item` | insert or update one item (JSON attributes/providers) |
| `attach_media_copy` | insert or update one file copy |
| `upsert_volume` | insert or update a drive record |

TypeScript wrappers live in `src/lib/library-api.ts` and return an empty snapshot outside Tauri, so
the browser build stays usable.

## Lifecycle and derived states (planned)

- Status: `wishlist → downloading → acquired → in progress → completed` (or `dropped`).
- Derived, never stored: **missing** (volume online, path gone), **offline** (volume not connected),
  **duplicate** (more than one copy), **unlinked** (scanned file with no item).

## Scanning (MVP shipped)

Implemented:

- Native folder picker (`rfd`) and recursive walker with a 5,000-file budget.
- Extension classification: video/book/music; `SxxExx` switches video to `series`.
- Review list with select-all and per-file checkboxes.
- Import creates items, copies and volumes through the existing write functions.
- Volume-relative paths; duplicate detection by `volumeId + relPath`.
- Unit test for recursive scan and classification.

Not yet: volume GUID/serial identity, incremental rescans, filename parsing into season/episode/
quality, grouping episodes into one series, or a health/missing state.

## Milestones

| Milestone | Scope | State |
| --- | --- | --- |
| **M1 — Catalog** | kinds nav, item grid/table, volumes, wishlist, search, detail | partial (grid + volumes) |
| **M2 — Scanner** | volume detection, roots, walker, filename parsing, review queue, health | partial (walk + review + import) |
| **M3 — Metadata** | TMDB/IGDB fetch queue, covers, local cache, refresh | not started |
| **M4 — Depth** | episode progress, playtime, ratings, saved filters | not started |
| **M5 — Portability** | import/export, bulk edit, duplicate merge | not started |

## What exists today

- Schema v1 with foreign keys, indexes and six seeded kinds.
- Rust models, snapshot query and per-entity write functions.
- Typed frontend client and the scan commands.
- A Library page with folder scan, review, import, item grid and volume list.

## What does not exist yet

- Volume detection by GUID/serial and drive polling.
- Filename parsing into season/episode/quality and episode grouping.
- Metadata providers, covers or API keys.
- Search across the library (FTS5 is planned).
- Progress editing and derived missing/offline states.
