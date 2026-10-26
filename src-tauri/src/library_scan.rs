/*======> Reference By Comment <======
 * ===> 01 - Candidate
 * ===> 02 - Classification
 * ===> 03 - Folder Pick & Scan
 * ===> 04 - Tests
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

const MAX_FILES: usize = 5000;
const MAX_DEPTH: u32 = 8;

//=====> Classification <=====//

fn is_video(extension: &str) -> bool {
    matches!(
        extension,
        "mkv" | "mp4" | "avi" | "mov" | "m4v" | "webm" | "wmv"
    )
}

fn is_book(extension: &str) -> bool {
    matches!(extension, "epub" | "pdf" | "cbz" | "cbr" | "mobi")
}

fn is_music(extension: &str) -> bool {
    matches!(extension, "mp3" | "flac" | "m4a" | "wav" | "ogg")
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

fn file_kind(extension: &str, file_name: &str, requested: &str) -> Option<&'static str> {
    if is_video(extension) {
        return Some(match requested {
            "series" => "series",
            "anime" => "anime",
            "movies" => "movies",
            _ if looks_like_episode(file_name) => "series",
            _ => "movies",
        });
    }
    if is_book(extension) {
        return Some("books");
    }
    if is_music(extension) {
        return Some("music");
    }
    None
}

fn clean_title(name: &str) -> String {
    let without_ext = Path::new(name)
        .file_stem()
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or_else(|| name.to_string());

    let spaced = without_ext.replace(['.', '_', '-'], " ");
    spaced.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn skip_dir(name: &str) -> bool {
    if name.starts_with('.') {
        return true;
    }
    matches!(
        name.to_ascii_lowercase().as_str(),
        "$recycle.bin" | "system volume information" | "md5" | "dlc" | "mods" | "_download" | "glist"
    )
}

//=====> Folder Pick & Scan <=====//

pub fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Choose a media folder")
        .pick_folder()
        .map(|path| path.to_string_lossy().into_owned())
}

fn volume_root(path: &Path) -> PathBuf {
    let text = path.to_string_lossy();
    if text.len() >= 2 && text.as_bytes()[1] == b':' {
        return PathBuf::from(format!("{}:\\", &text[..1]));
    }
    path.to_path_buf()
}

fn push_file(path: &Path, root: &Path, requested: &str, out: &mut Vec<ScanCandidate>) {
    let name = path
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_default();
    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let Some(kind) = file_kind(&extension, &name, requested) else {
        return;
    };

    let rel_path = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/");
    let size_bytes = fs::metadata(path).map(|meta| meta.len()).unwrap_or(0);

    out.push(ScanCandidate {
        path: path.to_string_lossy().into_owned(),
        rel_path,
        title: clean_title(&name),
        kind: kind.to_string(),
        size_bytes,
        volume_root: root.to_string_lossy().into_owned(),
        volume_label: root.to_string_lossy().trim_end_matches('\\').to_string(),
    });
}

fn walk_files(
    dir: &Path,
    root: &Path,
    requested: &str,
    depth_left: u32,
    out: &mut Vec<ScanCandidate>,
) {
    if out.len() >= MAX_FILES {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if skip_dir(&name) {
            continue;
        }

        if path.is_dir() {
            if depth_left > 0 {
                walk_files(&path, root, requested, depth_left - 1, out);
            }
            continue;
        }

        push_file(&path, root, requested, out);
    }
}

fn collect_games(
    dir: &Path,
    root: &Path,
    depth: u32,
    current: u32,
    out: &mut Vec<ScanCandidate>,
) {
    if out.len() >= MAX_FILES {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if skip_dir(&name) || !path.is_dir() {
            continue;
        }

        //===> Include At The Requested Depth <===//
        if current + 1 >= depth {
            let rel_path = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");
            out.push(ScanCandidate {
                path: path.to_string_lossy().into_owned(),
                rel_path,
                title: name,
                kind: "games".to_string(),
                size_bytes: 0,
                volume_root: root.to_string_lossy().into_owned(),
                volume_label: root.to_string_lossy().trim_end_matches('\\').to_string(),
            });
            continue;
        }

        collect_games(&path, root, depth, current + 1, out);
    }
}

pub fn scan(folder: &str, depth: u32, media_type: &str) -> Result<Vec<ScanCandidate>, String> {
    //===> Guard Clause: Valid Folder <===//
    let path = PathBuf::from(folder);
    if !path.is_dir() {
        return Err("That folder does not exist.".to_string());
    }

    //===> Guard Clause: Valid Type <===//
    let allowed = [
        "all", "movies", "series", "anime", "games", "books", "music",
    ];
    if !allowed.contains(&media_type) {
        return Err(format!("Unknown media type: {media_type}"));
    }

    let root = volume_root(&path);
    let depth = depth.clamp(1, MAX_DEPTH);
    let mut candidates = Vec::new();

    if media_type == "games" {
        collect_games(&path, &root, depth, 0, &mut candidates);
    } else {
        walk_files(&path, &root, media_type, depth - 1, &mut candidates);
    }

    candidates.sort_by(|left, right| left.rel_path.cmp(&right.rel_path));
    Ok(candidates)
}

//=====> Tests <=====//

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scans_and_classifies_files_with_depth() {
        let root = PathBuf::from("target").join(format!("scan-test-{}", std::process::id()));
        let season = root.join("Season 1");
        fs::create_dir_all(&season).unwrap();
        fs::write(root.join("Arrival.2016.mkv"), b"x").unwrap();
        fs::write(season.join("Show.S01E02.mp4"), b"x").unwrap();
        fs::write(root.join("book.epub"), b"x").unwrap();
        fs::write(root.join("notes.txt"), b"x").unwrap();

        let shallow = scan(root.to_str().unwrap(), 1, "all").unwrap();
        assert_eq!(shallow.len(), 2);

        let deep = scan(root.to_str().unwrap(), 2, "all").unwrap();
        assert_eq!(deep.len(), 3);
        assert!(deep.iter().any(|item| item.kind == "movies"));
        assert!(deep.iter().any(|item| item.kind == "series"));
        assert!(deep.iter().any(|item| item.kind == "books"));
        assert!(deep.iter().all(|item| !item.rel_path.contains('\\')));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn scans_game_folders() {
        let root = PathBuf::from("target").join(format!("scan-games-{}", std::process::id()));
        fs::create_dir_all(root.join("Hades")).unwrap();
        fs::create_dir_all(root.join("Hades").join("MD5")).unwrap();
        fs::create_dir_all(root.join("Celeste")).unwrap();

        let found = scan(root.to_str().unwrap(), 1, "games").unwrap();
        assert_eq!(found.len(), 2);
        assert!(found.iter().all(|item| item.kind == "games"));

        fs::remove_dir_all(root).ok();
    }
}
