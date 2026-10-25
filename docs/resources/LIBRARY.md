# Orbit Library — media module specification

**Status:** draft · **Parent spec:** [SPEC.md](SPEC.md) · **Last updated:** 2026-10-25

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

- **Library** — grid or table of everything, filtered by kind, status, tags, volume.
- **Kind view** — e.g. *Games*, *Movies*, *Anime*; columns come from that kind's field schema.
- **Item detail** — cover, metadata, status, progress, notes, copies (paths, sizes, quality),
  rating, tags.
- **Wishlist** — what you still want, separate from what you own.
- **Health** — missing files, duplicates, unlinked copies, storage per volume.
- **Scan review** — the queue of files the scanner could not match to an item.

Dashboard additions: *Continue playing / watching*, *Recently added*, *Library health* count.

## 3. Dynamic kinds

Kinds are **data, not enums**. Movies, Series, Anime, Games, Books and Music ship as editable
examples; any kind can be added, renamed, recoloured, hidden, or extended with custom fields.

```ts
interface MediaKind {
  id: string
  key: string            // stable slug, e.g. 'anime'
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

**Why this shape:** core columns (title, year, status, rating, tags, progress) are real columns
so search, sort and filters stay fast; kind-specific facts live in a JSON `attributes` object
validated by the kind's field schema. Adding a field or a kind never needs a database migration —
which is the whole point of making types dynamic.

Examples of per-kind fields:

| Kind | Fields |
| --- | --- |
| Games | platform (select), playtime hours (number), launcher/store (select), modded (boolean) |
| Movies | resolution (select), audio languages (multi), director (text) |
| Series / Anime | episodes per season (number), sub or dub (select), season count (number) |
| Books | author (text), pages (number), format (select) |

Rules: renaming is always safe; hiding is reversible; deleting a kind requires reassigning its
items (or is blocked when non-empty). Type changes on a populated field are warned, not silently
coerced.

## 4. Data model

| Table | Key columns |
| --- | --- |
| `media_kinds` | id, key, name, icon, color, sort_order, hidden, progress_unit, fields_json |
| `media_items` | id, kind_id, title, sort_title, original_title, year, status, rating, notes, attributes_json, cover_path, provider_ids_json, created_at, updated_at |
| `media_copies` | id, item_id, volume_id, rel_path, size_bytes, quality, source, hash, first_seen_at, last_seen_at, missing_at |
| `volumes` | id, label, volume_guid, serial, capacity_bytes, mount_path, type (internal / external / network), last_seen_at |
| `media_tags` / `tags` | shared with notes |
| `progress` | item_id, unit, position, total, updated_at (per-item; per-episode table later) |
| `scan_roots` / `scan_runs` | folder roots per volume; last run stats |
| `metadata_cache` | provider, provider_id, payload_json, fetched_at |
| `settings` | key/value (theme, API keys, scan preferences) |

Every item can have **zero copies** (wishlist) or **several** (duplicate across drives). A copy
is never deleted by the app; it is marked `missing_at` when its volume is online but the file is
gone.

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
deletes anything.

1. **You register roots** — e.g. `D:\Media\Movies`, `E:\Shows`, `F:\Games\Installed`. Each root
   belongs to a volume, identified by serial/label, not just a drive letter (letters change).
2. **The app walks each tree** on a background thread, skipping hidden/system folders and ignore
   patterns (`sample`, `extras`, `*.part`, `$RECYCLE.BIN`).
3. **For each file it records facts**: full path, size, modified time, extension, volume — and
   optionally media facts from the container (duration, resolution, codecs, audio/subtitle
   languages) when an optional `ffprobe` is available. Without it, quality is inferred from the
   filename (`2160p`, `HDR`, `x265`, `DDP5.1`).
4. **It guesses identity** from the name: `Severance.S02E03.2160p.WEB-DL.mkv` → series
   *Severance*, season 2, episode 3, 2160p, WEB-DL. Files that belong together are grouped into
   one candidate (a movie + its subtitle files; a season of episodes).
5. **It matches candidates to items** by provider id, then normalised title + year.
   - matched → attach a copy (path, size, quality) and update `last_seen_at`
   - ambiguous → **review queue**: link to an existing item, create a new one, or ignore
   - already known and unchanged → skipped
6. **Incremental by design**: comparing path + size + mtime means the second scan only touches
   new or changed files. A full rescan is a manual action.
7. **Health checks fall out of it**: files present in the DB but absent on an online volume
   (missing), the same item on several volumes (duplicate), files never linked (unlinked),
   total size per volume.

Example: you point it at `D:\Media\Movies` and it finds 340 files. 312 match immediately, 21 go
to the review queue, 7 are recognised as two copies of titles you already had. Later you plug in
the 4 TB drive and scan `E:\Shows`: 120 episodes attach to 9 existing series, 3 new series are
proposed.

**What scanning is not:** not a player, not a download client, not a renamer, not a crawler of
the internet, and not destructive. The only thing it writes is Orbit's own database.

### 6.1 External drives are the normal case

All media lives on USB drives that are usually unplugged. That shapes the model:

- **Identity is the drive, not the path.** Every copy stores `volume_id` + `rel_path`; absolute
  paths are resolved from the current mount point. Volumes are matched by Windows *volume GUID*,
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
- **The database never lives on a media drive.** SQLite sits in `%APPDATA%\Orbit`, so unplugging
  a drive cannot corrupt the library. The app never writes to media volumes.
- **UI surfaces:** a *Volumes* screen (label, capacity, online, item count, last seen), *plug in X*
  hints on items, and a per-drive view of what is stored there.

### 6.2 From folder to library: detect → review → fetch

The everyday flow is: point at a folder, confirm what Orbit found, and let it fetch the details.

1. **Add a folder** (Library → *Add folder*, or drag a folder onto the window). Say what it holds:
   a specific kind (*Movies*), or *Detect automatically*.
2. **Preview** — files, recognised titles, guessed kinds, unknowns. Nothing is written yet.
3. **Review** — confident matches can be accepted in bulk; ambiguous ones show the detected kind,
   title, year and the reasons. Change the kind, fix the title, ignore, or link to something you
   already track.
4. **Record** — items and copies are written, status *acquired*. Nothing is added without this step
   unless a root is explicitly marked as trusted.
5. **Fetch metadata** — a queued, rate-limited request per new item to that kind's provider
   (TMDB for movies/series/anime, IGDB for games). Posters and facts arrive progressively; failures
   retry later; offline items keep a *metadata pending* badge and can be filled in by hand.

**Detection signals**, strongest first:

| Signal | Movies | Series / Anime | Games |
| --- | --- | --- | --- |
| Root hint | root set to Movies | root set to Series/Anime | root set to Games |
| Folder shape | one video file | `Season 01` folders, many episodes | folder with main `.exe` + data, Steam `appmanifest_*.acf` |
| Filename | `Title.2024.2160p.mkv` | `S02E03`, `1x03`, `Episode 4` | setup/repack names, version folders |
| Metadata | TMDB match | TMDB / AniList match | IGDB match |

- A root kind acts as **filter and default**: set it to Movies and episode-shaped files are not
  accepted there; leave it on *auto* and each candidate is classified individually.
- **Confidence** decides the path: high (root + name pattern + metadata match) goes straight into
  the bulk accept list; medium goes to review; low stays in *Unrecognised* until you decide.
- **Human decisions win.** Re-typing an item re-runs matching against the new kind's provider.
  Anime and Series share the same episodic shape — the difference is the metadata source and how
  you group them; a mis-detected title is one click from the right kind.
- **Rescans are idempotent.** Existing items are matched, not duplicated; new episodes attach to
  the existing series; a moved file updates its copy path. Only the delta is written.

## 7. Metadata and caching

Providers: **TMDB** for movies/series/anime, **IGDB** for games. Metadata is fetched **once**,
then cached in the user profile so the app works offline and never re-queries on launch:

```
%APPDATA%\Orbit\cache\
├── metadata\tmdb\603.json       # provider payload
├── metadata\igdb\1029.json
└── covers\<hash>.jpg            # resized thumbnails, not full art
```

- Fetch on add (if online) or on demand via **Refresh metadata**; details TTL ~30 days.
- API keys live in settings (OS credential store later). Only title, year or provider id is sent.
- Rate limits are handled by a small queue; failures are silent and retryable.
- Attribution requirements (TMDB, IGDB/Twitch) are shown in the item detail footer.
- Fully offline mode: manual title, year, tags, and a cover dragged from Explorer.

## 8. Anti-re-download workflows

1. **"Do I have it?"** — command palette (`⌘K`) searches titles, aliases, tags and paths through
   SQLite FTS5; the result shows kind, status, where it is and quality. Available from any page.
2. **Wishlist closes itself** — when a scanned file matches a wishlist item, it becomes
   *acquired* instead of creating a duplicate entry.
3. **Library health** — a single screen that answers "what should I clean up or plug in?".
4. **Copy path** — one click copies the folder path; one click opens it in Explorer.

## 9. UI notes

- Grid view with cover art and a small status dot; table view with the kind's custom columns.
- Item detail is a two-column sheet: media on the left, copies + progress on the right.
- Covers are cached thumbnails (~320px), lazy-loaded, and virtualised — a 5,000-item library
  must scroll smoothly.
- Scanner shows progress (`files scanned`, `matched`, `needs review`) and can be cancelled.

## 10. Delivery milestones

| Milestone | Scope | Done when |
| --- | --- | --- |
| **M1 — Catalog** | kinds, items, volumes, statuses, tags, search, grid/detail, wishlist | You can catalogue 20 titles by hand and find them from the palette |
| **M2 — Scanner** | volume detection, roots, walker, kind detection, review queue, health | Existing folders import without duplicates; unplugged drives read "offline" |
| **M3 — Metadata** | TMDB/IGDB fetch queue, covers, cache, refresh | A new title gets art and facts in one step, offline afterwards |
| **M4 — Depth** | per-episode progress, playtime, ratings/reviews, saved filters | "Continue watching" is accurate |
| **M5 — Portability** | CSV/JSON import + export, bulk edit, duplicate merge | Library survives a reinstall and moves machines |

## 11. Open questions

1. Do we bundle `ffprobe` (true resolution/audio, +~70 MB) or infer from filenames first?
2. Should each kind get its own status labels (e.g. games say *Playing*), or one shared vocabulary?
3. Books and music are structurally different (authors/albums/tracks) — same item model, or
   their own module later?
4. Network/NAS paths: treat as volumes with `network` type from M2, or defer?
