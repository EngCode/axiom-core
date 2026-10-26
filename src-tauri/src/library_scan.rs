/*======> Reference By Comment <======
 * ===> 01 - Candidate
 * ===> 02 - Folder Pick & Scan
 */

//=====> Candidate <=====//

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanCandidate {
    pub path: String,
    pub rel_path: String,
    pub title: String,
    pub kind: String,
    pub size_bytes: u64,
    pub volume_root: String,
    pub volume_label: String,
}

//=====> Folder Pick & Scan <=====//

pub fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Choose a media folder")
        .pick_folder()
        .map(|path| path.to_string_lossy().into_owned())
}

fn volume_root(path: &Path) -> PathBuf {
    //===> Windows Drive Root <===//
    let text = path.to_string_lossy();
    if text.len() >= 2 && text.as_bytes()[1] == b':' {
        return PathBuf::from(format!("{}:\\", &text[..1]));
    }

    //===> Fall Back To The Folder Itself <===//
    path.to_path_buf()
}

fn classify(extension: &str, name: &str) -> Option<&'static str> {
    match extension {
        "mkv" | "mp4" | "avi" | "mov" | "m4v" | "webm" | "wmv" => {
            if looks_like_episode(name) {
                Some("series")
            } else {
                Some("movies")
            }
        }
        "epub" | "pdf" | "cbz" | "cbr" | "mobi" => Some("books"),
        "mp3" | "flac" | "m4a" | "wav" | "ogg" => Some("music"),
        _ => None,
    }
}

fn looks_like_episode(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    let mut index = 0;
    while index + 3 < bytes.len() {
        if bytes[index] == b's'
            && bytes[index + 1].is_ascii_digit()
            && bytes[index + 2].is_ascii_digit()
            && bytes[index + 3] == b'e'
        {
            return true;
        }
        index += 1;
    }
    false
}

fn clean_title(name: &str) -> String {
    let without_ext = Path::new(name)
        .file_stem()
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or_else(|| name.to_string());

    let spaced = without_ext.replace(['.', '_', '-'], " ");
    spaced.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn walk(dir: &Path, root: &Path, out: &mut Vec<ScanCandidate>, seen: &mut usize) {
    //===> Guard Clause: Scan Budget <===//
    if *seen >= 5000 {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();

        if name.starts_with('.') || name == "$RECYCLE.BIN" || name == "System Volume Information" {
            continue;
        }

        if path.is_dir() {
            walk(&path, root, out, seen);
            continue;
        }

        let extension = path
            .extension()
            .map(|value| value.to_string_lossy().to_ascii_lowercase())
            .unwrap_or_default();
        let Some(kind) = classify(&extension, &name) else {
            continue;
        };

        *seen += 1;
        let rel_path = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let size_bytes = entry.metadata().map(|meta| meta.len()).unwrap_or(0);

        out.push(ScanCandidate {
            path: path.to_string_lossy().into_owned(),
            rel_path,
            title: clean_title(&name),
            kind: kind.to_string(),
            size_bytes,
            volume_root: root.to_string_lossy().into_owned(),
            volume_label: root
                .to_string_lossy()
                .trim_end_matches('\\')
                .to_string(),
        });
    }
}

pub fn scan(folder: &str) -> Result<Vec<ScanCandidate>, String> {
    let path = PathBuf::from(folder);
    if !path.is_dir() {
        return Err("That folder does not exist.".to_string());
    }

    let root = volume_root(&path);
    let mut candidates = Vec::new();
    let mut seen = 0;
    walk(&path, &root, &mut candidates, &mut seen);
    candidates.sort_by(|left, right| left.rel_path.cmp(&right.rel_path));
    Ok(candidates)
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scans_and_classifies_supported_files() {
        let root = PathBuf::from("target").join(format!("scan-test-{}", std::process::id()));
        let season = root.join("Season 1");
        fs::create_dir_all(&season).unwrap();
        fs::write(root.join("Arrival.2016.mkv"), b"x").unwrap();
        fs::write(season.join("Show.S01E02.mp4"), b"x").unwrap();
        fs::write(root.join("book.epub"), b"x").unwrap();
        fs::write(root.join("notes.txt"), b"x").unwrap();

        let found = scan(root.to_str().unwrap()).unwrap();
        assert_eq!(found.len(), 3);
        assert!(found.iter().any(|item| item.kind == "movies"));
        assert!(found.iter().any(|item| item.kind == "series"));
        assert!(found.iter().any(|item| item.kind == "books"));
        assert!(found.iter().all(|item| !item.rel_path.contains('\\')));

        fs::remove_dir_all(root).ok();
    }
}