/*======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Text Cleanup
 * ===> 03 - Filename Parsing
 * ===> 04 - Classification
 * ===> 05 - Grouping
 * ===> 06 - Folder Pick & Scan
 * ===> 07 - Tests
 */

//=====> Types <=====//

use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs;
use std::path::{Path, PathBuf};

/// Folder scans no longer stop at 5,000 files. The budget is a safety valve for
/// runaway recursion, not a product limit.
pub const MAX_FILES: usize = 60_000;
pub const MAX_DEPTH: u32 = 12;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanFile {
    pub rel_path: String,
    pub size_bytes: u64,
    pub season_number: i64,
    pub season_label: Option<String>,
    pub episode: Option<i64>,
    pub quality: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanSeason {
    pub number: i64,
    pub label: String,
    pub episode_count: usize,
    pub total_size_bytes: u64,
}

/// One row the Library will show: a whole series, a whole film, a game, a book.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanGroup {
    pub key: String,
    pub kind: String,
    pub category: Option<String>,
    pub title: String,
    pub year: Option<i64>,
    pub folder_path: Option<String>,
    pub primary_path: String,
    pub volume_root: String,
    pub total_size_bytes: u64,
    pub copy_count: usize,
    pub episode_count: usize,
    pub season_count: usize,
    pub seasons: Vec<ScanSeason>,
    pub confidence: f32,
    pub reason: String,
    pub files: Vec<ScanFile>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanGroupSummary {
    pub key: String,
    pub kind: String,
    pub category: Option<String>,
    pub title: String,
    pub year: Option<i64>,
    pub folder_path: Option<String>,
    pub primary_path: String,
    pub total_size_bytes: u64,
    pub copy_count: usize,
    pub episode_count: usize,
    pub season_count: usize,
    pub seasons: Vec<ScanSeason>,
    pub confidence: f32,
    pub reason: String,
}

impl ScanGroup {
    pub fn summary(&self) -> ScanGroupSummary {
        ScanGroupSummary {
            key: self.key.clone(),
            kind: self.kind.clone(),
            category: self.category.clone(),
            title: self.title.clone(),
            year: self.year,
            folder_path: self.folder_path.clone(),
            primary_path: self.primary_path.clone(),
            total_size_bytes: self.total_size_bytes,
            copy_count: self.copy_count,
            episode_count: self.episode_count,
            season_count: self.season_count,
            seasons: self.seasons.clone(),
            confidence: self.confidence,
            reason: self.reason.clone(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ScanConfig {
    pub path: PathBuf,
    pub kind: String,
    pub category: Option<String>,
    pub depth: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root: String,
    pub kind: String,
    pub category: Option<String>,
    pub groups: Vec<ScanGroupSummary>,
    pub total_groups: usize,
    pub total_files: usize,
    pub total_size_bytes: u64,
    pub episode_count: usize,
    pub warnings: Vec<String>,
}

//=====> Text Cleanup <=====//

/// FNV-1a. Deterministic ids mean a rescan updates rows instead of duplicating
/// them, and no hash crate is needed.
pub fn stable_id(value: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in value.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{hash:016x}")
}

/// Release tags that never belong in a title. Everything after one of these is
/// metadata, not part of the name.
const RELEASE_TAGS: &[&str] = &[
    "1080p",
    "720p",
    "480p",
    "2160p",
    "4k",
    "uhd",
    "hdrip",
    "webrip",
    "web-dl",
    "webdl",
    "bluray",
    "blu-ray",
    "brrip",
    "bdrip",
    "dvdrip",
    "dvd",
    "hdtv",
    "remux",
    "x264",
    "x265",
    "h264",
    "h265",
    "hevc",
    "avc",
    "aac",
    "ac3",
    "dts",
    "ddp",
    "10bit",
    "8bit",
    "hdr",
    "proper",
    "repack",
    "extended",
    "unrated",
    "directors",
    "cut",
    "dual",
    "audio",
    "subs",
    "subbed",
    "dubbed",
    "multi",
    "amzn",
    "nf",
    "dsnp",
    "hmax",
    "atvp",
    "egybest",
    "akwam",
    "mycima",
    "shahid",
    "cinemana",
];

const LANGUAGE_BUCKETS: &[&str] = &[
    "english",
    "eng",
    "arabic",
    "ara",
    "anime",
    "animation",
    "animated",
    "cartoon",
    "cartoons",
    "foreign",
    "hindi",
    "korean",
    "turkish",
    "spanish",
    "french",
    "japanese",
    "anime movies",
];

const GENRE_BUCKETS: &[&str] = &[
    "action",
    "adventure",
    "comedy",
    "crime",
    "documentary",
    "drama",
    "family",
    "fantasy",
    "history",
    "horror",
    "music",
    "mystery",
    "romance",
    "sci-fi",
    "scifi",
    "science fiction",
    "sport",
    "sports",
    "thriller",
    "war",
    "western",
    "kids",
    "classics",
    "classic",
    "movies",
    "movie",
    "films",
    "film",
    "series",
    "tv",
    "shows",
    "show",
    "other",
    "others",
    "new",
];

const IGNORED_DIRS: &[&str] = &[
    "subs",
    "sub",
    "subtitles",
    "subtitle",
    "srt",
    "sample",
    "samples",
    "extras",
    "extra",
    "featurettes",
    "behind the scenes",
    "trailers",
    "trailer",
    "artwork",
    "posters",
    "screens",
];

fn is_bucket(name: &str) -> bool {
    let lower = name.trim().to_ascii_lowercase();
    LANGUAGE_BUCKETS.contains(&lower.as_str()) || GENRE_BUCKETS.contains(&lower.as_str())
}

fn is_ignored_dir(name: &str) -> bool {
    let lower = name.trim().to_ascii_lowercase();
    IGNORED_DIRS.contains(&lower.as_str())
}

/// Files that are never library entries on their own: trailers, samples and
/// featurettes. Skipping them also keeps a one-film folder classified as a
/// single-film folder so the folder name is used as the title.
fn is_ignored_file(name: &str) -> bool {
    let lower = name.trim().to_ascii_lowercase();
    [
        "trailer",
        "sample",
        "featurette",
        "behind the scenes",
        "teaser",
    ]
    .iter()
    .any(|needle| lower.contains(needle))
}

fn is_hidden_or_system(name: &str) -> bool {
    if name.starts_with('.') || name.starts_with('$') {
        return true;
    }
    matches!(
        name.to_ascii_lowercase().as_str(),
        "system volume information" | "recycle.bin" | "md5" | "dlc" | "_download" | "glist"
    )
}

/// Drop a media extension only. `Infinite.2021.mp4` loses `.mp4`, while
/// `Dr. Stone` and `Mr. Robot` keep their dots because `Stone` and `Robot` are
/// not media extensions.
fn media_stem(raw: &str) -> String {
    let path = Path::new(raw);
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase());
    match extension {
        Some(extension) if is_video(&extension) || is_book(&extension) || is_music(&extension) => {
            path.file_stem()
                .map(|value| value.to_string_lossy().into_owned())
                .unwrap_or_else(|| raw.to_string())
        }
        _ => raw.to_string(),
    }
}

/// Release groups live in `[...]`. `(10)` stays because it can be an episode.
fn strip_square_brackets(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut depth = 0usize;
    for character in text.chars() {
        match character {
            '[' => depth += 1,
            ']' => depth = depth.saturating_sub(1),
            _ if depth == 0 => result.push(character),
            _ => {}
        }
    }
    result
}

/// Turns `[EgyBest].Infinity.War.2018.1080p.WEB-DL.x264` into `Infinity War`.
/// Returns the cleaned title and any year found in the source text.
pub fn clean_title(raw: &str) -> (String, Option<i64>) {
    let stem = media_stem(raw);
    let mut text = stem.replace(['.', '_'], " ");

    //===> Bracketed Groups <===//
    while let (Some(start), Some(end)) = (text.find('['), text.find(']')) {
        if end > start {
            text.replace_range(start..=end, " ");
        } else {
            break;
        }
    }
    while let (Some(start), Some(end)) = (text.find('('), text.find(')')) {
        if end > start {
            text.replace_range(start..=end, " ");
        } else {
            break;
        }
    }

    //===> Cut At The First Release Tag <===//
    let lower = text.to_ascii_lowercase();
    let mut cut = text.len();
    for tag in RELEASE_TAGS {
        let needle = format!(" {tag}");
        if let Some(index) = lower.find(&needle) {
            cut = cut.min(index);
        }
    }
    if cut < text.len() {
        text.truncate(cut);
    }

    //===> Year <===//
    let mut year = None;
    let mut kept: Vec<String> = Vec::new();
    for token in text.split_whitespace() {
        let trimmed =
            token.trim_matches(|character: char| !character.is_alphanumeric() && character != '\'');
        if trimmed.len() == 4 && trimmed.chars().all(|character| character.is_ascii_digit()) {
            if let Ok(value) = trimmed.parse::<i64>() {
                if (1900..=2099).contains(&value) && year.is_none() {
                    year = Some(value);
                    continue;
                }
            }
        }
        if !trimmed.is_empty() {
            kept.push(trimmed.to_string());
        }
    }

    let title = kept.join(" ").trim().to_string();
    if title.is_empty() {
        // A film literally named after its year, e.g. `2012`.
        let fallback = stem.replace(['.', '_'], " ").trim().to_string();
        (fallback, year)
    } else {
        (title, year)
    }
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for character in value.to_ascii_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            last_dash = false;
        } else if !last_dash && !slug.is_empty() {
            slug.push('-');
            last_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}

//=====> Filename Parsing <=====//

fn digits_at(bytes: &[u8], mut index: usize) -> Option<(i64, usize)> {
    let start = index;
    let mut value: i64 = 0;
    while index < bytes.len() && bytes[index].is_ascii_digit() {
        value = value
            .saturating_mul(10)
            .saturating_add((bytes[index] - b'0') as i64);
        index += 1;
    }
    if index == start {
        None
    } else {
        Some((value, index))
    }
}

/// `S02E01`, `S02.E01`, `S02 EP12`, `S02EP12`, `s1e5`.
fn find_season_episode(text: &str) -> Option<(i64, i64)> {
    let lower = text.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    for index in 0..bytes.len() {
        if bytes[index] != b's' {
            continue;
        }
        if index > 0 && bytes[index - 1].is_ascii_alphanumeric() {
            continue;
        }
        let Some((season, mut cursor)) = digits_at(bytes, index + 1) else {
            continue;
        };
        if !(0..=99).contains(&season) {
            continue;
        }
        while cursor < bytes.len() && matches!(bytes[cursor], b'.' | b' ' | b'_' | b'-') {
            cursor += 1;
        }
        if cursor >= bytes.len() || bytes[cursor] != b'e' {
            continue;
        }
        cursor += 1;
        if cursor < bytes.len() && bytes[cursor] == b'p' {
            cursor += 1;
        }
        if let Some((episode, _)) = digits_at(bytes, cursor) {
            if (0..=3000).contains(&episode) {
                return Some((season, episode));
            }
        }
    }
    None
}

/// `1x03`, `2x11`.
fn find_nxm(text: &str) -> Option<(i64, i64)> {
    let lower = text.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    for index in 0..bytes.len() {
        if bytes[index] != b'x' {
            continue;
        }
        let Some((season, _)) = digits_trailing(bytes, index) else {
            continue;
        };
        let Some((episode, _)) = digits_at(bytes, index + 1) else {
            continue;
        };
        if (0..=99).contains(&season) && (0..=3000).contains(&episode) {
            return Some((season, episode));
        }
    }
    None
}

fn digits_trailing(bytes: &[u8], end: usize) -> Option<(i64, usize)> {
    let mut start = end;
    while start > 0 && bytes[start - 1].is_ascii_digit() {
        start -= 1;
    }
    if start == end {
        return None;
    }
    let text = std::str::from_utf8(&bytes[start..end]).ok()?;
    Some((text.parse().ok()?, start))
}

/// `E05`, `EP05`, `Episode 5`.
fn find_episode_word(text: &str) -> Option<i64> {
    let lower = text.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'e' && (index == 0 || !bytes[index - 1].is_ascii_alphanumeric()) {
            let mut cursor = index + 1;
            if cursor < bytes.len() && bytes[cursor] == b'p' {
                cursor += 1;
            }
            if let Some((episode, _)) = digits_at(bytes, skip_separators(bytes, cursor)) {
                if (0..=3000).contains(&episode) {
                    return Some(episode);
                }
            }
        }
        index += 1;
    }
    if let Some(position) = lower.find("episode") {
        let cursor = skip_separators(bytes, position + "episode".len());
        if let Some((episode, _)) = digits_at(bytes, cursor) {
            if (0..=3000).contains(&episode) {
                return Some(episode);
            }
        }
    }
    None
}

fn skip_separators(bytes: &[u8], mut index: usize) -> usize {
    while index < bytes.len() && matches!(bytes[index], b' ' | b'.' | b'_' | b'-' | b':') {
        index += 1;
    }
    index
}

/// `Show - 005`, `(5)`, `[05]`, and a bare trailing number.
fn find_trailing_episode(text: &str) -> Option<i64> {
    let bytes = text.as_bytes();
    //===> Brackets <===//
    if let Some(open) = text.rfind('(') {
        if let Some(close) = text[open..].find(')') {
            let inner = text[open + 1..open + close].trim();
            if !inner.is_empty() && inner.chars().all(|character| character.is_ascii_digit()) {
                return inner.parse().ok();
            }
        }
    }
    if let Some(open) = text.rfind('[') {
        if let Some(close) = text[open..].find(']') {
            let inner = text[open + 1..open + close].trim();
            if !inner.is_empty() && inner.chars().all(|character| character.is_ascii_digit()) {
                return inner.parse().ok();
            }
        }
    }
    //===> Last Token <===//
    let mut end = bytes.len();
    while end > 0 && !bytes[end - 1].is_ascii_alphanumeric() {
        end -= 1;
    }
    let mut start = end;
    while start > 0 && bytes[start - 1].is_ascii_digit() {
        start -= 1;
    }
    if start == end {
        return None;
    }
    let value: i64 = std::str::from_utf8(&bytes[start..end]).ok()?.parse().ok()?;
    if !(1..=999).contains(&value) {
        return None;
    }
    // A four digit value in a realistic year range is not an episode.
    if (1900..=2099).contains(&value) {
        return None;
    }
    Some(value)
}

fn leading_number(text: &str) -> Option<i64> {
    let digits: String = text
        .chars()
        .skip_while(|character| !character.is_ascii_digit())
        .take_while(|character| character.is_ascii_digit())
        .collect();
    if digits.is_empty() {
        None
    } else {
        digits.parse().ok()
    }
}

/// A directory that is *only* a season: `Season 2`, `S02`, `Seassion 03`,
/// `S2 Imashime no Fukkatsu`, `Special 2017`, `OVA`, `Movies`.
fn pure_season_dir(name: &str) -> Option<i64> {
    let lower = name.trim().to_ascii_lowercase();
    if lower.starts_with("special") {
        return Some(0);
    }
    if lower == "ova" || lower.starts_with("ova ") || lower.starts_with("ova-") {
        return Some(0);
    }
    if lower == "movie" || lower == "movies" {
        return Some(0);
    }
    for prefix in ["season", "seassion"] {
        if let Some(rest) = lower.strip_prefix(prefix) {
            if let Some(number) = leading_number(rest) {
                return Some(number);
            }
        }
    }
    // `S2`, `S02`, `S2 Imashime no Fukkatsu`. Titles such as `Sword Art Online`
    // and `Steins Gate` are rejected because the `s` is not followed by a digit.
    if let Some(rest) = lower.strip_prefix('s') {
        let rest = rest.trim_start();
        if rest.starts_with(|character: char| character.is_ascii_digit()) {
            if let Some(number) = leading_number(rest) {
                if (0..=99).contains(&number) {
                    return Some(number);
                }
            }
        }
    }
    None
}

/// Split a folder name into the series title and a season it encodes.
///
/// * `S2` / `Season 2` → no title, season 2
/// * `Arcane S2` → `Arcane`, season 2
/// * `Yakusoku no Neverland 2nd Season` → `Yakusoku no Neverland`, season 2
/// * `Bleach 2022` → `Bleach 2022`, no season
fn split_season_folder(name: &str) -> (String, Option<i64>) {
    if let Some(number) = pure_season_dir(name) {
        return (String::new(), Some(number));
    }
    let trimmed = name.trim();
    let lower = trimmed.to_ascii_lowercase();
    // `to_ascii_lowercase` never changes byte length, so indices stay valid.
    if let Some((index, number)) = trailing_season_marker(&lower) {
        return (trimmed[..index].trim().to_string(), Some(number));
    }
    (trimmed.to_string(), None)
}

/// Locate a season marker at the end of a folder name: `Arcane S2`,
/// `Dr. Stone Season 3`, `Yakusoku no Neverland 2nd Season`.
fn trailing_season_marker(lower: &str) -> Option<(usize, i64)> {
    let trimmed = lower.trim_end();
    // `... 2nd Season`
    if let Some(head) = trimmed.strip_suffix("season") {
        let head = head.trim_end();
        let start = token_start(head);
        if let Some(number) = ordinal_number(&head[start..]) {
            return Some((start, number));
        }
    }
    // `... Season 3` / `... Seassion 03`
    let last_start = token_start(trimmed);
    let last = &trimmed[last_start..];
    if !last.is_empty() && last.chars().all(|character| character.is_ascii_digit()) {
        let before = trimmed[..last_start].trim_end();
        let marker = before
            .strip_suffix("season")
            .map(|rest| (rest.len(), "season"))
            .or_else(|| {
                before
                    .strip_suffix("seassion")
                    .map(|rest| (rest.len(), "seassion"))
            });
        if let Some((index, _)) = marker {
            let standalone = index == 0
                || before[..index].ends_with(|character: char| {
                    character.is_whitespace() || character == '-' || character == '.'
                });
            if standalone {
                if let Ok(number) = last.parse::<i64>() {
                    if (0..=99).contains(&number) {
                        return Some((index, number));
                    }
                }
            }
        }
    }
    // `... S2`
    let start = token_start(trimmed);
    let token = &trimmed[start..];
    if let Some(rest) = token.strip_prefix('s') {
        if !rest.is_empty() && rest.chars().all(|character| character.is_ascii_digit()) {
            let number: i64 = rest.parse().ok()?;
            if (0..=99).contains(&number) {
                return Some((start, number));
            }
        }
    }
    None
}

fn token_start(text: &str) -> usize {
    text.char_indices()
        .rev()
        .find(|(_, character)| !character.is_ascii_alphanumeric())
        .map(|(index, character)| index + character.len_utf8())
        .unwrap_or(0)
}

/// `2`, `2nd`, `3rd`, `4th`.
fn ordinal_number(token: &str) -> Option<i64> {
    let digits: String = token.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    let suffix = &token[digits.len()..];
    if !suffix.is_empty() && !matches!(suffix, "st" | "nd" | "rd" | "th") {
        return None;
    }
    digits.parse().ok()
}

/// Season number from a directory name (see [`split_season_folder`]).
fn season_from_dir(name: &str) -> Option<i64> {
    split_season_folder(name).1
}

/// Everything needed to place one file inside its group.
struct FileInfo {
    season: i64,
    episode: Option<i64>,
    quality: Option<String>,
}

fn quality_of(text: &str) -> Option<String> {
    let lower = text.to_ascii_lowercase();
    for label in ["2160p", "1080p", "720p", "480p"] {
        if lower.contains(label) {
            return Some(label.to_string());
        }
    }
    if lower.contains("4k") || lower.contains("uhd") {
        return Some("2160p".to_string());
    }
    None
}

fn parse_file(name: &str, directory_parts: &[&str]) -> FileInfo {
    let stem = strip_square_brackets(&media_stem(name));

    //===> Season From The Folder First <===//
    let mut season = None;
    for part in directory_parts.iter().rev() {
        if let Some(number) = season_from_dir(part) {
            season = Some(number);
            break;
        }
    }

    let paired = find_season_episode(&stem).or_else(|| find_nxm(&stem));
    let season = season
        .or_else(|| paired.map(|(value, _)| value))
        .unwrap_or(1);
    let episode = paired
        .map(|(_, episode)| episode)
        .or_else(|| find_episode_word(&stem))
        .or_else(|| find_trailing_episode(&stem));

    FileInfo {
        season,
        episode,
        quality: quality_of(name),
    }
}

//=====> Classification <=====//

fn is_video(extension: &str) -> bool {
    matches!(
        extension,
        "mkv" | "mp4" | "avi" | "mov" | "m4v" | "webm" | "wmv" | "flv" | "ts" | "mpg" | "mpeg"
    )
}

fn is_book(extension: &str) -> bool {
    matches!(extension, "epub" | "pdf" | "cbz" | "cbr" | "mobi" | "azw3")
}

fn is_music(extension: &str) -> bool {
    matches!(
        extension,
        "mp3" | "flac" | "m4a" | "wav" | "ogg" | "opus" | "aac"
    )
}

fn category_key(name: &str) -> Option<&'static str> {
    let lower = name.trim().to_ascii_lowercase();
    match lower.as_str() {
        "english" | "eng" | "en" => Some("english"),
        "arabic" | "ara" | "ar" | "عربي" => Some("arabic"),
        "anime" | "animation" | "animated" | "cartoons" | "cartoon" => Some("anime"),
        _ => None,
    }
}

fn detect_category(path: &Path) -> Option<String> {
    for component in path.components() {
        let text = component.as_os_str().to_string_lossy();
        if let Some(key) = category_key(&text) {
            return Some(key.to_string());
        }
    }
    None
}

fn resolve_kind(extension: &str, file_name: &str, requested: &str) -> Option<&'static str> {
    match requested {
        "anime" => return Some("series"),
        "movies" | "series" | "games" | "books" | "music" => {
            if is_video(extension) {
                return Some(match requested {
                    "movies" => "movies",
                    "series" => "series",
                    "games" => "games",
                    "books" => "books",
                    _ => "music",
                });
            }
            if is_book(extension) {
                return Some("books");
            }
            if is_music(extension) {
                return Some("music");
            }
            return None;
        }
        _ => {}
    }
    if is_video(extension) {
        if find_season_episode(file_name).is_some() || find_nxm(file_name).is_some() {
            return Some("series");
        }
        return Some("movies");
    }
    if is_book(extension) {
        return Some("books");
    }
    if is_music(extension) {
        return Some("music");
    }
    None
}

//=====> Grouping <=====//

struct SeasonAccumulator {
    number: i64,
    files: usize,
    size: u64,
    episodes: BTreeSet<i64>,
    unknown: usize,
}

struct GroupAccumulator {
    kind: String,
    category: Option<String>,
    title: String,
    year: Option<i64>,
    folder_path: Option<String>,
    primary_path: String,
    volume_root: String,
    size: u64,
    files: Vec<ScanFile>,
    seasons: BTreeMap<i64, SeasonAccumulator>,
    confidence: f32,
    reason: String,
}

fn season_label(number: i64) -> String {
    if number == 0 {
        "Specials".to_string()
    } else {
        format!("Season {number}")
    }
}

fn series_title(rel_parts: &[&str], root_name: &str) -> String {
    let mut parts: Vec<&str> = rel_parts
        .iter()
        .copied()
        .filter(|part| !is_ignored_dir(part) && !is_continuation(part))
        .collect();
    // Only whole-season folders are popped. `Arcane S2` keeps its name and loses
    // just the trailing marker below, so it still collapses into `Arcane`.
    while parts
        .last()
        .map(|part| pure_season_dir(part).is_some())
        .unwrap_or(false)
    {
        parts.pop();
    }
    // Language, genre and actor buckets wrap the real title. Skip them so every
    // series is named after its own folder, never after `English` or `Action`.
    let candidate = parts
        .iter()
        .find(|part| !is_bucket(part))
        .copied()
        .unwrap_or(root_name);
    let (base, _) = split_season_folder(candidate);
    let candidate = if base.trim().is_empty() {
        candidate
    } else {
        base.trim()
    };
    let (title, _) = clean_title(candidate);
    if title.is_empty() {
        root_name.to_string()
    } else {
        title
    }
}

fn movie_title(rel_parts: &[&str], file_name: &str, shared_folder: bool) -> (String, Option<i64>) {
    //===> Collection Folder: Trust The Filename <===//
    // `Star Wars/` can hold twelve films. When a folder holds several videos,
    // each file is its own entry and its filename is the only real title.
    if shared_folder {
        let (file_title, file_year) = clean_title(file_name);
        let year_only = !file_title.is_empty()
            && file_title
                .chars()
                .all(|character| character.is_ascii_digit() || character == ' ');
        if year_only {
            // Some collections name each film by its release year only
            // (`RoboCop/2014.mkv`). The folder is the only usable title then.
            if let Some(folder) = innermost_title_folder(rel_parts) {
                let (folder_title, folder_year) = clean_title(folder);
                if !folder_title.is_empty() {
                    return (folder_title, file_year.or(folder_year));
                }
            }
        }
        return (file_title, file_year);
    }

    //===> Single-Film Folder: Trust The Folder <===//
    // `English/Action/Infinite.2021/Infinite.mkv` is one film, while
    // `English/Action/Some.Movie.mkv` has no title folder at all.
    match innermost_title_folder(rel_parts) {
        Some(folder) => {
            let (title, folder_year) = clean_title(folder);
            if title.is_empty() {
                return clean_title(file_name);
            }
            let (_, file_year) = clean_title(file_name);
            (title, folder_year.or(file_year))
        }
        None => clean_title(file_name),
    }
}

/// The first directory from the file outward that is not a language, genre,
/// actor or disc bucket.
fn innermost_title_folder<'a>(rel_parts: &[&'a str]) -> Option<&'a str> {
    rel_parts.iter().rev().copied().find(|part| {
        !part.trim().is_empty()
            && !is_bucket(part)
            && !is_ignored_dir(part)
            && !is_continuation(part)
    })
}

