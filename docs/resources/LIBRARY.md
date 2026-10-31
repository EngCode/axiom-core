# Axiom Core Library — media module specification

**Status:** v2 implemented — series grouping, categories, paginated reads, rebuild flow · 
**Parent spec:** [SPEC.md](SPEC.md) · **Last updated:** 2026-10-31

The Library answers one question first: **"Do I already have this?"** — for games, movies,
series, anime, and any other kind of media you decide to track. Everything else (covers,
metadata, progress) exists to make that answer fast and trustworthy.

## 1. Why this module exists

Re-downloading something you already own is the failure mode. It happens because ownership is
spread across drives, folders, naming conventions and memory. The Library replaces memory with
an index: every title has a state, and every file has a path, a size and a volume.

## 2. Product shape

One app, two areas. The sidebar gains a **Library** section; the Plan area (tasks, projects,
notes) is unchanged.

- **Library** — grid or table of everything, filtered by kind, category, status, tags, volume.
- **Kind view** — e.g. *Movies*, *Series*; the category branch underneath splits English, Arabic
  and Anime without making Anime a separate kind.
- **Item detail** — cover, metadata, status, progress, notes, copies (paths, sizes, quality),
  rating, tags.
- **Wishlist** — what you still want, separate from what you own.
- **Health** — missing files, duplicates, unlinked copies, storage per volume.
- **Scan review** — the queue of files the scanner could not match to an item (planned; v2
  imports grouped titles directly).

Dashboard additions: *Continue playing / watching*, *Recently added*, *Library health* count.

## 3. Dynamic kinds and categories

Kinds are **data, not enums**. Movies, Series, Games, Books and Music ship as editable examples;
any kind can be added, renamed, recoloured, hidden, or extended with custom fields. **Anime is not
a kind** — it is a category applied to Movies and Series.

```ts
interface MediaKind {
  id: string
  key: string            // stable slug, e.g. 'movies'
  name: string           // display name, editable
  icon: string           // lucide icon name
  color: string          // token name
  sortOrder: number
  builtIn: boolean       // seeded kinds can be hidden, not hard-deleted
  hidden: boolean
  progress: {
    unit: 'episode' | 'hour' | 'page' | 'none'
    showTotal: boolean
  }
  fields: KindField[]    // custom fields, rendered generically
}

interface KindField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'multi' | 'boolean' | 'url'
  options?: string[]     // for select / multi
  required?: boolean
  showInList?: boolean   // column in table view
}
```

Categories are a second data layer, stored in `media_categories`:

```ts
interface MediaCategory {
  id: string
  key: string            // e.g. 'english', 'arabic', 'anime'
  name: string
  sortOrder: number
  hidden: boolean
  appliesTo: string[]    // kind keys, e.g. ['movies', 'series']
}
```

The seed ships English, Arabic and Anime for Movies + Series. Adding Korean, Turkish or
Documentary is an insert, never a schema migration. `appliesTo` is what lets the same category
appear under two kinds while the grid still scopes by `kind + category`.

**Why this shape:** core columns (title, year, status, rating, tags, progress) are real columns
so search, sort and filters stay fast; kind-specific facts live in a JSON `attributes` object
validated by the kind's field schema. Adding a field or a kind never needs a database migration —
which is the whole point of making types dynamic.

Examples of per-kind fields:

| Kind | Fields |
| --- | --- |
| Games | platform (select), playtime hours (number), launcher/store (select), modded (boolean) |
| Movies | resolution (select), audio languages (multi), director (text) |
| Series | episodes per season (number), sub or dub (select), season count (number) |
| Books | author (text), pages (number), format (select) |

Rules: renaming is always safe; hiding is reversible; deleting a kind requires reassigning its
items (or is blocked when non-empty). Type changes on a populated field are warned, not silently
coerced.

## 4. Data model

| Table | Key columns |
| --- | --- |
| `media_kinds` | id, key, name, icon, color, sort_order, hidden, progress_unit, fields_json |
| `media_categories` | id, key, name, sort_order, hidden, applies_to (JSON kind keys) |
| `media_items` | id, kind_id, category_id, title, sort_title, original_title, year, status, rating, notes, attributes_json, cover_path, provider_ids_json, external_key, folder_path, primary_path, copy_count, season_count, episode_count, total_size_bytes |
| `media_copies` | id, item_id, volume_id, rel_path, size_bytes, quality, source, hash, season_number, season_label, episode, first_seen_at, last_seen_at, missing_at |
| `volumes` | id, label, volume_guid, serial, capacity_bytes, mount_path, type (internal / external / network), last_seen_at |
| `media_tags` / `tags` | shared with notes |
| `progress` | item_id, unit, position, total, updated_at (per-item; per-episode table later) |
| `scan_roots` | path, volume_id, kind, category_id, depth, last_scan_at |
| `scan_runs` | start/finish, kind, status, root_count, item_count, copy_count, message |
| `metadata_cache` | provider, provider_id, payload_json, fetched_at (planned) |
| `settings` | key/value (theme, API keys, scan preferences) |

