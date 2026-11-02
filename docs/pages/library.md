# Library

**Route:** `/library` · **Status:** v2 shipped — series grouping, categories, paginated grid ·
**Source:** [`src/pages/library.tsx`](../../src/pages/library.tsx),
[`src/components/library-tree.tsx`](../../src/components/library-tree.tsx) ·
**Feature doc:** [media-library.md](../features/media-library.md) ·
**Spec:** [LIBRARY.md](../resources/LIBRARY.md)

![Library page](../assets/screens/preview-library.png)

The Library indexes media you already own so you never download it twice. It answers two questions
quickly: **“Do I have this?”** and **“where is it?”**

One title is **one library entry**, not one entry per episode or season. A series with eight
seasons is a single card; the seasons, episode counts, file counts and total size live in the item
drawer. This keeps a 4,500-file library readable and keeps the page fast.

## Layout

| Area | What it shows |
| --- | --- |
| **Categories** (left) | All media, then Movies and Series split into English, Arabic and Anime; other kinds appear when they hold items |
| **Toolbar** | Search, status filter, sort, **Rebuild**, **Scan roots** |
| **Grid** | Poster cards with title, year, status, seasons, episodes, files and size |
| **Pager** | Page size, current page and total titles; only one page is loaded at a time |
| **Item drawer** | Stats, seasons, files (volume + relative path) and poster controls |

Counts next to each branch come from the library overview, so the tree reflects the database
without loading every item.

## Categories

Categories are **data, not enums**. They live in `media_categories` with a name, order, hidden
flag and the kinds they apply to. The seed ships:

| Key | Name | Applies to |
| --- | --- | --- |
| `english` | English | Movies, Series |
| `arabic` | Arabic | Movies, Series |
| `anime` | Anime | Movies, Series |

**Anime is a category, not a top-level kind.** It appears under both Movies and Series, so
“Anime → Series” and “Anime → Movies” are sibling views. The retired `kind-anime` row is hidden by
the v2 migration and its items move to Series + Anime. Adding a category is a row insert; no schema
migration is involved.

The scanner can override a root's default category when a path contains a language bucket:
`English`, `Arabic`/`عربي`, or `Anime`/`Animation`/`Cartoons`. A root pointed at `D:\Movies
Library` can therefore serve all three categories at once.

## Scan roots

A **root** is a folder the scanner owns. Register one from **Scan roots**:

1. **Choose folder** opens the native picker (`rfd`).
2. Choose the **kind** the folder holds — Movies, Series, Games, Books or Music. The kind decides
   how files are grouped; it is not just a label.
3. Choose a **default category** (English, Arabic, Anime or none).
4. Set **depth** (how many folder levels to walk).

Roots are listed with their kind, category, depth and last scan time. Deleting a root stops future
scans; it does not delete indexed items until the next rebuild. Offline roots are reported during
the dry run, and the rebuild is **refused** while one exists: reconnecting the drive (or removing
the root) is required so a rebuild can never drop a library that is merely unplugged.

## Rebuild

Library writes are owned by one flow, opened from **Rebuild**:

1. **Confirm** — the dialog explains that the index will be replaced and user fields restored.
2. **Dry run** — walks every root and reports titles, files, episodes, total size, per-root counts
   and warnings. Nothing is written.
3. **Rebuild now** — backs up the database, rescans and imports. The last step shows imported
   titles/files, removed titles/files, duration and the backup path.

The automatic backup is a clean `VACUUM INTO` copy at
`<data dir>/backups/axiom-before-rebuild-<timestamp>.db`. Only `media_items` and `media_copies` are
cleared; workspace tables (projects, tasks, notes, documents) are never touched.

Per-item user fields — status, rating, notes, poster, original title and provider ids — are read
before the wipe and restored by stable item id after the import. Item ids come from the scanner's
grouping identity, so a normal rescan updates rows instead of duplicating them.

## Grouping rules

| Shape | Result |
| --- | --- |
| `Show/Season 2/Show.S02E05.mkv` | One Series entry, season 2, episode 5 |
| `Show/Show S2/…` or `Show/Show 2nd Season/…` | Same series, season 2 |
| `Show/Specials/…`, `Show/OVA/…` | Season 0 (Specials) or the named season |
| `Show/Movies/…` | Movie-shaped files beside a series are separate Movies entries |
| `English/Action/Infinite.2021/Infinite.mkv` | One Movie, title from the film folder |
| `English/Action/Star Wars/…` (several videos) | One Movie per file inside the collection folder |
| `RoboCop/2014.mkv` | Movie titled from the folder, year from the filename |
| `Season 03 Part 2`, `Seassion 02` | Tolerated; normalised to season 3 / season 2 |

Language, genre and actor folders (`English`, `Action`, `Drama`, …) are treated as wrappers and
never become titles. Trailers, samples, featurettes and subtitle folders are skipped.

## Item detail

The drawer shows the poster, category, year, status, original title and four stats: seasons,
episodes, files and total size. Below them:

- **Seasons** — each season label with episode count and size.
- **Files** — every copy with volume label, season/episode marker, size and relative path.

**Add poster** / **Change poster** copies a local image through the attachments module and writes
the item's `coverPath`; **Remove** clears it. This is the only item mutation exposed by the v2 UI;
status, rating and notes editing are planned.

## Performance

- Queries are **server-side paginated**; the page asks for one slice and receives only aggregate
  columns. Per-file copies are loaded only for the open detail drawer.
- Search, status, kind and category filters run in SQLite with indexes on `kind_id`,
  `category_id` and `title`.
- The library is **not** part of the workspace snapshot or `localStorage`, so 4,500 indexed files
  do not slow down notes, documents or startup.
- Rebuild work runs off the UI thread; the page stays responsive while scanning.

## Storage

- Volume-relative paths (`relPath`); drive letters are not part of identity.
- A `volume` row per scanned root, with mount path and label.
- Duplicate detection is by `volumeId + relPath`, not content hash.
- The database lives in `%APPDATA%\com.axiom.core\axiom.db`; media drives are only read.

## Limitations

- No metadata provider (TMDB/IGDB), automatic episode numbering or subtitle probing.
- No volume GUID/serial identity yet; the mount path and label identify a volume.
- No category editor in the UI — categories are rows and can be added in the database.
- No incremental scan; a rebuild replaces the whole library index.
- No status/rating/notes editing in the drawer yet.
- Games are not grouped; executable detection still needs a safe rule.