/// `CD1`, `Disc 2`, `Part 3`: a split of the film one level up, not its title.
fn is_continuation(name: &str) -> bool {
    let lower = name.trim().to_ascii_lowercase();
    for prefix in ["cd", "disc", "disk", "part", "pt", "dvd"] {
        if let Some(rest) = lower.strip_prefix(prefix) {
            let rest = rest.trim_matches(|character: char| !character.is_ascii_alphanumeric());
            if !rest.is_empty() && rest.chars().all(|character| character.is_ascii_digit()) {
                return true;
            }
        }
    }
    false
}

fn root_label(root: &Path) -> String {
    root.file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| root.to_string_lossy().into_owned())
}

fn relative_dir(root: &Path, path: &Path) -> Vec<String> {
    let parent = path.parent().unwrap_or(path);
    let relative = parent.strip_prefix(root).unwrap_or(Path::new(""));
    relative
        .components()
        .filter_map(|component| {
            let text = component.as_os_str().to_string_lossy().into_owned();
            if text.is_empty() {
                None
            } else {
                Some(text)
            }
        })
        .collect()
}

fn walk(
    dir: &Path,
    root: &Path,
    depth_left: u32,
    out: &mut Vec<(PathBuf, u64)>,
    warnings: &mut Vec<String>,
) {
    if out.len() >= MAX_FILES {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        warnings.push(format!("Could not read {}", dir.display()));
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if is_hidden_or_system(&name) {
            continue;
        }
        if path.is_dir() {
            if depth_left > 0 && !is_ignored_dir(&name) {
                walk(&path, root, depth_left - 1, out, warnings);
            }
            continue;
        }
        if is_ignored_file(&name) {
            continue;
        }
        out.push((
            path.clone(),
            fs::metadata(&path).map(|meta| meta.len()).unwrap_or(0),
        ));
    }
}

