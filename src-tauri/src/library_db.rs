/*======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Categories & Roots
 * ===> 03 - Import
 * ===> 04 - Rebuild
 * ===> 05 - Overview
 * ===> 06 - Query
 * ===> 07 - Item Detail
 */

//=====> Types <=====//

use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::{Path, PathBuf};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Result as SqlResult};
use serde::Serialize;

use crate::data::models::{
    LibraryCard, LibraryCategoryCount, LibraryCopyView, LibraryCount, LibraryItemDetail,
    LibraryOverview, LibraryPage, LibraryQuery, LibrarySeasonView, LibraryVolumeCount,
    MediaCategory, ScanRoot,
};
use crate::library_scan::{self, ScanConfig, ScanFile, ScanGroup};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRootPreview {
    pub id: String,
    pub path: String,
    pub kind: String,
    pub category: Option<String>,
    pub exists: bool,
    pub group_count: usize,
    pub file_count: usize,
    pub total_size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildPreview {
    pub roots: Vec<ScanRootPreview>,
    pub groups: Vec<library_scan::ScanGroupSummary>,
    pub total_groups: usize,
    pub total_files: usize,
    pub total_size_bytes: u64,
    pub episode_count: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub items: i64,
    pub copies: i64,
    pub removed_items: i64,
    pub removed_copies: i64,
    pub backup_path: Option<String>,
    pub duration_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRunSummary {
    pub id: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub kind: String,
    pub status: String,
    pub item_count: i64,
    pub copy_count: i64,
    pub message: String,
}

//===> Scan Plan <===//

pub struct PlannedRoot {
    pub root: ScanRoot,
    pub config: ScanConfig,
    pub category_key: Option<String>,
}

/// Everything the importer needs, computed without holding the database lock.
pub struct ScanPlan {
    pub roots: Vec<PlannedRoot>,
    pub groups: Vec<ScanGroup>,
    pub warnings: Vec<String>,
}

//=====> Categories & Roots <=====//

pub fn categories(connection: &Connection) -> SqlResult<Vec<MediaCategory>> {
    let mut statement = connection.prepare(
        "SELECT id, key, name, sort_order, hidden, applies_to
         FROM media_categories ORDER BY sort_order, name",
    )?;
    let rows = statement
        .query_map([], |row| {
            let applies_to: String = row.get(5)?;
            Ok(MediaCategory {
                id: row.get(0)?,
                key: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
                hidden: row.get::<_, i64>(4)? != 0,
                applies_to: serde_json::from_str(&applies_to).unwrap_or_default(),
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;
    Ok(rows)
}

pub fn category_keys(connection: &Connection) -> SqlResult<HashMap<String, String>> {
    let mut statement = connection.prepare("SELECT id, key FROM media_categories")?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<SqlResult<HashMap<_, _>>>()?;
    Ok(rows)
}

pub fn roots(connection: &Connection) -> SqlResult<Vec<ScanRoot>> {
    let mut statement = connection.prepare(
        "SELECT id, path, volume_id, kind, category_id, depth, last_scan_at, created_at
         FROM scan_roots ORDER BY path",
    )?;
    let rows = statement
        .query_map([], |row| {
            Ok(ScanRoot {
                id: row.get(0)?,
                path: row.get(1)?,
                volume_id: row.get(2)?,
                kind: row.get(3)?,
                category_id: row.get(4)?,
                depth: row.get(5)?,
                last_scan_at: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;
    Ok(rows)
}

pub fn save_root(
    connection: &Connection,
    path: &str,
    kind: &str,
    category_id: Option<&str>,
    depth: i64,
) -> SqlResult<ScanRoot> {
    let path = path.trim_end_matches(['/', '\\']).to_string();
    if path.is_empty() {
        return Err(rusqlite::Error::InvalidParameterName(
            "scan root path is empty".to_string(),
        ));
    }
    let id = format!("root-{}", library_scan::stable_id(&path));
    let volume_id = ensure_volume(connection, Path::new(&path))?;
    connection.execute(
        "INSERT INTO scan_roots (id, path, volume_id, kind, category_id, depth, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
            path = excluded.path,
            volume_id = excluded.volume_id,
            kind = excluded.kind,
            category_id = excluded.category_id,
            depth = excluded.depth",
        params![id, path, volume_id, kind, category_id, depth],
    )?;
    Ok(ScanRoot {
        id,
        path,
        volume_id: Some(volume_id),
        kind: kind.to_string(),
        category_id: category_id.map(str::to_string),
        depth,
        last_scan_at: None,
        created_at: String::new(),
    })
}

pub fn delete_root(connection: &Connection, id: &str) -> SqlResult<()> {
    connection.execute("DELETE FROM scan_roots WHERE id = ?1", params![id])?;
    Ok(())
}

fn mount_of(path: &Path) -> String {
    let text = path.to_string_lossy();
    if text.len() >= 3 && text.as_bytes()[1] == b':' {
        return format!("{}:\\", &text[..1]);
    }
    let mut components = path.components();
    match components.next() {
        Some(std::path::Component::RootDir) => "/".to_string(),
        Some(std::path::Component::Prefix(prefix)) => {
            prefix.as_os_str().to_string_lossy().into_owned()
        }
        _ => text.into_owned(),
    }
}

/// Path of a scan root relative to its volume mount, with `/` separators. Copies
/// store volume-relative paths, so `UNIQUE(volume_id, rel_path)` still means
/// "one file" when two roots share a drive.
fn root_prefix(path: &Path) -> String {
    let mount = mount_of(path).replace('\\', "/");
    let text = path.to_string_lossy().replace('\\', "/");
    text.strip_prefix(mount.trim_end_matches('/'))
        .map(|rest| rest.trim_matches('/').to_string())
        .unwrap_or_default()
}

fn volume_rel_path(prefix: &str, rel_path: &str) -> String {
    let rel_path = rel_path.trim_start_matches('/');
    if prefix.is_empty() {
        rel_path.to_string()
    } else {
        format!("{prefix}/{rel_path}")
    }
}

fn ensure_volume(connection: &Connection, path: &Path) -> SqlResult<String> {
    let mount = mount_of(path);
    if let Some(existing) = connection
        .query_row(
            "SELECT id FROM volumes WHERE mount_path = ?1 LIMIT 1",
            params![mount],
            |row| row.get::<_, String>(0),
        )
        .optional()?
    {
        return Ok(existing);
    }
    let id = format!("vol-{}", library_scan::stable_id(&mount));
    let label = mount.trim_end_matches(['/', '\\']).to_string();
    connection.execute(
        "INSERT OR IGNORE INTO volumes (id, label, mount_path, type, last_seen_at)
         VALUES (?1, ?2, ?3, 'external', datetime('now'))",
        params![id, label, mount],
    )?;
    Ok(id)
}

//=====> Import <=====//

fn category_id(category_key: &Option<String>) -> Option<String> {
    category_key
        .as_ref()
        .filter(|key| !key.is_empty())
        .map(|key| format!("cat-{key}"))
}

/// Writes grouped scan results. Items keep their user fields (cover, notes,
/// rating, status) across a rescan because only derived columns are updated.
fn write_groups(
    transaction: &rusqlite::Transaction<'_>,
    groups: &[ScanGroup],
    volume_by_root: &HashMap<String, (String, String)>,
) -> SqlResult<(i64, i64)> {
    let mut items = 0i64;
    let mut copies = 0i64;

    for group in groups {
        let Some((volume_id, prefix)) = volume_by_root.get(&group.volume_root) else {
            continue;
        };
        let item_id = format!("item-{}", library_scan::stable_id(&group.key));
        let category = category_id(&group.category);
        let sort_title = group.title.to_lowercase();
        let attributes = serde_json::json!({
            "source": "scan",
            "seasons": group.season_count,
            "episodes": group.episode_count,
        })
        .to_string();

        transaction.execute(
            "INSERT INTO media_items
                (id, kind_id, title, sort_title, original_title, year, status, rating, notes,
                 attributes_json, cover_path, provider_ids_json, created_at, updated_at,
                 category_id, external_key, folder_path, primary_path,
                 copy_count, episode_count, season_count, total_size_bytes)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, 'acquired', NULL, '',
                     ?6, NULL, '{}', datetime('now'), datetime('now'),
                     ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(id) DO UPDATE SET
                kind_id = excluded.kind_id,
                title = excluded.title,
                sort_title = excluded.sort_title,
                year = excluded.year,
                attributes_json = excluded.attributes_json,
                updated_at = datetime('now'),
                category_id = excluded.category_id,
                external_key = excluded.external_key,
                folder_path = excluded.folder_path,
                primary_path = excluded.primary_path,
                copy_count = excluded.copy_count,
                episode_count = excluded.episode_count,
                season_count = excluded.season_count,
                total_size_bytes = excluded.total_size_bytes",
            params![
                item_id,
                format!("kind-{}", group.kind),
                group.title,
                sort_title,
                group.year,
                attributes,
                category,
                group.key,
                group.folder_path,
                group.primary_path,
                group.copy_count as i64,
                group.episode_count as i64,
                group.season_count as i64,
                group.total_size_bytes as i64
            ],
        )?;
        items += 1;

        //===> Missing File Reconciliation <===//
        let mut existing = transaction.prepare(
            "SELECT id, rel_path FROM media_copies WHERE item_id = ?1 AND volume_id = ?2",
        )?;
        let previous = existing
            .query_map(params![item_id, volume_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?
            .collect::<SqlResult<Vec<_>>>()?;
        drop(existing);

        let files: Vec<(String, &ScanFile)> = group
            .files
            .iter()
            .map(|file| (volume_rel_path(prefix, &file.rel_path), file))
            .collect();
        let scanned: BTreeSet<&str> = files.iter().map(|(rel, _)| rel.as_str()).collect();
        for (copy_id, rel_path) in previous {
            if !scanned.contains(rel_path.as_str()) {
                transaction.execute(
                    "UPDATE media_copies SET missing_at = datetime('now') WHERE id = ?1",
                    params![copy_id],
                )?;
            }
        }

        for (rel_path, file) in &files {
            let copy_id = format!(
                "copy-{}",
                library_scan::stable_id(&format!("{volume_id}|{rel_path}"))
            );
            transaction.execute(
                "INSERT INTO media_copies
                    (id, item_id, volume_id, rel_path, size_bytes, quality, source, hash,
                     first_seen_at, last_seen_at, missing_at,
                     season_number, season_label, episode)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'scan', NULL,
                         datetime('now'), datetime('now'), NULL, ?7, ?8, ?9)
                 ON CONFLICT(volume_id, rel_path) DO UPDATE SET
                    item_id = excluded.item_id,
                    size_bytes = excluded.size_bytes,
                    quality = excluded.quality,
                    source = excluded.source,
                    last_seen_at = datetime('now'),
                    missing_at = NULL,
                    season_number = excluded.season_number,
                    season_label = excluded.season_label,
                    episode = excluded.episode",
                params![
                    copy_id,
                    item_id,
                    volume_id,
                    rel_path,
                    file.size_bytes as i64,
                    file.quality,
                    file.season_number,
                    file.season_label,
                    file.episode
                ],
            )?;
            copies += 1;
        }
    }

    Ok((items, copies))
}

//=====> Rebuild <=====//

/// Scans every registered root. No writes, no lock needed: the caller holds the
/// connection only long enough to read the roots.
pub fn plan(roots: &[ScanRoot], category_keys: &HashMap<String, String>) -> ScanPlan {
    let mut planned = Vec::new();
    let mut groups: Vec<ScanGroup> = Vec::new();
    let mut warnings = Vec::new();

    for root in roots {
        let category_key = root
            .category_id
            .as_ref()
            .and_then(|id| category_keys.get(id).cloned());
        let kind = if root.kind == "auto" {
            "all".to_string()
        } else {
            root.kind.clone()
        };
        let depth = if root.depth <= 0 {
            library_scan::MAX_DEPTH
        } else {
            root.depth as u32
        };
        let config = ScanConfig {
            path: PathBuf::from(&root.path),
            kind: kind.clone(),
            category: category_key.clone(),
            depth,
        };
        if !config.path.is_dir() {
            warnings.push(format!("Root is offline or missing: {}", root.path));
            planned.push(PlannedRoot {
                root: root.clone(),
                config,
                category_key,
            });
            continue;
        }
        match library_scan::scan(&config) {
            Ok(found) => {
                groups.extend(found);
                planned.push(PlannedRoot {
                    root: root.clone(),
                    config,
                    category_key,
                });
            }
            Err(error) => warnings.push(format!("{}: {error}", root.path)),
        }
    }

    groups.sort_by(|left, right| {
        left.title
            .to_lowercase()
            .cmp(&right.title.to_lowercase())
            .then(left.kind.cmp(&right.kind))
    });
    ScanPlan {
        roots: planned,
        groups,
        warnings,
    }
}

fn timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("{seconds}")
}

/// A rebuild is destructive, so a copy of the database is written first. The
/// file is a clean `VACUUM INTO`, not a raw copy of a live WAL database.
pub fn backup_database(connection: &Connection, data_dir: &Path) -> Result<String, String> {
    let folder = data_dir.join("backups");
    std::fs::create_dir_all(&folder).map_err(|error| error.to_string())?;
    let target = folder.join(format!("axiom-before-rebuild-{}.db", timestamp()));
    let escaped = target.to_string_lossy().replace('\'', "''");
    connection
        .execute_batch(&format!("VACUUM INTO '{escaped}'"))
        .map_err(|error| error.to_string())?;
    Ok(target.to_string_lossy().into_owned())
}

pub fn apply_plan(connection: &mut Connection, plan: &ScanPlan) -> Result<ImportSummary, String> {
    //===> Guard Clause: Offline Roots <===//
    // The rebuild replaces the whole index. Importing from a plan with a failed
    // or offline root would silently drop that root's titles, so it is refused.
    if !plan.warnings.is_empty() {
        return Err(format!(
            "Rebuild stopped: {} scan root(s) could not be read. Reconnect the drive or remove the root, then try again. {}",
            plan.warnings.len(),
            plan.warnings.join("; ")
        ));
    }
    write_plan(connection, plan).map_err(|error| error.to_string())
}

fn write_plan(connection: &mut Connection, plan: &ScanPlan) -> SqlResult<ImportSummary> {
    let started = Instant::now();

    let mut volume_by_root: HashMap<String, (String, String)> = HashMap::new();

    //===> Resolve Volumes Before The Import Transaction <===//
    for planned in &plan.roots {
        let existing = planned.root.volume_id.clone().filter(|id| {
            connection
                .query_row("SELECT 1 FROM volumes WHERE id = ?1", params![id], |_| {
                    Ok(())
                })
                .optional()
                .ok()
                .flatten()
                .is_some()
        });
        let volume_id = match existing {
            Some(id) => id,
            None => ensure_volume(connection, &planned.config.path)?,
        };
        volume_by_root.insert(
            planned.root.path.clone(),
            (volume_id, root_prefix(&planned.config.path)),
        );
    }

    //===> Replace The Index In One Transaction <===//
    // Either the whole rebuild lands or none of it does: a failed import must
    // never leave the library empty with the backup sitting on disk.
    let transaction = connection.transaction()?;

    let removed_copies: i64 =
        transaction.query_row("SELECT COUNT(*) FROM media_copies", [], |row| row.get(0))?;
    let removed_items: i64 =
        transaction.query_row("SELECT COUNT(*) FROM media_items", [], |row| row.get(0))?;

    //===> Keep Per-Item User Fields <===//
    // A rebuild replaces the scanner's rows, but notes, ratings, status and
    // covers belong to the user. Item ids are stable, so they are restored by id
    // after the rescan.
    let user_fields = {
        let mut statement = transaction.prepare(
            "SELECT id, status, rating, notes, cover_path, original_title, provider_ids_json
             FROM media_items",
        )?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<f64>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, String>(6)?,
                ))
            })?
            .collect::<SqlResult<Vec<_>>>()?;
        rows
    };

    transaction.execute("DELETE FROM media_copies", [])?;
    transaction.execute("DELETE FROM media_items", [])?;

    let (items, copies) = write_groups(&transaction, &plan.groups, &volume_by_root)?;

    for (id, status, rating, notes, cover_path, original_title, provider_ids) in user_fields {
        transaction.execute(
            "UPDATE media_items
             SET status = ?2, rating = ?3, notes = ?4, cover_path = ?5,
                 original_title = ?6, provider_ids_json = ?7
             WHERE id = ?1",
            params![
                id,
                status,
                rating,
                notes,
                cover_path,
                original_title,
                provider_ids
            ],
        )?;
    }

    for planned in &plan.roots {
        transaction.execute(
            "UPDATE scan_roots SET last_scan_at = datetime('now') WHERE id = ?1",
            params![planned.root.id],
        )?;
    }

    transaction.execute(
        "INSERT INTO scan_runs
            (id, started_at, finished_at, kind, status, root_count, item_count, copy_count, message)
         VALUES (?1, datetime('now'), datetime('now'), 'rebuild', 'ok', ?2, ?3, ?4, ?5)",
        params![
            format!("run-{}", library_scan::stable_id(&timestamp())),
            plan.roots.len() as i64,
            items,
            copies,
            plan.warnings.join("; ")
        ],
    )?;

    transaction.commit()?;

    Ok(ImportSummary {
        items,
        copies,
        removed_items,
        removed_copies,
        backup_path: None,
        duration_ms: started.elapsed().as_millis(),
    })
}

pub fn preview(plan: &ScanPlan) -> RebuildPreview {
    let mut roots = Vec::new();
    for planned in &plan.roots {
        let groups: Vec<&ScanGroup> = plan
            .groups
            .iter()
            .filter(|group| group.volume_root == planned.root.path)
            .collect();
        roots.push(ScanRootPreview {
            id: planned.root.id.clone(),
            path: planned.root.path.clone(),
            kind: planned.config.kind.clone(),
            category: planned.category_key.clone(),
            exists: planned.config.path.is_dir(),
            group_count: groups.len(),
            file_count: groups.iter().map(|group| group.copy_count).sum(),
            total_size_bytes: groups.iter().map(|group| group.total_size_bytes).sum(),
        });
    }

    RebuildPreview {
        roots,
        total_groups: plan.groups.len(),
        total_files: plan.groups.iter().map(|group| group.copy_count).sum(),
        total_size_bytes: plan.groups.iter().map(|group| group.total_size_bytes).sum(),
        episode_count: plan.groups.iter().map(|group| group.episode_count).sum(),
        groups: plan.groups.iter().map(ScanGroup::summary).collect(),
        warnings: plan.warnings.clone(),
    }
}

pub fn recent_runs(connection: &Connection) -> SqlResult<Vec<ScanRunSummary>> {
    let mut statement = connection.prepare(
        "SELECT id, started_at, finished_at, kind, status, item_count, copy_count, message
         FROM scan_runs ORDER BY started_at DESC LIMIT 10",
    )?;
    let rows = statement
        .query_map([], |row| {
            Ok(ScanRunSummary {
                id: row.get(0)?,
                started_at: row.get(1)?,
                finished_at: row.get(2)?,
                kind: row.get(3)?,
                status: row.get(4)?,
                item_count: row.get(5)?,
                copy_count: row.get(6)?,
                message: row.get(7)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;
    Ok(rows)
}

//=====> Overview <=====//

pub fn overview(connection: &Connection) -> SqlResult<LibraryOverview> {
    let (total_items, total_copies, total_size_bytes) = connection.query_row(
        "SELECT COUNT(*), COALESCE(SUM(copy_count), 0), COALESCE(SUM(total_size_bytes), 0)
         FROM media_items",
        [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let mut kind_statement = connection.prepare(
        "SELECT k.key, k.name, COUNT(i.id)
         FROM media_kinds k
         LEFT JOIN media_items i ON i.kind_id = k.id
         WHERE k.hidden = 0
         GROUP BY k.id
         ORDER BY k.sort_order, k.name",
    )?;
    let kinds = kind_statement
        .query_map([], |row| {
            Ok(LibraryCount {
                key: row.get(0)?,
                name: row.get(1)?,
                count: row.get(2)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    let mut grouped_statement = connection.prepare(
        "SELECT i.category_id, k.key, COUNT(*)
         FROM media_items i
         JOIN media_kinds k ON k.id = i.kind_id
         GROUP BY i.category_id, k.key",
    )?;
    let grouped = grouped_statement
        .query_map([], |row| {
            Ok((
                row.get::<_, Option<String>>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    let mut by_category: HashMap<String, HashMap<String, i64>> = HashMap::new();
    for (category_id, kind_key, count) in grouped {
        let key = category_id.unwrap_or_else(|| "uncategorized".to_string());
        by_category.entry(key).or_default().insert(kind_key, count);
    }

    let categories = categories(connection)?
        .into_iter()
        .map(|category| {
            let by_kind = by_category.remove(&category.id).unwrap_or_default();
            LibraryCategoryCount {
                count: by_kind.values().sum(),
                id: category.id,
                key: category.key,
                name: category.name,
                sort_order: category.sort_order,
                hidden: category.hidden,
                applies_to: category.applies_to,
                by_kind,
            }
        })
        .collect();

    let mut volume_statement = connection.prepare(
        "SELECT v.id, v.label, v.mount_path,
                COUNT(DISTINCT c.item_id), COUNT(c.id), COALESCE(SUM(c.size_bytes), 0)
         FROM volumes v
         LEFT JOIN media_copies c ON c.volume_id = v.id
         GROUP BY v.id
         ORDER BY v.label",
    )?;
    let volumes = volume_statement
        .query_map([], |row| {
            Ok(LibraryVolumeCount {
                id: row.get(0)?,
                label: row.get(1)?,
                mount_path: row.get(2)?,
                item_count: row.get(3)?,
                copy_count: row.get(4)?,
                total_size_bytes: row.get(5)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    Ok(LibraryOverview {
        total_items,
        total_copies,
        total_size_bytes,
        kinds,
        categories,
        volumes,
        roots: roots(connection)?,
    })
}

//=====> Query <=====//

fn card_columns() -> &'static str {
    "i.id, i.kind_id, k.key AS kind_key, i.category_id, c.key AS category_key,
     c.name AS category_name, i.title, i.year, i.status, i.cover_path, i.folder_path,
     i.primary_path, i.copy_count, i.episode_count, i.season_count, i.total_size_bytes,
     i.updated_at"
}

fn row_to_card(row: &rusqlite::Row<'_>) -> SqlResult<LibraryCard> {
    Ok(LibraryCard {
        id: row.get(0)?,
        kind_id: row.get(1)?,
        kind_key: row.get(2)?,
        category_id: row.get(3)?,
        category_key: row.get(4)?,
        category_name: row.get(5)?,
        title: row.get(6)?,
        year: row.get(7)?,
        status: row.get(8)?,
        cover_path: row.get(9)?,
        folder_path: row.get(10)?,
        primary_path: row.get(11)?,
        copy_count: row.get(12)?,
        episode_count: row.get(13)?,
        season_count: row.get(14)?,
        total_size_bytes: row.get(15)?,
        updated_at: row.get(16)?,
    })
}

fn normalize_id(value: &str, prefix: &str) -> String {
    if value.starts_with(prefix) {
        value.to_string()
    } else {
        format!("{prefix}{value}")
    }
}

pub fn query(connection: &Connection, request: &LibraryQuery) -> SqlResult<LibraryPage> {
    let mut clauses: Vec<String> = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(kind) = request
        .kind
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        clauses.push("i.kind_id = ?".to_string());
        values.push(normalize_id(kind, "kind-"));
    }
    if let Some(category) = request
        .category
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        clauses.push("i.category_id = ?".to_string());
        values.push(normalize_id(category, "cat-"));
    }
    if let Some(status) = request
        .status
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        clauses.push("i.status = ?".to_string());
        values.push(status.to_string());
    }
    if let Some(volume) = request
        .volume
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        clauses.push(
            "EXISTS (SELECT 1 FROM media_copies cp WHERE cp.item_id = i.id AND cp.volume_id = ?)"
                .to_string(),
        );
        values.push(volume.to_string());
    }
    if let Some(search) = request
        .search
        .as_ref()
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty())
    {
        clauses.push(
            "(LOWER(i.title) LIKE ? OR LOWER(COALESCE(i.folder_path, '')) LIKE ? OR LOWER(COALESCE(i.primary_path, '')) LIKE ?)".to_string(),
        );
        let needle = format!("%{search}%");
        values.push(needle.clone());
        values.push(needle.clone());
        values.push(needle);
    }

    let where_sql = if clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", clauses.join(" AND "))
    };

    let total: i64 = connection.query_row(
        &format!("SELECT COUNT(*) FROM media_items i {where_sql}"),
        params_from_iter(values.iter()),
        |row| row.get(0),
    )?;

    let page_size = request.page_size.unwrap_or(60).clamp(12, 200);
    let page = request.page.unwrap_or(1).max(1);
    let offset = (page - 1) * page_size;
    let page_count = if total == 0 {
        0
    } else {
        (total + page_size - 1) / page_size
    };

    let order_sql = match request.sort.as_deref().unwrap_or("title") {
        "recent" => "i.updated_at DESC, i.title COLLATE NOCASE ASC",
        "size" => "i.total_size_bytes DESC, i.title COLLATE NOCASE ASC",
        "episodes" => "i.episode_count DESC, i.title COLLATE NOCASE ASC",
        _ => "COALESCE(i.sort_title, LOWER(i.title)) ASC",
    };

    let sql = format!(
        "SELECT {}
         FROM media_items i
         JOIN media_kinds k ON k.id = i.kind_id
         LEFT JOIN media_categories c ON c.id = i.category_id
         {where_sql}
         ORDER BY {order_sql}
         LIMIT ? OFFSET ?",
        card_columns()
    );

    let mut page_values = values.clone();
    page_values.push(page_size.to_string());
    page_values.push(offset.to_string());

    let mut statement = connection.prepare(&sql)?;
    let items = statement
        .query_map(params_from_iter(page_values.iter()), row_to_card)?
        .collect::<SqlResult<Vec<_>>>()?;

    Ok(LibraryPage {
        items,
        total,
        page,
        page_size,
        page_count,
    })
}

//=====> Item Detail <=====//

pub fn item_detail(connection: &Connection, id: &str) -> SqlResult<Option<LibraryItemDetail>> {
    let sql = format!(
        "SELECT {}
         FROM media_items i
         JOIN media_kinds k ON k.id = i.kind_id
         LEFT JOIN media_categories c ON c.id = i.category_id
         WHERE i.id = ?1",
        card_columns()
    );
    let card = connection
        .query_row(&sql, params![id], row_to_card)
        .optional()?;
    let Some(card) = card else {
        return Ok(None);
    };

    let (notes, rating, original_title) = connection.query_row(
        "SELECT notes, rating, original_title FROM media_items WHERE id = ?1",
        params![id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<f64>>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        },
    )?;

    let mut statement = connection.prepare(
        "SELECT c.id, c.volume_id, COALESCE(v.label, v.mount_path, ''), c.rel_path,
                c.size_bytes, c.quality, c.season_label, c.season_number, c.episode, c.missing_at
         FROM media_copies c
         LEFT JOIN volumes v ON v.id = c.volume_id
         WHERE c.item_id = ?1
         ORDER BY COALESCE(c.season_number, 0), COALESCE(c.episode, 0), c.rel_path",
    )?;
    let rows = statement
        .query_map(params![id], |row| {
            Ok((
                LibraryCopyView {
                    id: row.get(0)?,
                    volume_id: row.get(1)?,
                    volume_label: row.get(2)?,
                    rel_path: row.get(3)?,
                    size_bytes: row.get(4)?,
                    quality: row.get(5)?,
                    season: row.get(6)?,
                    episode: row.get(8)?,
                    missing_at: row.get(9)?,
                },
                row.get::<_, Option<i64>>(7)?,
            ))
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    let mut seasons: BTreeMap<i64, (String, BTreeSet<i64>, i64)> = BTreeMap::new();
    for (copy, season_number) in &rows {
        let number = season_number.unwrap_or(0);
        let label = copy.season.clone().unwrap_or_else(|| {
            if number == 0 {
                "Unseasoned".to_string()
            } else {
                format!("Season {number}")
            }
        });
        let entry = seasons
            .entry(number)
            .or_insert_with(|| (label, BTreeSet::new(), 0));
        if let Some(episode) = copy.episode {
            entry.1.insert(episode);
        }
        entry.2 += copy.size_bytes.unwrap_or(0);
    }

    let seasons = seasons
        .into_iter()
        .map(|(number, (label, episodes, size))| LibrarySeasonView {
            label,
            number,
            episode_count: episodes.len() as i64,
            total_size_bytes: size,
        })
        .collect();

    Ok(Some(LibraryItemDetail {
        item: card,
        notes,
        rating,
        original_title,
        seasons,
        copies: rows.into_iter().map(|(copy, _)| copy).collect(),
    }))
}

/// Attach a poster to one item, or clear it with `None`. Cover files themselves
/// are copied by the attachments module; this only stores the resulting path.
pub fn set_cover(connection: &Connection, id: &str, path: Option<&str>) -> SqlResult<()> {
    connection.execute(
        "UPDATE media_items SET cover_path = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, path, timestamp()],
    )?;
    Ok(())
}

//=====> Tests <=====//

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copies_are_stored_relative_to_the_volume() {
        assert_eq!(volume_rel_path("", "Show/S01E01.mkv"), "Show/S01E01.mkv");
        assert_eq!(
            volume_rel_path("Movies Library", "English/Action/A.mp4"),
            "Movies Library/English/Action/A.mp4"
        );
        assert_eq!(
            volume_rel_path("Movies Library", "/A.mp4"),
            "Movies Library/A.mp4"
        );
    }

    #[cfg(windows)]
    #[test]
    fn root_prefix_is_relative_to_the_drive() {
        assert_eq!(
            root_prefix(Path::new("D:\\Movies Library")),
            "Movies Library"
        );
        assert_eq!(
            root_prefix(Path::new("D:\\Movies Library\\English")),
            "Movies Library/English"
        );
        assert_eq!(root_prefix(Path::new("D:\\")), "");
    }

    /// Manual rehearsal against a real database copy. Run with:
    /// `$env:AXIOM_REBUILD_DB='..\.axiom-data\dev\axiom.db'; cargo test --lib rebuild_dev -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn rebuild_dev_database() {
        let Ok(path) = std::env::var("AXIOM_REBUILD_DB") else {
            eprintln!("AXIOM_REBUILD_DB is not set");
            return;
        };
        let mut connection = crate::data::db::open(Path::new(&path)).expect("open database");

        let categories = categories(&connection).expect("categories");
        println!(
            "categories: {:?}",
            categories
                .iter()
                .map(|item| (&item.key, &item.name))
                .collect::<Vec<_>>()
        );

        let roots = roots(&connection).expect("roots");
        println!(
            "roots: {:?}",
            roots
                .iter()
                .map(|root| (&root.path, &root.kind, &root.category_id))
                .collect::<Vec<_>>()
        );

        let keys = category_keys(&connection).expect("keys");
        let plan = plan(&roots, &keys);
        let preview = preview(&plan);
        println!(
            "plan: {} groups, {} files, {} episodes, {} bytes",
            preview.total_groups,
            preview.total_files,
            preview.episode_count,
            preview.total_size_bytes
        );
        if !preview.warnings.is_empty() {
            println!("warnings: {:?}", preview.warnings);
        }

        for root in &preview.roots {
            println!(
                "  root {} -> {} groups / {} files (exists: {})",
                root.path, root.group_count, root.file_count, root.exists
            );
        }

        for group in plan.groups.iter().take(40) {
            println!(
                "  [{}] {} | {:?} | {} episodes / {} seasons | {} files",
                group.kind,
                group.title,
                group.category,
                group.episode_count,
                group.season_count,
                group.copy_count
            );
        }

        let summary = apply_plan(&mut connection, &plan).expect("apply");
        println!(
            "imported: {} items, {} copies (removed {} / {})",
            summary.items, summary.copies, summary.removed_items, summary.removed_copies
        );

        let report = overview(&connection).expect("overview");
        println!(
            "overview: {} items, {} copies, kinds {:?}",
            report.total_items,
            report.total_copies,
            report
                .kinds
                .iter()
                .map(|kind| (&kind.key, kind.count))
                .collect::<Vec<_>>()
        );
        for category in &report.categories {
            println!(
                "  category {}: {} items, by kind {:?}",
                category.key, category.count, category.by_kind
            );
        }
    }
}
