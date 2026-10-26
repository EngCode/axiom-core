/*======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Storage & Shell
 */

//=====> Types <=====//

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentPayload {
    pub name: String,
    pub size: u64,
    pub path: String,
}

//=====> Storage & Shell <=====//

pub(crate) fn data_root(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(value) = std::env::var("AXIOM_DATA_DIR") {
        if !value.is_empty() {
            return Ok(PathBuf::from(value));
        }
    }
    if let Ok(value) = std::env::var("ORBIT_DATA_DIR") {
        if !value.is_empty() {
            return Ok(PathBuf::from(value));
        }
    }

    app.path()
        .app_data_dir()
        .map_err(|error| error.to_string())
}

fn attachments_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_root(app)?.join("attachments"))
}

fn safe_name(name: &str) -> String {
    name.chars()
        .map(|character| match character {
            '\\' | '/' | ':' | '*' | '"' | '<' | '>' | '|' => '_',
            _ => character,
        })
        .collect()
}

pub fn pick_and_copy(app: &AppHandle) -> Result<Option<AttachmentPayload>, String> {
    //===> Pick A File <===//
    let Some(source) = rfd::FileDialog::new()
        .set_title("Attach a file")
        .pick_file()
    else {
        return Ok(None);
    };

    //===> Copy Into App Data <===//
    let root = attachments_root(app)?;
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let original = source
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| "attachment".to_string());
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let name = format!("{stamp}-{}", safe_name(&original));
    let destination = root.join(&name);
    fs::copy(&source, &destination).map_err(|error| error.to_string())?;
    let size = fs::metadata(&destination)
        .map(|meta| meta.len())
        .unwrap_or(0);

    Ok(Some(AttachmentPayload {
        name: original,
        size,
        path: destination.to_string_lossy().into_owned(),
    }))
}

fn validated_path(app: &AppHandle, path: &str) -> Result<PathBuf, String> {
    let root = attachments_root(app)?;
    let candidate = Path::new(path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    if !candidate.starts_with(&root) {
        return Err("Attachment is outside the Axiom data folder.".to_string());
    }
    Ok(candidate)
}

pub fn open(app: &AppHandle, path: &str) -> Result<(), String> {
    let target = validated_path(app, path)?;
    Command::new("cmd")
        .args(["/C", "start", ""])
        .arg(target)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

pub fn remove(app: &AppHandle, path: &str) -> Result<(), String> {
    let target = validated_path(app, path)?;
    fs::remove_file(target).map_err(|error| error.to_string())
}
pub fn pick_cover(app: &AppHandle) -> Result<Option<String>, String> {
    //===> Pick An Image <===//
    let Some(source) = rfd::FileDialog::new()
        .set_title("Choose a poster")
        .add_filter("Images", &["png", "jpg", "jpeg", "webp"])
        .pick_file()
    else {
        return Ok(None);
    };

    //===> Copy Into App Data <===//
    let root = data_root(app)?.join("covers");
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let original = source
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| "cover.png".to_string());
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let name = format!("{stamp}-{}", safe_name(&original));
    let destination = root.join(name);
    fs::copy(&source, &destination).map_err(|error| error.to_string())?;
    Ok(Some(destination.to_string_lossy().into_owned()))
}

pub fn remove_cover(app: &AppHandle, path: &str) -> Result<(), String> {
    let root = data_root(app)?.join("covers");
    let candidate = Path::new(path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    if !candidate.starts_with(&root) {
        return Err("Cover is outside the Axiom data folder.".to_string());
    }
    fs::remove_file(candidate).map_err(|error| error.to_string())
}