pub fn scan(config: &ScanConfig) -> Result<Vec<ScanGroup>, String> {
    //===> Guard Clause: Valid Folder <===//
    if !config.path.is_dir() {
        return Err("That folder does not exist.".to_string());
    }
    let allowed = [
        "all", "movies", "series", "anime", "games", "books", "music", "auto",
    ];
    if !allowed.contains(&config.kind.as_str()) {
        return Err(format!("Unknown media type: {}", config.kind));
    }

    let root = config.path.clone();
    let depth = config.depth.clamp(1, MAX_DEPTH);
    let mut files = Vec::new();
    let mut warnings = Vec::new();
    walk(&root, &root, depth - 1, &mut files, &mut warnings);

    let root_name = root_label(&root);
    let requested = match config.kind.as_str() {
        "all" => "auto",
        other => other,
    };

    //===> Videos Per Folder <===//
    // A folder with one video is a title folder; a folder with several is a
    // collection, and each file must then be titled from its own filename.
    let mut video_counts: HashMap<PathBuf, usize> = HashMap::new();
    for (path, _) in &files {
        let extension = path
            .extension()
            .map(|value| value.to_string_lossy().to_ascii_lowercase())
            .unwrap_or_default();
        if is_video(&extension) {
            if let Some(parent) = path.parent() {
                *video_counts.entry(parent.to_path_buf()).or_insert(0) += 1;
            }
        }
    }

    let mut groups: BTreeMap<String, GroupAccumulator> = BTreeMap::new();

    for (path, size) in files {
        let file_name = path
            .file_name()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_default();
        let extension = path
            .extension()
            .map(|value| value.to_string_lossy().to_ascii_lowercase())
            .unwrap_or_default();
        let Some(kind) = resolve_kind(&extension, &file_name, requested) else {
            continue;
        };

        let directory = relative_dir(&root, &path);
        let parts: Vec<&str> = directory.iter().map(String::as_str).collect();
        let info = parse_file(&file_name, &parts);
        let shared_folder = path
            .parent()
            .and_then(|parent| video_counts.get(parent).copied())
            .unwrap_or(0)
            > 1;

        let rel_path = path
            .strip_prefix(&root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let folder_path = if directory.is_empty() {
            None
        } else {
            Some(directory.join("/"))
        };

        let (title, year, key, category, confidence, reason) = match kind {
            "series" => {
                let title = series_title(&parts, &root_name);
                let (_, year) = clean_title(&file_name);
                let category = detect_category(&path).or_else(|| config.category.clone());
                let slug = slugify(&title);
                let key = format!(
                    "series:{}:{}",
                    category.clone().unwrap_or_else(|| "none".into()),
                    slug
                );
                (
                    title,
                    year,
                    key,
                    category,
                    if info.episode.is_some() { 0.94 } else { 0.72 },
                    "Series folder with episode files",
                )
            }
            "movies" => {
                let (title, year) = movie_title(&parts, &file_name, shared_folder);
                let category = detect_category(&path).or_else(|| config.category.clone());
                let slug = slugify(&title);
                let year_key = year
                    .map(|value| value.to_string())
                    .unwrap_or_else(|| "x".into());
                let key = format!(
                    "movies:{}:{}-{}",
                    category.clone().unwrap_or_else(|| "none".into()),
                    slug,
                    year_key
                );
                (
                    title,
                    year,
                    key,
                    category,
                    if folder_path.is_some() { 0.9 } else { 0.66 },
                    "Movie title folder",
                )
            }
            "games" => {
                let title = parts
                    .first()
                    .map(|part| clean_title(part).0)
                    .unwrap_or_else(|| clean_title(&file_name).0);
                let key = format!("games:none:{}", slugify(&title));
                (
                    title,
                    None,
                    key,
                    config.category.clone(),
                    0.8,
                    "Game folder",
                )
            }
            _ => {
                let title = parts
                    .first()
                    .map(|part| clean_title(part).0)
                    .unwrap_or_else(|| clean_title(&file_name).0);
                let key = format!("{kind}:none:{}", slugify(&title));
                (
                    title,
                    None,
                    key,
                    config.category.clone(),
                    0.75,
                    "Folder grouping",
                )
            }
        };

        let season_number = if kind == "series" { info.season } else { 0 };
        let season = season_label(season_number);
        let file = ScanFile {
            rel_path,
            size_bytes: size,
            season_number,
            season_label: if kind == "series" {
                Some(season.clone())
            } else {
                None
            },
            episode: if kind == "series" { info.episode } else { None },
            quality: info.quality,
        };

        let entry = groups
            .entry(key.clone())
            .or_insert_with(|| GroupAccumulator {
                kind: kind.to_string(),
                category,
                title,
                year,
                folder_path: folder_path.clone(),
                primary_path: path.to_string_lossy().into_owned(),
                volume_root: root.to_string_lossy().into_owned(),
                size: 0,
                files: Vec::new(),
                seasons: BTreeMap::new(),
                confidence,
                reason: reason.to_string(),
            });

        entry.size = entry.size.saturating_add(size);
        entry.files.push(file);

        if kind == "series" {
            let bucket = entry
                .seasons
                .entry(season_number)
                .or_insert_with(|| SeasonAccumulator {
                    number: season_number,
                    files: 0,
                    size: 0,
                    episodes: BTreeSet::new(),
                    unknown: 0,
                });
            bucket.files += 1;
            bucket.size = bucket.size.saturating_add(size);
            match info.episode {
                Some(number) => {
                    bucket.episodes.insert(number);
                }
                None => bucket.unknown += 1,
            }
        }
    }

    let mut result: Vec<ScanGroup> = groups
        .into_iter()
        .map(|(key, group)| {
            let seasons: Vec<ScanSeason> = group
                .seasons
                .values()
                .map(|season| ScanSeason {
                    number: season.number,
                    label: season_label(season.number),
                    episode_count: season.episodes.len() + season.unknown,
                    total_size_bytes: season.size,
                })
                .collect();
            let episode_count = seasons.iter().map(|season| season.episode_count).sum();
            let mut files = group.files;
            files.sort_by(|left, right| left.rel_path.cmp(&right.rel_path));
            let primary_path = match files.first() {
                Some(file) if group.kind != "series" => {
                    let root = Path::new(&group.volume_root);
                    root.join(file.rel_path.replace('/', std::path::MAIN_SEPARATOR_STR))
                        .to_string_lossy()
                        .into_owned()
                }
                _ => group.primary_path,
            };

            ScanGroup {
                key,
                kind: group.kind,
                category: group.category,
                title: group.title,
                year: group.year,
                folder_path: group.folder_path,
                primary_path,
                volume_root: group.volume_root,
                total_size_bytes: group.size,
                copy_count: files.len(),
                episode_count,
                season_count: seasons.len(),
                seasons,
                confidence: group.confidence,
                reason: group.reason,
                files,
            }
        })
        .collect();

    result.sort_by(|left, right| left.title.to_lowercase().cmp(&right.title.to_lowercase()));
    Ok(result)
}

pub fn summarize(config: &ScanConfig) -> Result<ScanResult, String> {
    let groups = scan(config)?;
    let total_files: usize = groups.iter().map(|group| group.copy_count).sum();
    let total_size_bytes = groups.iter().map(|group| group.total_size_bytes).sum();
    let episode_count = groups.iter().map(|group| group.episode_count).sum();
    Ok(ScanResult {
        root: config.path.to_string_lossy().into_owned(),
        kind: config.kind.clone(),
        category: config.category.clone(),
        total_groups: groups.len(),
        total_files,
        total_size_bytes,
        episode_count,
        groups: groups.iter().map(ScanGroup::summary).collect(),
        warnings: Vec::new(),
    })
}

//=====> Folder Pick & Scan <=====//

pub fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Choose a media folder")
        .pick_folder()
        .map(|path| path.to_string_lossy().into_owned())
}