Every item can have **zero copies** (wishlist) or **several** (duplicate across drives). A copy is
never deleted silently; it is marked `missing_at` when its volume is online but the file is gone.
A library rebuild replaces `media_items` and `media_copies` (after an automatic backup and the
user-field restore described in [media-library.md](../features/media-library.md)), but workspace
tables are untouched.

## 5. Statuses and derived states

Lifecycle, shared by all kinds:

`wishlist → acquired → in progress → completed` (or `dropped` from any state, `archived` later).

Derived badges, never stored as statuses:

- **Missing** — the copy's volume is online but the path is gone.
- **Offline** — the copy's volume is not connected (do not call this missing).
- **Duplicate** — more than one copy of the same item.
- **Unlinked** — a scanned file with no item yet.

## 6. Scanning — what it actually does

Scanning is an **indexing pass over folders you choose**. It reads; it never renames, moves or
deletes anything. Version 2 implements the following:

1. **You register roots** — e.g. `D:\Movies Library`, `G:\Animation`. Each root stores a folder,
   a kind (`movies`, `series`, `games`, `books`, `music` or `auto`), a default category and a depth.
2. **The app walks each tree**, skipping hidden/system names and ignored folders (`Subs`, `Sample`,
   `Extras`, `Featurettes`, `Trailers`, `Artwork`, …). Limits are 60,000 files and 12 levels.
3. **It classifies by extension** (video, book, music). A root kind decides the shape; with `auto`,
   a video whose name matches `SxxExx` or `1x03` becomes a series and everything else a movie.
4. **It groups files into titles**: a series is one item with seasons and episodes; a movie is one
   item per folder or per file inside a collection folder. Grouping identity becomes a stable id,
   so a rescan updates rows instead of duplicating them.
5. **It detects category** from language buckets in the path (`English`, `Arabic`/`عربي`,
   `Anime`/`Animation`/`Cartoons`), falling back to the root's default. Quality is inferred from
   the filename (`2160p`, `HDR`, `x265`, `DDP5.1`); there is no container probing yet.
6. **A rebuild is the only write path**: dry run, automatic database backup, replace
   `media_items`/`media_copies`, restore user fields by stable id and record a `scan_runs` row.
   Workspace tables are never touched.
7. **Offline roots block a rebuild**: an unplugged drive is reported as offline in the dry run, and
   the rebuild is refused until the drive is back or the root is removed. That keeps the previous
   index intact instead of silently dropping titles that happen to live on a disconnected disk.

Example: you point it at `D:\Movies Library` and it finds 437 files across language, genre and
actor buckets. It collapses them into one entry per film, then a second root at `G:\Animation`
becomes 55 series with season and episode counts instead of 4,000 episode rows.

**Not in v2:** metadata matching, a review queue, incremental scans, volume GUID detection and
derived health badges. Those are designed below and remain on the roadmap.

**What scanning is not:** not a player, not a download client, not a renamer, not a crawler of
the internet, and not destructive to your files. The only thing it writes is Axiom Core's own
database.

### 6.1 External drives are the normal case

The v2 model already stores volume-relative paths and one volume row per root. GUID detection,
drive polling and a volume screen are planned; this is the target shape:

All media lives on USB drives that are usually unplugged. That shapes the model:

- **Identity is the drive, not the path.** Every copy stores `volume_id` + `rel_path`; absolute
  paths are resolved from the current mount point. Volumes are matched by the OS volume GUID,
  falling back to serial + label, because drive letters are temporary.
- **Offline is a normal state.** A title whose only copy is on an unplugged drive still exists in
  the library: it reads *Offline — WD 4TB Archive*, not missing. Search still answers "do I have
  it?", and the answer includes *"yes, on the archive drive"*.
- **Detection.** The app polls logical drives (a few seconds; negligible CPU) and recognises a
  known volume by GUID, then offers the roots remembered for that drive — *"Scan 3 folders on WD
  4TB?"*. Unknown drives can be registered as new volumes.
- **Scanning respects USB.** Filenames first, no hashing by default, no container probing unless
  asked. The walk is sequential and cancellable, DB writes are batched, and unplugging mid-scan
  aborts that run without losing what was already indexed.
- **The database never lives on a media drive.** SQLite sits in the platform app-data folder, so
  unplugging a drive cannot corrupt the library. The app never writes to media volumes.
- **UI surfaces:** a *Volumes* screen (label, capacity, online, item count, last seen), *plug in X*
  hints on items, and a per-drive view of what is stored there.

### 6.2 From folder to library: detect → review → fetch (planned)

The target everyday flow is: point at a folder, confirm what Axiom Core found, and let it fetch the
details.

1. **Add a folder** (Library → *Scan roots*). Say what it holds: a specific kind (*Movies*), or
   *Detect automatically*.
