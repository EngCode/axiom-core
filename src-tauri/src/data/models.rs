/*======> Reference By Comment <======
 * ===> 01 - Workspace Models
 * ===> 02 - Identity
 * ===> 03 - Library Models
 */

use serde::{Deserialize, Serialize};

/// A snapshot of the workspace exactly as the frontend holds it.
/// Field names are camelCase so the JSON crosses the Tauri boundary unchanged.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub version: u32,
    #[serde(default)]
    pub identity: Identity,
    pub theme: String,
    pub sidebar_collapsed: bool,
    pub projects: Vec<Project>,
    pub issues: Vec<Issue>,
    pub notes: Vec<Note>,
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