/*======> Reference By Comment <======
 * ===> 01 - Schema
 * ===> 02 - Migration & Seed
 * ===> 03 - Workspace State
 * ===> 04 - Library Queries
 */

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension, Result};

use super::models::{
    ActivityEntry, Appearance, AppState, BackgroundSettings, Counters, Identity, Issue, LibrarySnapshot,
    MediaCopy, MediaItem, MediaKind,
    MediaProgress, Note, Project, Volume,
};

pub const SCHEMA_VERSION: i64 = 1;

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    key         TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL,
    status      TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    target_date TEXT
);

CREATE TABLE IF NOT EXISTS issues (
    id           TEXT PRIMARY KEY,
    key          TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL,
    priority     TEXT NOT NULL,
    project_id   TEXT REFERENCES projects(id) ON DELETE SET NULL,
    labels       TEXT NOT NULL DEFAULT '[]',
    due_date     TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_status  ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_due     ON issues(due_date);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_updated ON issues(updated_at);

CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    tags       TEXT NOT NULL DEFAULT '[]',
    pinned     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_pinned  ON notes(pinned);

CREATE TABLE IF NOT EXISTS activity (
    id      TEXT PRIMARY KEY,
    kind    TEXT NOT NULL,
    message TEXT NOT NULL,
    at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
    name  TEXT PRIMARY KEY,
    value INTEGER NOT NULL
);

-- Library module (schema prepared before its UI exists).
CREATE TABLE IF NOT EXISTS media_kinds (
    id            TEXT PRIMARY KEY,
    key           TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    icon          TEXT NOT NULL,
    color         TEXT NOT NULL,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    hidden        INTEGER NOT NULL DEFAULT 0,
    progress_unit TEXT NOT NULL DEFAULT 'none',
    fields_json   TEXT NOT NULL DEFAULT '[]',
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_items (
    id                  TEXT PRIMARY KEY,
    kind_id             TEXT NOT NULL REFERENCES media_kinds(id),
    title               TEXT NOT NULL,
    sort_title          TEXT,
    original_title      TEXT,
    year                INTEGER,
    status              TEXT NOT NULL,
    rating              REAL,
    notes               TEXT NOT NULL DEFAULT '',
    attributes_json     TEXT NOT NULL DEFAULT '{}',
    cover_path          TEXT,
    provider_ids_json   TEXT NOT NULL DEFAULT '{}',
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_items_kind   ON media_items(kind_id);
CREATE INDEX IF NOT EXISTS idx_media_items_status ON media_items(status);
CREATE INDEX IF NOT EXISTS idx_media_items_title  ON media_items(title);

CREATE TABLE IF NOT EXISTS volumes (
    id             TEXT PRIMARY KEY,
    label          TEXT NOT NULL,
    volume_guid    TEXT,
    serial         TEXT,
    capacity_bytes INTEGER,
    mount_path     TEXT,
    type           TEXT NOT NULL DEFAULT 'external',
    last_seen_at   TEXT
);

CREATE TABLE IF NOT EXISTS media_copies (
    id            TEXT PRIMARY KEY,
    item_id       TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    volume_id     TEXT NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
    rel_path      TEXT NOT NULL,
    size_bytes    INTEGER,
    quality       TEXT,
    source        TEXT,
    hash          TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at  TEXT,
    missing_at    TEXT,
    UNIQUE(volume_id, rel_path)
);
CREATE INDEX IF NOT EXISTS idx_copies_item   ON media_copies(item_id);
CREATE INDEX IF NOT EXISTS idx_copies_volume ON media_copies(volume_id);

CREATE TABLE IF NOT EXISTS media_progress (
    item_id    TEXT PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
    unit       TEXT NOT NULL,
    position   REAL NOT NULL DEFAULT 0,
    total      REAL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS media_tags (
    item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);
"#;

/// Suggested kinds; users can rename, hide or add more later. `INSERT OR IGNORE`
/// means editing them in the app is never overwritten by a migration.
const KIND_SEEDS: &[(&str, &str, &str, &str, i64, &str, &str)] = &[
    ("movies", "Movies", "film", "blue", 0, "none", r#"[{"key":"resolution","label":"Resolution","type":"select","options":["480p","720p","1080p","2160p"]}]"#),
    ("series", "Series", "tv", "violet", 1, "episode", r#"[{"key":"sub_or_dub","label":"Sub or dub","type":"select","options":["Sub","Dub","Both"]}]"#),
    ("anime", "Anime", "sparkles", "rose", 2, "episode", r#"[{"key":"sub_or_dub","label":"Sub or dub","type":"select","options":["Sub","Dub","Both"]},{"key":"season_count","label":"Seasons","type":"number"}]"#),
    ("games", "Games", "gamepad", "emerald", 3, "hour", r#"[{"key":"platform","label":"Platform","type":"select","options":["PC","PS5","Xbox","Switch"]},{"key":"playtime","label":"Playtime (h)","type":"number"}]"#),
    ("books", "Books", "book-open", "amber", 4, "page", r#"[{"key":"author","label":"Author","type":"text"},{"key":"pages","label":"Pages","type":"number"}]"#),
    ("music", "Music", "music", "cyan", 5, "none", r#"[{"key":"artist","label":"Artist","type":"text"}]"#),
];

//=====> Migration & Seed <=====//

pub fn open(path: &Path) -> Result<Connection> {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let connection = Connection::open(path)?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "synchronous", "NORMAL")?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&connection)?;
    Ok(connection)
}

fn migrate(connection: &Connection) -> Result<()> {
    let version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version < 1 {
        connection.execute_batch(SCHEMA)?;
        seed_media_kinds(connection)?;
        connection.pragma_update(None, "user_version", 1)?;
    }
    Ok(())
}

fn seed_media_kinds(connection: &Connection) -> Result<()> {
    for &(key, name, icon, color, order, unit, fields) in KIND_SEEDS {
        connection.execute(
            "INSERT OR IGNORE INTO media_kinds
                (id, key, name, icon, color, sort_order, hidden, progress_unit, fields_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, datetime('now'))",
            params![format!("kind-{key}"), key, name, icon, color, order, unit, fields],
        )?;
    }
    Ok(())
}

fn meta_value(connection: &Connection, key: &str) -> Result<Option<String>> {
    connection
        .query_row("SELECT value FROM meta WHERE key = ?1", params![key], |row| row.get(0))
        .optional()
}

fn set_meta(connection: &Connection, key: &str, value: &str) -> Result<()> {
    connection.execute(
        "INSERT INTO meta (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

/// Returns `None` until the app has saved its first snapshot; the frontend then
/// seeds the database itself.
//=====> Workspace State <=====//

pub fn load_state(connection: &Connection) -> Result<Option<AppState>> {
    if meta_value(connection, "initialized")?.as_deref() != Some("1") {
        return Ok(None);
    }

    let theme = meta_value(connection, "theme")?.unwrap_or_else(|| "classic".to_string());
    let sidebar_collapsed = meta_value(connection, "sidebarCollapsed")?.as_deref() == Some("1");

    let identity = Identity {
        app_name: meta_value(connection, "identity.appName")?
            .unwrap_or_else(|| "Axiom Core".to_string()),
        workspace_name: meta_value(connection, "identity.workspaceName")?
            .unwrap_or_else(|| "Personal".to_string()),
        owner_name: meta_value(connection, "identity.ownerName")?
            .unwrap_or_else(|| "Abdullah".to_string()),
    };

    let mut project_stmt = connection.prepare(
        "SELECT id, name, key, description, color, status, created_at, target_date
         FROM projects ORDER BY rowid",
    )?;
    let projects = project_stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                key: row.get(2)?,
                description: row.get(3)?,
                color: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
                target_date: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut issue_stmt = connection.prepare(
        "SELECT id, key, title, description, status, priority, project_id, labels,
                due_date, created_at, updated_at, completed_at
         FROM issues ORDER BY rowid",
    )?;
    let issues = issue_stmt
        .query_map([], |row| {
            let labels_json: String = row.get(7)?;
            Ok(Issue {
                id: row.get(0)?,
                key: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                status: row.get(4)?,
                priority: row.get(5)?,
                project_id: row.get(6)?,
                labels: serde_json::from_str(&labels_json).unwrap_or_default(),
                due_date: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                completed_at: row.get(11)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut note_stmt = connection.prepare(
        "SELECT id, title, content, project_id, tags, pinned, created_at, updated_at
         FROM notes ORDER BY rowid",
    )?;
    let notes = note_stmt
        .query_map([], |row| {
            let tags_json: String = row.get(4)?;
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                project_id: row.get(3)?,
                tags: serde_json::from_str(&tags_json).unwrap_or_default(),
                pinned: row.get::<_, i64>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut activity_stmt =
        connection.prepare("SELECT id, kind, message, at FROM activity ORDER BY rowid")?;
    let activity = activity_stmt
        .query_map([], |row| {
            Ok(ActivityEntry {
                id: row.get(0)?,
                kind: row.get(1)?,
                message: row.get(2)?,
                at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let documents = meta_value(connection, "documents")?
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or_default();
    let milestones = meta_value(connection, "milestones")?
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or_default();

    let appearance = Appearance {
        background: BackgroundSettings {
            kind: meta_value(connection, "appearance.backgroundKind")?
                .unwrap_or_else(|| "none".to_string()),
            image_url: meta_value(connection, "appearance.imageUrl")?.unwrap_or_default(),
            opacity: meta_value(connection, "appearance.opacity")?
                .and_then(|value| value.parse::<f64>().ok())
                .unwrap_or(0.18),
            scope: meta_value(connection, "appearance.scope")?
                .unwrap_or_else(|| "window".to_string()),
        },
        page_backgrounds: meta_value(connection, "appearance.pageBackgrounds")?
            .and_then(|value| serde_json::from_str(&value).ok())
            .unwrap_or_default(),
    };
    let issue_counter = connection
        .query_row("SELECT value FROM counters WHERE name = 'issue'", [], |row| row.get(0))
        .optional()?
        .unwrap_or(0);

    Ok(Some(AppState {
        version: SCHEMA_VERSION as u32,
        identity,
        appearance,
        theme,
        sidebar_collapsed,
        projects,
        issues,
        notes,
        documents,
        milestones,
        activity,
        counters: Counters {
            issue: issue_counter,
        },
    }))
}

/// Mirrors the frontend snapshot into SQLite in one transaction. The media tables
/// are intentionally untouched until the Library UI owns them.
pub fn save_state(connection: &mut Connection, state: &AppState) -> Result<()> {
    let transaction = connection.transaction()?;

    transaction.execute("DELETE FROM issues", [])?;
    transaction.execute("DELETE FROM notes", [])?;
    transaction.execute("DELETE FROM activity", [])?;
    transaction.execute("DELETE FROM projects", [])?;

    for project in &state.projects {
        transaction.execute(
            "INSERT INTO projects (id, name, key, description, color, status, created_at, target_date)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                project.id,
                project.name,
                project.key,
                project.description,
                project.color,
                project.status,
                project.created_at,
                project.target_date
            ],
        )?;
    }

    for issue in &state.issues {
        let labels = serde_json::to_string(&issue.labels).unwrap_or_else(|_| "[]".to_string());
        transaction.execute(
            "INSERT INTO issues
                (id, key, title, description, status, priority, project_id, labels,
                 due_date, created_at, updated_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                issue.id,
                issue.key,
                issue.title,
                issue.description,
                issue.status,
                issue.priority,
                issue.project_id,
                labels,
                issue.due_date,
                issue.created_at,
                issue.updated_at,
                issue.completed_at
            ],
        )?;
    }

    for note in &state.notes {
        let tags = serde_json::to_string(&note.tags).unwrap_or_else(|_| "[]".to_string());
        transaction.execute(
            "INSERT INTO notes
                (id, title, content, project_id, tags, pinned, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                note.id,
                note.title,
                note.content,
                note.project_id,
                tags,
                if note.pinned { 1 } else { 0 },
                note.created_at,
                note.updated_at
            ],
        )?;
    }

    for entry in &state.activity {
        transaction.execute(
            "INSERT INTO activity (id, kind, message, at) VALUES (?1, ?2, ?3, ?4)",
            params![entry.id, entry.kind, entry.message, entry.at],
        )?;
    }

    transaction.execute(
        "INSERT INTO counters (name, value) VALUES ('issue', ?1)
         ON CONFLICT(name) DO UPDATE SET value = excluded.value",
        params![state.counters.issue],
    )?;

    set_meta(
        &transaction,
        "documents",
        &serde_json::to_string(&state.documents).unwrap_or_else(|_| "[]".to_string()),
    )?;
    set_meta(
        &transaction,
        "milestones",
        &serde_json::to_string(&state.milestones).unwrap_or_else(|_| "[]".to_string()),
    )?;

    set_meta(&transaction, "theme", &state.theme)?;
    set_meta(&transaction, "identity.appName", &state.identity.app_name)?;
    set_meta(
        &transaction,
        "identity.workspaceName",
        &state.identity.workspace_name,
    )?;
    set_meta(&transaction, "identity.ownerName", &state.identity.owner_name)?;
    set_meta(
        &transaction,
        "appearance.backgroundKind",
        &state.appearance.background.kind,
    )?;
    set_meta(
        &transaction,
        "appearance.imageUrl",
        &state.appearance.background.image_url,
    )?;
    set_meta(
        &transaction,
        "appearance.opacity",
        &state.appearance.background.opacity.to_string(),
    )?;
    set_meta(
        &transaction,
        "appearance.scope",
        &state.appearance.background.scope,
    )?;
    set_meta(
        &transaction,
        "appearance.pageBackgrounds",
        &serde_json::to_string(&state.appearance.page_backgrounds)
            .unwrap_or_else(|_| "{}".to_string()),
    )?;
    set_meta(
        &transaction,
        "sidebarCollapsed",
        if state.sidebar_collapsed { "1" } else { "0" },
    )?;
    set_meta(&transaction, "initialized", "1")?;

    transaction.commit()
}
fn json_value(raw: String) -> serde_json::Value {
    serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null)
}

/// Reads the Library tables. The workspace snapshot and the library are separate
/// on purpose: media rows will be written by the scanner, not by the UI snapshot.
//=====> Library Queries <=====//

pub fn load_library(connection: &Connection) -> Result<LibrarySnapshot> {
    let mut kind_stmt = connection.prepare(
        "SELECT id, key, name, icon, color, sort_order, hidden, progress_unit, fields_json
         FROM media_kinds ORDER BY sort_order, name",
    )?;
    let kinds = kind_stmt
        .query_map([], |row| {
            let fields: String = row.get(8)?;
            Ok(MediaKind {
                id: row.get(0)?,
                key: row.get(1)?,
                name: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                sort_order: row.get(5)?,
                hidden: row.get::<_, i64>(6)? != 0,
                progress_unit: row.get(7)?,
                fields: json_value(fields),
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut item_stmt = connection.prepare(
        "SELECT id, kind_id, title, sort_title, original_title, year, status, rating, notes,
                attributes_json, cover_path, provider_ids_json, created_at, updated_at
         FROM media_items ORDER BY updated_at DESC, title",
    )?;
    let items = item_stmt
        .query_map([], |row| {
            let attributes: String = row.get(9)?;
            let providers: String = row.get(11)?;
            Ok(MediaItem {
                id: row.get(0)?,
                kind_id: row.get(1)?,
                title: row.get(2)?,
                sort_title: row.get(3)?,
                original_title: row.get(4)?,
                year: row.get(5)?,
                status: row.get(6)?,
                rating: row.get(7)?,
                notes: row.get(8)?,
                attributes: json_value(attributes),
                cover_path: row.get(10)?,
                provider_ids: json_value(providers),
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut copy_stmt = connection.prepare(
        "SELECT id, item_id, volume_id, rel_path, size_bytes, quality, source, hash,
                first_seen_at, last_seen_at, missing_at
         FROM media_copies ORDER BY first_seen_at",
    )?;
    let copies = copy_stmt
        .query_map([], |row| {
            Ok(MediaCopy {
                id: row.get(0)?,
                item_id: row.get(1)?,
                volume_id: row.get(2)?,
                rel_path: row.get(3)?,
                size_bytes: row.get(4)?,
                quality: row.get(5)?,
                source: row.get(6)?,
                hash: row.get(7)?,
                first_seen_at: row.get(8)?,
                last_seen_at: row.get(9)?,
                missing_at: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut volume_stmt = connection.prepare(
        "SELECT id, label, volume_guid, serial, capacity_bytes, mount_path, type, last_seen_at
         FROM volumes ORDER BY label",
    )?;
    let volumes = volume_stmt
        .query_map([], |row| {
            Ok(Volume {
                id: row.get(0)?,
                label: row.get(1)?,
                volume_guid: row.get(2)?,
                serial: row.get(3)?,
                capacity_bytes: row.get(4)?,
                mount_path: row.get(5)?,
                volume_type: row.get(6)?,
                last_seen_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut progress_stmt = connection.prepare(
        "SELECT item_id, unit, position, total, updated_at FROM media_progress",
    )?;
    let progress = progress_stmt
        .query_map([], |row| {
            Ok(MediaProgress {
                item_id: row.get(0)?,
                unit: row.get(1)?,
                position: row.get(2)?,
                total: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(LibrarySnapshot {
        kinds,
        items,
        copies,
        volumes,
        progress,
    })
}

pub fn upsert_volume(connection: &Connection, volume: &Volume) -> Result<()> {
    connection.execute(
        "INSERT INTO volumes (id, label, volume_guid, serial, capacity_bytes, mount_path, type, last_seen_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            volume_guid = excluded.volume_guid,
            serial = excluded.serial,
            capacity_bytes = excluded.capacity_bytes,
            mount_path = excluded.mount_path,
            type = excluded.type,
            last_seen_at = excluded.last_seen_at",
        params![
            volume.id,
            volume.label,
            volume.volume_guid,
            volume.serial,
            volume.capacity_bytes,
            volume.mount_path,
            volume.volume_type,
            volume.last_seen_at
        ],
    )?;
    Ok(())
}

pub fn upsert_media_item(connection: &Connection, item: &MediaItem) -> Result<()> {
    let attributes = serde_json::to_string(&item.attributes).unwrap_or_else(|_| "{}".to_string());
    let providers = serde_json::to_string(&item.provider_ids).unwrap_or_else(|_| "{}".to_string());

    connection.execute(
        "INSERT INTO media_items
            (id, kind_id, title, sort_title, original_title, year, status, rating, notes,
             attributes_json, cover_path, provider_ids_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
         ON CONFLICT(id) DO UPDATE SET
            kind_id = excluded.kind_id,
            title = excluded.title,
            sort_title = excluded.sort_title,
            original_title = excluded.original_title,
            year = excluded.year,
            status = excluded.status,
            rating = excluded.rating,
            notes = excluded.notes,
            attributes_json = excluded.attributes_json,
            cover_path = excluded.cover_path,
            provider_ids_json = excluded.provider_ids_json,
            updated_at = excluded.updated_at",
        params![
            item.id,
            item.kind_id,
            item.title,
            item.sort_title,
            item.original_title,
            item.year,
            item.status,
            item.rating,
            item.notes,
            attributes,
            item.cover_path,
            providers,
            item.created_at,
            item.updated_at
        ],
    )?;
    Ok(())
}

pub fn attach_media_copy(connection: &Connection, copy: &MediaCopy) -> Result<()> {
    connection.execute(
        "INSERT INTO media_copies
            (id, item_id, volume_id, rel_path, size_bytes, quality, source, hash,
             first_seen_at, last_seen_at, missing_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(id) DO UPDATE SET
            item_id = excluded.item_id,
            volume_id = excluded.volume_id,
            rel_path = excluded.rel_path,
            size_bytes = excluded.size_bytes,
            quality = excluded.quality,
            source = excluded.source,
            hash = excluded.hash,
            last_seen_at = excluded.last_seen_at,
            missing_at = excluded.missing_at",
        params![
            copy.id,
            copy.item_id,
            copy.volume_id,
            copy.rel_path,
            copy.size_bytes,
            copy.quality,
            copy.source,
            copy.hash,
            copy.first_seen_at,
            copy.last_seen_at,
            copy.missing_at
        ],
    )?;
    Ok(())
}