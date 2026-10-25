# Library

**Route:** `/library` · **Status:** data layer shipped, screen **planned** ·
**Source:** [`src/pages/library.tsx`](../../src/pages/library.tsx) ·
**Feature doc:** [media-library.md](../features/media-library.md)

The Library is the "do I already have this?" answer for games, movies, series, anime, books and
music. Today the page is a status surface: it shows the seeded kinds and what is already persisted.

## What exists today

- Route and sidebar entry.
- Six seeded kinds (movies, series, anime, games, books, music) rendered as a static overview.
- Links to the full [library specification](../resources/LIBRARY.md).
- No browsing, scanning, metadata or actions.

## What is already underneath

The SQLite schema, Rust commands and typed frontend client exist; see
[media-library.md](../features/media-library.md). Nothing on this page reads the database yet.

## Planned

| Milestone | Scope |
| --- | --- |
| M1 | kind navigation, item grid/table, volumes, wishlist, search, detail |
| M2 | volume detection and folder scanning |
| M3 | TMDB/IGDB metadata with a local cache |

## Why this page is intentionally empty

Building a browsing UI before the scanner and metadata models settle would produce screens that get
rebuilt. The structure is in place, the data layer is ready, and the feature is explicitly marked as
planned in the interface rather than faked with dead controls.