2. **Preview** — files, recognised titles, guessed kinds, unknowns. This is the v2 dry run.
3. **Review** — confident matches can be accepted in bulk; ambiguous ones show the detected kind,
   title, year and the reasons. Change the kind, fix the title, ignore, or link to something you
   already track. *(planned)*
4. **Record** — items and copies are written, status *acquired*. In v2 this is the rebuild.
5. **Fetch metadata** — a queued, rate-limited request per new item to that kind's provider
   (TMDB for movies/series, IGDB for games). Posters and facts arrive progressively; failures
   retry later; offline items keep a *metadata pending* badge and can be filled in by hand.
   *(planned)*

**Detection signals**, strongest first:

| Signal | Movies | Series | Games |
| --- | --- | --- | --- |
| Root hint | root set to Movies | root set to Series | root set to Games |
| Folder shape | one video file | `Season 01` folders, many episodes | folder with main `.exe` + data, Steam `appmanifest_*.acf` |
| Filename | `Title.2024.2160p.mkv` | `S02E03`, `1x03`, `Episode 4` | setup/repack names, version folders |
| Metadata | TMDB match | TMDB match | IGDB match |

- A root kind acts as **filter and default**: set it to Movies and episode-shaped files are not
  accepted there; leave it on *auto* and each candidate is classified individually.
- **Confidence** decides the path: high (root + name pattern + metadata match) goes straight into
  the bulk accept list; medium goes to review; low stays in *Unrecognised* until you decide.
- **Human decisions win.** Re-typing an item re-runs matching against the new kind's provider.
  Anime and Series share the same episodic shape — with Anime as a *category*, the same series can
  live under English, Arabic or Anime without changing its kind.
- **Rescans are idempotent at the title level.** Stable ids mean an unchanged title updates in
  place; v2 rebuilds the whole index, while delta-only rescans are planned.

## 7. Metadata and caching

Manual covers shipped in v2; provider metadata is planned.

Providers: **TMDB** for movies/series, **IGDB** for games. Metadata is fetched **once**,
then cached in the user profile so the app works offline and never re-queries on launch:

```
<app data>/cache/
├── metadata/tmdb/603.json       # provider payload
├── metadata/igdb/1029.json
└── covers/<hash>.jpg            # resized thumbnails, not full art
```

- Fetch on add (if online) or on demand via **Refresh metadata**; details TTL ~30 days.
- API keys live in settings (OS credential store later). Only title, year or provider id is sent.
- Rate limits are handled by a small queue; failures are silent and retryable.
- Attribution requirements (TMDB, IGDB/Twitch) are shown in the item detail footer.
- Fully offline mode: manual title, year, tags, and a cover dragged from Explorer.

## 8. Anti-re-download workflows

1. **"Do I have it?"** — the Library search matches title and folder path in SQLite today; FTS5
   across aliases, tags and paths, plus a command-palette entry, are planned. The result shows
   kind, category, status, where it is and quality.
2. **Wishlist closes itself** — when a scanned file matches a wishlist item, it becomes
   *acquired* instead of creating a duplicate entry. *(planned with metadata matching)*
3. **Library health** — a single screen that answers "what should I clean up or plug in?".
   *(planned)*
4. **Copy path / open folder** — one click copies the folder path; another opens it in Explorer.
   *(planned; the item drawer already shows every volume-relative path)*

## 9. UI notes

- Category tree: All media, then Movies and Series split into English, Arabic and Anime; other
  kinds appear when they hold items. Counts come from `library_overview`.
- Paginated poster grid with a small status line and season/episode/file/size stats. Only one page
  is loaded; a 5,000-file library stays responsive because per-file rows are never part of the
  grid query.
- Item detail is a drawer with the poster, four stats, seasons and per-file copies.
- Covers are stored through the attachments module, shown lazily and can be set or cleared by hand.
- The rebuild dialog shows confirm → dry run → running → done, including the automatic backup path.

## 10. Delivery milestones

| Milestone | Scope | State |
| --- | --- | --- |
| **M1 — Catalog** | kinds, categories, items, volumes, statuses, tags, search, grid/detail, wishlist | partial — categories, grid, detail, covers; no wishlist/tag editing |
| **M2 — Scanner** | roots, walker, kind/category detection, grouping, rebuild, health | shipped — volume identity, review queue and health still planned |
| **M3 — Metadata** | TMDB/IGDB fetch queue, covers, cache, refresh | partial — manual covers only |
| **M4 — Depth** | per-episode progress, playtime, ratings/reviews, saved filters | not started |
| **M5 — Portability** | CSV/JSON import + export, bulk edit, duplicate merge | not started |

## 11. Open questions

1. Do we bundle `ffprobe` (true resolution/audio, +~70 MB) or infer from filenames first?
2. Should each kind get its own status labels (e.g. games say *Playing*), or one shared vocabulary?
3. Books and music are structurally different (authors/albums/tracks) — same item model, or
   their own module later?
4. Network/NAS paths: treat as volumes with `network` type from M2, or defer?