//=====> Tests <=====//

#[cfg(test)]
mod tests {
    use super::*;

    fn config(path: &Path, kind: &str, category: Option<&str>) -> ScanConfig {
        ScanConfig {
            path: path.to_path_buf(),
            kind: kind.to_string(),
            category: category.map(str::to_string),
            depth: 8,
        }
    }

    #[test]
    fn cleans_release_noise_and_year() {
        let (title, year) = clean_title("[EgyBest].Infinity.War.2018.1080p.WEB-DL.x264.mp4");
        assert_eq!(title, "Infinity War");
        assert_eq!(year, Some(2018));

        let (title, year) = clean_title("Death.Note.S01E01.1080p.WEB-DL.mp4");
        assert_eq!(title, "Death Note S01E01");
        assert_eq!(year, None);

        let (title, year) = clean_title("2012.mkv");
        assert_eq!(title, "2012");
        assert_eq!(year, Some(2012));
    }

    #[test]
    fn parses_episode_patterns() {
        assert_eq!(find_season_episode("Show.S02E01.mkv"), Some((2, 1)));
        assert_eq!(find_season_episode("S02EP12.mp4"), Some((2, 12)));
        assert_eq!(find_nxm("Show 1x03.mkv"), Some((1, 3)));
        assert_eq!(find_episode_word("Show Episode 7.mkv"), Some(7));
        assert_eq!(find_trailing_episode("(10).mp4"), Some(10));
        assert_eq!(find_trailing_episode("Movie.2019.mkv"), None);
    }

