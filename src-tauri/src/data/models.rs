/*======> Reference By Comment <======
 * ===> 01 - Workspace Models
 * ===> 02 - Identity
 * ===> 03 - Library Models
 */

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderRecord {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub parent_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRecord {
    pub id: String,
    pub title: String,
    pub content: String,
    pub project_id: Option<String>,
    pub pinned: bool,
    #[serde(default)]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub parent_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Milestone {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub due_date: Option<String>,
    pub status: String,
    pub issue_ids: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItem {
    pub id: String,
    pub text: String,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub path: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct IssueExtras {
    pub checklist: Vec<ChecklistItem>,
    pub attachments: Vec<Attachment>,
    pub parent_id: Option<String>,
}
/// A snapshot of the workspace exactly as the frontend holds it.
/// Field names are camelCase so the JSON crosses the Tauri boundary unchanged.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub version: u32,
    #[serde(default)]
    pub identity: Identity,
    #[serde(default)]
    pub appearance: Appearance,
    pub theme: String,
    pub sidebar_collapsed: bool,
    pub projects: Vec<Project>,
    pub issues: Vec<Issue>,
    pub notes: Vec<Note>,
    #[serde(default)]
    pub documents: Vec<DocumentRecord>,
    #[serde(default)]
    pub milestones: Vec<Milestone>,
    #[serde(default)]
    pub folders: Vec<FolderRecord>,
    #[serde(default)]
    pub note_folders: HashMap<String, String>,
    #[serde(default)]
    pub issue_extras: HashMap<String, IssueExtras>,
    #[serde(default)]
    pub task_links: HashMap<String, String>,
    pub activity: Vec<ActivityEntry>,
    #[serde(default)]
    pub counters: Counters,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Counters {
    pub issue: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub key: String,
    pub description: String,
    pub color: String,
    pub status: String,
    pub created_at: String,
    pub target_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub id: String,
    pub key: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub project_id: Option<String>,
    pub labels: Vec<String>,
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub project_id: Option<String>,
    pub tags: Vec<String>,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEntry {
    pub id: String,
    pub kind: String,
    pub message: String,
    pub at: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaKind {
    pub id: String,
    pub key: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub sort_order: i64,
    pub hidden: bool,
    pub progress_unit: String,
    pub fields: serde_json::Value,
}

/// A user-managed Library category such as English, Arabic or Anime. Categories
/// are data, not enums: adding one is a row insert, never a schema migration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaCategory {
    pub id: String,
    pub key: String,
    pub name: String,
    pub sort_order: i64,
    pub hidden: bool,
    /// Kind keys this category can appear under, e.g. `["movies", "series"]`.
    pub applies_to: Vec<String>,
}

/// A folder the scanner owns. The root decides how ambiguous files are grouped
/// and supplies a default category that per-folder detection can override.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRoot {
    pub id: String,
    pub path: String,
    pub volume_id: Option<String>,
    /// `movies` | `series` | `games` | `books` | `music` | `auto`
    pub kind: String,
    pub category_id: Option<String>,
    pub depth: i64,
    pub last_scan_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: String,
    pub kind_id: String,
    pub title: String,
    pub sort_title: Option<String>,
    pub original_title: Option<String>,
    pub year: Option<i64>,
    pub status: String,
    pub rating: Option<f64>,
    pub notes: String,
    pub attributes: serde_json::Value,
    pub cover_path: Option<String>,
    pub provider_ids: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
    //===> Library V2 Aggregates <===//
    #[serde(default)]
    pub category_id: Option<String>,
    #[serde(default)]
    pub external_key: Option<String>,
    #[serde(default)]
    pub folder_path: Option<String>,
    #[serde(default)]
    pub primary_path: Option<String>,
    #[serde(default)]
    pub copy_count: i64,
    #[serde(default)]
    pub episode_count: i64,
    #[serde(default)]
    pub season_count: i64,
    #[serde(default)]
    pub total_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    pub id: String,
    pub label: String,
    pub volume_guid: Option<String>,
    pub serial: Option<String>,
    pub capacity_bytes: Option<i64>,
    pub mount_path: Option<String>,
    #[serde(rename = "type")]
    pub volume_type: String,
    pub last_seen_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaCopy {
    pub id: String,
    pub item_id: String,
    pub volume_id: String,
    pub rel_path: String,
    pub size_bytes: Option<i64>,
    pub quality: Option<String>,
    pub source: Option<String>,
    pub hash: Option<String>,
    pub first_seen_at: String,
    pub last_seen_at: Option<String>,
    pub missing_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProgress {
    pub item_id: String,
    pub unit: String,
    pub position: f64,
    pub total: Option<f64>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySnapshot {
    pub kinds: Vec<MediaKind>,
    pub items: Vec<MediaItem>,
    pub copies: Vec<MediaCopy>,
    pub volumes: Vec<Volume>,
    pub progress: Vec<MediaProgress>,
}

//===> Library V2 Query Models <===//

/// One page of the Library grid. Only the aggregate columns are loaded, never
/// the per-file copies, so the payload stays small no matter how many files
/// are indexed.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryCard {
    pub id: String,
    pub kind_id: String,
    pub kind_key: String,
    pub category_id: Option<String>,
    pub category_key: Option<String>,
    pub category_name: Option<String>,
    pub title: String,
    pub year: Option<i64>,
    pub status: String,
    pub cover_path: Option<String>,
    pub folder_path: Option<String>,
    pub primary_path: Option<String>,
    pub copy_count: i64,
    pub episode_count: i64,
    pub season_count: i64,
    pub total_size_bytes: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LibraryQuery {
    #[serde(default)]
    pub kind: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub volume: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub search: Option<String>,
    /// `title` | `recent` | `size` | `episodes`
    #[serde(default)]
    pub sort: Option<String>,
    #[serde(default)]
    pub page: Option<i64>,
    #[serde(default)]
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryPage {
    pub items: Vec<LibraryCard>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub page_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryCount {
    pub key: String,
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryCategoryCount {
    pub id: String,
    pub key: String,
    pub name: String,
    pub sort_order: i64,
    pub hidden: bool,
    pub applies_to: Vec<String>,
    pub count: i64,
    /// Count per kind key, e.g. `{"movies": 12, "series": 4}`.
    pub by_kind: HashMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryVolumeCount {
    pub id: String,
    pub label: String,
    pub mount_path: Option<String>,
    pub item_count: i64,
    pub copy_count: i64,
    pub total_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryOverview {
    pub total_items: i64,
    pub total_copies: i64,
    pub total_size_bytes: i64,
    pub kinds: Vec<LibraryCount>,
    pub categories: Vec<LibraryCategoryCount>,
    pub volumes: Vec<LibraryVolumeCount>,
    pub roots: Vec<ScanRoot>,
}

/// A copy rendered in the item detail drawer. Keeps the volume label beside the
/// relative path so the path is understandable without a second lookup.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryCopyView {
    pub id: String,
    pub volume_id: String,
    pub volume_label: String,
    pub rel_path: String,
    pub size_bytes: Option<i64>,
    pub quality: Option<String>,
    pub season: Option<String>,
    pub episode: Option<i64>,
    pub missing_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySeasonView {
    pub label: String,
    pub number: i64,
    pub episode_count: i64,
    pub total_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryItemDetail {
    pub item: LibraryCard,
    pub notes: String,
    pub rating: Option<f64>,
    pub original_title: Option<String>,
    pub seasons: Vec<LibrarySeasonView>,
    pub copies: Vec<LibraryCopyView>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Identity {
    pub app_name: String,
    pub workspace_name: String,
    pub owner_name: String,
}

impl Default for Identity {
    fn default() -> Self {
        Self {
            app_name: "Axiom Core".to_string(),
            workspace_name: "Personal".to_string(),
            owner_name: "Abdullah".to_string(),
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundSettings {
    pub kind: String,
    pub image_url: String,
    pub opacity: f64,
    pub scope: String,
}

impl Default for BackgroundSettings {
    fn default() -> Self {
        Self {
            kind: "none".to_string(),
            image_url: String::new(),
            opacity: 0.18,
            scope: "window".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Appearance {
    #[serde(default)]
    pub background: BackgroundSettings,
    #[serde(default)]
    pub page_backgrounds: HashMap<String, BackgroundSettings>,
}