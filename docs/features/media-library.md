# Media library

**Status:** data layer shipped · UI, scanner and metadata **planned** ·
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

## Scanning (planned)

The flow is specified in [LIBRARY.md §6](../resources/LIBRARY.md): choose roots per volume, walk
the tree read-only, parse filenames into title/season/episode/quality, group files, match to items,
and send ambiguous files to a review queue. Rescans are incremental and idempotent. The database
already supports everything the scanner needs.

## Milestones

| Milestone | Scope | State |
| --- | --- | --- |
| **M1 — Catalog** | kinds nav, item grid/table, volumes, wishlist, search, detail | not started |
| **M2 — Scanner** | volume detection, roots, walker, filename parsing, review queue, health | not started |
| **M3 — Metadata** | TMDB/IGDB fetch queue, covers, local cache, refresh | not started |
| **M4 — Depth** | episode progress, playtime, ratings, saved filters | not started |
| **M5 — Portability** | import/export, bulk edit, duplicate merge | not started |

## What exists today

- Schema v1 with foreign keys, indexes and six seeded kinds.
- Rust models, snapshot query and per-entity write functions.
- Typed frontend client that compiles and can call the commands.
- Verified empty library tables in the live database.

## What does not exist yet

- Any Library UI or navigation.
- Volume detection / drive polling.
- File scanning and filename parsing.
- Metadata providers, covers or API keys.
- Search across the library (FTS5 is planned).
