use std::collections::HashSet;
use std::env;

use axiom_core_lib::data::{api, db};
use rusqlite::Connection;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = env::args()
        .nth(1)
        .unwrap_or_else(|| ".axiom-data/axiom.db".to_string());
    let mut connection = Connection::open(&path)?;

    let state = db::load_state(&connection)?.ok_or("workspace is not initialized")?;
    let existing: HashSet<String> = state.issues.iter().map(|issue| issue.key.clone()).collect();

    //===> Close AXI-33 Through The Mutation API <===//
    let api_done = api::IssuePatch {
        status: Some("done".to_string()),
        description: Some(
            "Core API v1 is shipped: read commands (version, snapshot, project, issue) plus issue update/create mutations, a typed frontend client and the CORE-API contract. Mutation responses still feed the snapshot writer."
                .to_string(),
        ),
        ..Default::default()
    };
    if let Some(issue) = api::update_issue(&mut connection, "i-axiom-16", &api_done)? {
        println!("updated {} -> {}", issue.key, issue.status);
    }

    //===> Point The Next Feature At Milestones <===//
    let next_feature = api::IssuePatch {
        priority: Some("high".to_string()),
        description: Some(
            "Next project primitive: milestones with a due date, status and issue rollup. The project detail tab already carries the planned shape."
                .to_string(),
        ),
        ..Default::default()
    };
    if let Some(issue) = api::update_issue(&mut connection, "i-axiom-14", &next_feature)? {
        println!("updated {} ({})", issue.key, issue.priority);
    }

    //===> Record The Work That Just Landed <===//
    let drafts = [
        (
            "AXI-34",
            api::IssueDraft {
                title: "Pointer-based drag sorting with visible handles".to_string(),
                description: "HTML5 drag was unreliable in WebView2, so sorting now uses pointer events, elementFromPoint and a floating label. Handles are always faintly visible on projects and issues.".to_string(),
                status: Some("done".to_string()),
                priority: Some("high".to_string()),
                project_id: Some("p-axiom".to_string()),
                labels: vec!["feature".to_string(), "ui".to_string()],
                due_date: None,
            },
        ),
        (
            "AXI-35",
            api::IssueDraft {
                title: "Shared IssueList for Issues and project detail".to_string(),
                description: "One listing component now owns status groups, per-group add, drag reorder and empty states. The Issues page and the project Issues tab only supply data and the add handler.".to_string(),
                status: Some("done".to_string()),
                priority: Some("high".to_string()),
                project_id: Some("p-axiom".to_string()),
                labels: vec!["feature".to_string(), "ui".to_string()],
                due_date: None,
            },
        ),
        (
            "AXI-36",
            api::IssueDraft {
                title: "Auto-scroll while pointer sorting".to_string(),
                description: "Dragging near the viewport edge should scroll the list. The current sortable works within the visible area only.".to_string(),
                status: Some("todo".to_string()),
                priority: Some("low".to_string()),
                project_id: Some("p-axiom".to_string()),
                labels: vec!["ux".to_string(), "sorting".to_string()],
                due_date: None,
            },
        ),
    ];

    for (key, draft) in drafts {
        if existing.contains(key) {
            println!("skipped existing {key}");
            continue;
        }
        let issue = api::create_issue(&mut connection, &draft)?;
        println!("created {} · {}", issue.key, issue.title);
    }

    //===> Report Through The Read Side <===//
    let after = db::load_state(&connection)?.ok_or("workspace disappeared")?;
    let project_issues: Vec<_> = after
        .issues
        .iter()
        .filter(|issue| issue.project_id.as_deref() == Some("p-axiom"))
        .collect();
    let done = project_issues
        .iter()
        .filter(|issue| issue.status == "done")
        .count();

    println!(
        "axiom: {} issues, {} done, counter {}",
        project_issues.len(),
        done,
        after.counters.issue
    );

    Ok(())
}