    #[test]
    fn reads_episodes_from_real_file_names() {
        let none: [&str; 0] = [];
        assert_eq!(parse_file("15.MP4", &none).episode, Some(15));
        assert_eq!(parse_file("01.mp4", &none).episode, Some(1));
        assert_eq!(
            parse_file("Ajin - 07 [SD][Alm7ben - M-D-L].mkv", &none).episode,
            Some(7)
        );
        assert_eq!(
            parse_file("Naruto Shippuden - 500.mp4", &none).episode,
            Some(500)
        );

        let season_dirs = ["Boku no Hero Academia", "S4"];
        let info = parse_file("15.MP4", &season_dirs);
        assert_eq!(info.season, 4);
        assert_eq!(info.episode, Some(15));
    }

    #[test]
    fn groups_a_series_root_into_series() {
        let root = PathBuf::from("target").join(format!("scan-series-{}", std::process::id()));
        fs::create_dir_all(root.join("Arcane").join("Arcane S2")).unwrap();
        fs::create_dir_all(root.join("Naruto Shippuden").join("Season 1")).unwrap();
        fs::write(
            root.join("Arcane")
                .join("Arcane S2")
                .join("Arcane.S02E01.mp4"),
            b"x",
        )
        .unwrap();
        fs::write(
            root.join("Arcane")
                .join("Arcane S2")
                .join("Arcane.S02E02.mp4"),
            b"x",
        )
        .unwrap();
        fs::write(
            root.join("Naruto Shippuden")
                .join("Season 1")
                .join("Naruto - 001.mp4"),
            b"x",
        )
        .unwrap();

        let groups = scan(&config(&root, "series", Some("anime"))).unwrap();
        assert_eq!(groups.len(), 2);

        let arcane = groups.iter().find(|group| group.title == "Arcane").unwrap();
        assert_eq!(arcane.kind, "series");
        assert_eq!(arcane.category.as_deref(), Some("anime"));
        assert_eq!(arcane.copy_count, 2);
        assert_eq!(arcane.season_count, 1);
        assert_eq!(arcane.episode_count, 2);
        assert_eq!(arcane.seasons[0].label, "Season 2");

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn recognizes_real_season_folder_spellings() {
        assert_eq!(pure_season_dir("S2"), Some(2));
        assert_eq!(pure_season_dir("S04"), Some(4));
        assert_eq!(pure_season_dir("S2 Imashime no Fukkatsu"), Some(2));
        assert_eq!(pure_season_dir("Season 3"), Some(3));
        assert_eq!(pure_season_dir("Seassion 02"), Some(2));
        assert_eq!(pure_season_dir("Seassion 03 Part 2"), Some(3));
        assert_eq!(pure_season_dir("Special 2017"), Some(0));
        assert_eq!(pure_season_dir("OVA"), Some(0));
        assert_eq!(pure_season_dir("Sword Art Online"), None);
        assert_eq!(pure_season_dir("Steins Gate 0"), None);
        assert_eq!(pure_season_dir("Fate Zero"), None);
        assert_eq!(pure_season_dir("01 - Zero"), None);

        assert_eq!(
            split_season_folder("Arcane S2"),
            ("Arcane".to_string(), Some(2))
        );
        assert_eq!(
            split_season_folder("Dr. Stone Season 3"),
            ("Dr. Stone".to_string(), Some(3))
        );
        assert_eq!(
            split_season_folder("Yakusoku no Neverland 2nd Season"),
            ("Yakusoku no Neverland".to_string(), Some(2))
        );
        assert_eq!(
            split_season_folder("Bleach 2022"),
            ("Bleach 2022".to_string(), None)
        );
    }

    #[test]
    fn merges_sequel_folders_into_one_series_with_seasons() {
        let root = PathBuf::from("target").join(format!("scan-seasons-{}", std::process::id()));
        for folder in ["Dr. Stone", "Dr. Stone S2", "Dr. Stone S3"] {
            fs::create_dir_all(root.join(folder)).unwrap();
            fs::write(root.join(folder).join("01.mp4"), b"x").unwrap();
        }
        fs::create_dir_all(root.join("Boku no Hero Academia").join("S4")).unwrap();
        fs::write(
            root.join("Boku no Hero Academia").join("S4").join("15.MP4"),
            b"x",
        )
        .unwrap();

        let groups = scan(&config(&root, "series", Some("anime"))).unwrap();
        assert_eq!(groups.len(), 2);

        let stone = groups
            .iter()
            .find(|group| group.title == "Dr Stone")
            .unwrap();
        assert_eq!(stone.season_count, 3);
        assert_eq!(stone.copy_count, 3);
        let labels: Vec<&str> = stone
            .seasons
            .iter()
            .map(|season| season.label.as_str())
            .collect();
        assert_eq!(labels, vec!["Season 1", "Season 2", "Season 3"]);

        let hero = groups
            .iter()
            .find(|group| group.title == "Boku no Hero Academia")
            .unwrap();
        assert_eq!(hero.season_count, 1);
        assert_eq!(hero.seasons[0].label, "Season 4");
        assert_eq!(hero.episode_count, 1);

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn groups_a_movies_root_by_title_folder() {
        let root = PathBuf::from("target").join(format!("scan-movies-{}", std::process::id()));
        let action = root.join("English").join("Action");
        fs::create_dir_all(action.join("Infinite.2021")).unwrap();
        fs::create_dir_all(action.join("Bullet.Train")).unwrap();
        fs::write(
            action
                .join("Infinite.2021")
                .join("Infinite.2021.WEB-DL.mp4"),
            b"x",
        )
        .unwrap();
        fs::write(
            action.join("Bullet.Train").join("Bullet.Train.2022.mp4"),
            b"x",
        )
        .unwrap();

        let groups = scan(&config(&root, "movies", None)).unwrap();
        assert_eq!(groups.len(), 2);
        assert!(groups.iter().all(|group| group.kind == "movies"));
        assert!(groups
            .iter()
            .all(|group| group.category.as_deref() == Some("english")));
        let infinite = groups
            .iter()
            .find(|group| group.title == "Infinite")
            .unwrap();
        assert_eq!(infinite.year, Some(2021));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn splits_movies_that_share_a_folder_but_not_a_year() {
        let root = PathBuf::from("target").join(format!("scan-years-{}", std::process::id()));
        fs::create_dir_all(root.join("English").join("Code.8")).unwrap();
        fs::write(root.join("English").join("Code.8").join("2019.mp4"), b"x").unwrap();
        fs::write(root.join("English").join("Code.8").join("2024.mp4"), b"x").unwrap();

        let groups = scan(&config(&root, "movies", None)).unwrap();
        assert_eq!(groups.len(), 2);
        let years: Vec<Option<i64>> = groups.iter().map(|group| group.year).collect();
        assert!(years.contains(&Some(2019)));
        assert!(years.contains(&Some(2024)));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn titles_each_film_in_a_collection_folder_from_its_filename() {
        let root = PathBuf::from("target").join(format!("scan-collection-{}", std::process::id()));
        let folder = root.join("English").join("Action").join("Star Wars");
        fs::create_dir_all(&folder).unwrap();
        fs::write(
            folder.join("Star.Wars.Episode.IV.A.New.Hope.1977.1080p.BluRay.mkv"),
            b"x",
        )
        .unwrap();
        fs::write(
            folder.join("Star.Wars.Episode.V.The.Empire.Strikes.Back.1980.1080p.BluRay.mkv"),
            b"x",
        )
        .unwrap();
        // Trailers must never become library entries or inflate the folder count.
        fs::write(folder.join("Star.Wars.Trailer.1080p.mkv"), b"x").unwrap();

        let groups = scan(&config(&root, "movies", None)).unwrap();
        assert_eq!(groups.len(), 2);
        let titles: Vec<&str> = groups.iter().map(|group| group.title.as_str()).collect();
        assert!(titles.contains(&"Star Wars Episode IV A New Hope"));
        assert!(titles.contains(&"Star Wars Episode V The Empire Strikes Back"));
        let years: Vec<Option<i64>> = groups.iter().map(|group| group.year).collect();
        assert!(years.contains(&Some(1977)));
        assert!(years.contains(&Some(1980)));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn uses_folder_name_for_year_only_filenames() {
        let root = PathBuf::from("target").join(format!("scan-years-only-{}", std::process::id()));
        let folder = root.join("English").join("Action").join("RoboCop");
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("1987.mp4"), b"x").unwrap();
        fs::write(folder.join("2014.mkv"), b"x").unwrap();

        let groups = scan(&config(&root, "movies", None)).unwrap();
        assert_eq!(groups.len(), 2);
        assert!(groups.iter().all(|group| group.title == "RoboCop"));
        let years: Vec<Option<i64>> = groups.iter().map(|group| group.year).collect();
        assert!(years.contains(&Some(1987)));
        assert!(years.contains(&Some(2014)));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn keeps_language_words_inside_titles() {
        assert_eq!(clean_title("Johnny English 2.mp4").0, "Johnny English 2");
        assert_eq!(
            clean_title("The English Patient 1996.mkv").0,
            "The English Patient"
        );
    }

    #[test]
    fn uses_the_folder_name_for_a_single_film_in_a_nested_bucket() {
        let root = PathBuf::from("target").join(format!("scan-nested-{}", std::process::id()));
        let folder = root
            .join("English")
            .join("Actors")
            .join("Brad Pitt")
            .join("Fury 2014");
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("Fury.2014.1080p.mkv"), b"x").unwrap();

        let groups = scan(&config(&root, "movies", None)).unwrap();
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].title, "Fury");
        assert_eq!(groups[0].year, Some(2014));
        assert_eq!(groups[0].category.as_deref(), Some("english"));

        fs::remove_dir_all(root).ok();
    }
}
