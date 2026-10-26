/*======> Reference By Comment <======
 * ===> 01 - Paths & Validation
 * ===> 02 - Export
 * ===> 03 - Import
 */

//=====> Paths & Validation <=====//

use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OpenFlags};
use tauri::AppHandle;

use crate::attachments;
use crate::Db;

fn stamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let date = time_parts(seconds);
    format!("{}-{:02}-{:02} {:02}-{:02}", date.0, date.1, date.2, date.3, date.4)
}

/// Small civil-date conversion so the backup folder name is readable without a date crate.
fn time_parts(seconds: u64) -> (i32, u32, u32, u32, u32) {
    let days = (seconds / 86_400) as i32;
    let remainder = seconds % 86_400;
    let (year, month, day) = civil_from_days(days);
    (
        year,
        month,
        day,
        (remainder / 3_600) as u32,
        ((remainder % 3_600) / 60) as u32,
    )
}

fn civil_from_days(days: i32) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    (y + i32::from(m <= 2), m as u32, d as u32)
}

fn validate_backup(path: &Path) -> Result<(), String> {
    let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("Could not open the backup: {error}"))?;
    let integrity: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if integrity != "ok" {
        return Err("The backup failed SQLite integrity check.".to_string());
    }
    for table in ["issues", "meta", "media_items"] {
        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                [table],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if count == 0 {
            return Err(format!("The backup is missing the {table} table."));
        }
    }
    Ok(())
}

fn copy_dir(source: &Path, target: &Path) -> Result<(), String> {
    if !source.is_dir() {
        return Ok(());
    }
    fs::create_dir_all(target).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let destination = target.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir(&entry.path(), &destination)?;
        } else {
            fs::copy(entry.path(), destination).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn vacuum_into(connection: &Connection, target: &Path) -> Result<(), String> {
    if target.exists() {
        fs::remove_file(target).map_err(|error| error.to_string())?;
    }
    let escaped = target.to_string_lossy().replace('\'', "''");
    connection
        .execute_batch(&format!("VACUUM INTO '{escaped}'"))
        .map_err(|error| error.to_string())
}

//=====> Export <=====//

pub fn export(app: &AppHandle, pool: &Db) -> Result<Option<String>, String> {
    let Some(parent) = rfd::FileDialog::new()
        .set_title("Choose where to save the Axiom backup")
        .pick_folder()
    else {
        return Ok(None);
    };

    let target = parent.join(format!("Axiom Backup {}", stamp()));
    fs::create_dir_all(&target).map_err(|error| error.to_string())?;
    let database = target.join("axiom.db");

    //===> Snapshot Workspace + Library <===//
    let connection = pool.0.lock().map_err(|error| error.to_string())?;
    vacuum_into(&connection, &database)?;

    //===> Copy Covers & Attachments <===//
    let root = attachments::data_root(app)?;
    copy_dir(&root.join("covers"), &target.join("covers"))?;
    copy_dir(&root.join("attachments"), &target.join("attachments"))?;

    Ok(Some(target.to_string_lossy().into_owned()))
}

//=====> Import <=====//

pub fn stage_import(app: &AppHandle) -> Result<Option<String>, String> {
    let Some(folder) = rfd::FileDialog::new()
        .set_title("Choose an Axiom backup folder")
        .pick_folder()
    else {
        return Ok(None);
    };

    let source_db = folder.join("axiom.db");
    if !source_db.exists() {
        return Err("That folder does not contain axiom.db.".to_string());
    }
    validate_backup(&source_db)?;

    let root = attachments::data_root(app)?;
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;

    //===> Stage The Database <===//
    let pending_db = root.join("axiom.db.import");
    let _ = fs::remove_file(&pending_db);
    fs::copy(&source_db, &pending_db).map_err(|error| error.to_string())?;

    //===> Stage Covers & Attachments <===//
    for name in ["covers", "attachments"] {
        let pending = root.join(format!("{name}.import"));
        if pending.exists() {
            fs::remove_dir_all(&pending).map_err(|error| error.to_string())?;
        }
        copy_dir(&folder.join(name), &pending)?;
    }

    Ok(Some(folder.to_string_lossy().into_owned()))
}

/// Applied before SQLite opens. A failed import never destroys the live database because the
/// current copy is parked beside it first.
pub fn apply_pending_import(data_dir: &Path) -> Result<(), String> {
    let pending = data_dir.join("axiom.db.import");
    if !pending.exists() {
        return Ok(());
    }

    let live = data_dir.join("axiom.db");
    if live.exists() {
        let backup = data_dir.join(format!("axiom.db.pre-import-{}", stamp()));
        fs::copy(&live, backup).map_err(|error| error.to_string())?;
        let _ = fs::remove_file(data_dir.join("axiom.db-wal"));
        let _ = fs::remove_file(data_dir.join("axiom.db-shm"));
        fs::remove_file(&live).map_err(|error| error.to_string())?;
    }
    fs::rename(&pending, &live).map_err(|error| error.to_string())?;

    //===> Swap Asset Folders <===//
    for name in ["covers", "attachments"] {
        let pending_dir = data_dir.join(format!("{name}.import"));
        if !pending_dir.exists() {
            continue;
        }
        let live_dir = data_dir.join(name);
        if live_dir.exists() {
            let backup = data_dir.join(format!("{name}.pre-import"));
            let _ = fs::remove_dir_all(&backup);
            let _ = fs::rename(&live_dir, backup);
        }
        fs::rename(&pending_dir, &live_dir).map_err(|error| error.to_string())?;
    }

    Ok(())
}


