/*======> Reference By Comment <======
 * ===> 01 - Input Contracts
 * ===> 02 - Mutations
 */

//=====> Input Contracts <=====//

use rusqlite::Connection;
use serde::Deserialize;

use super::db;
use super::models::{ActivityEntry, Issue};

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssuePatch {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub labels: Option<Vec<String>>,
    pub due_date: Option<String>,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueDraft {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub due_date: Option<String>,
}

//=====> Mutations <=====//

fn now_stamp(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now')", [], |row| row.get(0))
}

fn valid_status(value: &str) -> bool {
    matches!(value, "backlog" | "todo" | "in_progress" | "done")
}

fn valid_priority(value: &str) -> bool {
    matches!(value, "urgent" | "high" | "medium" | "low" | "none")
}

/// Applies a partial issue update and returns the new issue. The write path is the same snapshot
/// `save_state` command the UI uses, so counters and activity stay coherent.
pub fn update_issue(
    connection: &mut Connection,
    issue_id: &str,
    patch: &IssuePatch,
) -> rusqlite::Result<Option<Issue>> {
    let Some(mut state) = db::load_state(connection)? else {
        return Ok(None);
    };

    let Some(index) = state.issues.iter().position(|issue| issue.id == issue_id) else {
        return Ok(None);
    };

    let stamp = now_stamp(connection)?;
    let (updated, status_message) = {
        let issue = &mut state.issues[index];

        if let Some(title) = &patch.title {
            if !title.trim().is_empty() {
                issue.title = title.trim().to_string();
            }
        }
        if let Some(description) = &patch.description {
            issue.description = description.clone();
        }
        if let Some(status) = &patch.status {
            if !valid_status(status) {
                return Err(rusqlite::Error::InvalidParameterName(status.clone()));
            }
            if issue.status != *status {
                issue.completed_at = if status == "done" {
                    Some(stamp.clone())
                } else {
                    None
                };
                issue.status = status.clone();
            }
        }
        if let Some(priority) = &patch.priority {
            if !valid_priority(priority) {
                return Err(rusqlite::Error::InvalidParameterName(priority.clone()));
            }
            issue.priority = priority.clone();
        }
        if let Some(labels) = &patch.labels {
            issue.labels = labels.clone();
        }
        if let Some(due_date) = &patch.due_date {
            issue.due_date = if due_date.trim().is_empty() {
                None
            } else {
                Some(due_date.clone())
            };
        }
        if let Some(project_id) = &patch.project_id {
            issue.project_id = if project_id.trim().is_empty() {
                None
            } else {
                Some(project_id.clone())
            };
        }

        issue.updated_at = stamp.clone();
        let message = patch
            .status
            .as_deref()
            .filter(|status| status == &"done")
            .map(|_| format!("Completed {} · {}", issue.key, issue.title));

        (issue.clone(), message)
    };

    if let Some(message) = status_message {
        state.activity.insert(
            0,
            ActivityEntry {
                id: format!("a-api-{stamp}"),
                kind: "issue".to_string(),
                message,
                at: stamp,
            },
        );
    }

    db::save_state(connection, &state)?;
    Ok(Some(updated))
}

/// Creates an issue through the same counter/key rules as the UI.
pub fn create_issue(connection: &mut Connection, draft: &IssueDraft) -> rusqlite::Result<Issue> {
    let Some(mut state) = db::load_state(connection)? else {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    };

    let title = draft.title.trim();
    if title.is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("title".to_string()));
    }

    let status = draft.status.clone().unwrap_or_else(|| "todo".to_string());
    if !valid_status(&status) {
        return Err(rusqlite::Error::InvalidParameterName(status));
    }
    let priority = draft.priority.clone().unwrap_or_else(|| "none".to_string());
    if !valid_priority(&priority) {
        return Err(rusqlite::Error::InvalidParameterName(priority));
    }

    let stamp = now_stamp(connection)?;
    let next = state.counters.issue + 1;
    let prefix = draft
        .project_id
        .as_ref()
        .and_then(|id| state.projects.iter().find(|project| &project.id == id))
        .map(|project| project.key.clone())
        .unwrap_or_else(|| "TASK".to_string());

    let issue = Issue {
        id: format!("i-api-{next}"),
        key: format!("{prefix}-{next}"),
        title: title.to_string(),
        description: draft.description.clone(),
        status: status.clone(),
        priority,
        project_id: draft.project_id.clone(),
        labels: draft.labels.clone(),
        due_date: draft.due_date.clone(),
        created_at: stamp.clone(),
        updated_at: stamp.clone(),
        completed_at: if status == "done" {
            Some(stamp.clone())
        } else {
            None
        },
    };

    state.counters.issue = next;
    state.issues.insert(0, issue.clone());
    state.activity.insert(
        0,
        ActivityEntry {
            id: format!("a-api-{next}"),
            kind: "issue".to_string(),
            message: format!("Created {} · {}", issue.key, issue.title),
            at: stamp,
        },
    );

    db::save_state(connection, &state)?;
    Ok(issue)
}
