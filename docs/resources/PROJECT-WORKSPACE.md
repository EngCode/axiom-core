# Project workspace — design plan

**Status:** phase 1 shipped; milestones and documents planned ·
**Related:** [project detail](../pages/project-detail.md), [projects](../pages/projects.md),
[actions](../../src/lib/actions.ts), [context menu](../../src/components/context-menu.tsx)

The project is the unit of intent. Today it owns issues and notes; the next step is to let it own
milestones and documents without turning the sidebar into a folder tree.

## Model

| Entity | Fields | Status |
| --- | --- | --- |
| **Project** | key, name, description, colour, status, target date | shipped |
| **Issue** | key, title, status, priority, labels, due date, project | shipped |
| **Milestone** | id, projectId, title, dueDate, status, description | planned (AXI-31) |
| **Project document** | id, projectId, title, body, kind, pinned | planned (AXI-32) |
| **Note** | title, body, tags, optional project | shipped |

Rules under consideration:

- An issue may reference **one** milestone; a milestone rolls up its issues' completion.
- A project document is a page, not a note with a `projectId`. It can link to milestones and issues.
- Archiving a project archives its documents and milestones; nothing is deleted.
- Deleting a project requires confirmation and moves issues to the inbox (or deletes them).

## Action API

Every surface — project card, context menu, detail header, command palette — should call the same
typed action layer instead of building navigation or dialogs itself.

```ts
interface ProjectActions {
  open(project): void
  openIssues(project): void
  newIssue(project): void
  archive(project): void
  restore(project): void
}

interface IssueActions {
  edit(): void
  toggleDone(): void
  openProject(project): void
  remove(): void
  copyKey(): void
}
```

Implemented in `src/lib/actions.ts`; handlers are injected by the surface, so the actions stay free
of React Router and dialog state. The context menu is one consumer; the detail page and cards are
others. The palette can adopt the same contract next.

**Core boundary (AXI-33):** the frontend contract is phase 1. Phase 4 mirrors it in Rust commands
(`project_open`, `milestone_save`, `project_document_save`) so a future CLI or second window can
reuse the same operations instead of re-implementing them.

## Phases

1. **Project detail + context menus + motion** — shipped.
   - `/projects/:id` with overview, issues, planned tabs.
   - Right-click project cards and issue rows; keyboard `Shift+F10`.
   - Viewport-clamped menus, hover lift, press settle.
2. **Milestones** — AXI-31.
3. **Project documents** — AXI-32.
4. **Core boundary** — AXI-33 done. Core API v1 ships reads (`core_api_version`, `core_snapshot`,`n   `core_project`, `core_issue`) and issue mutations (`core_issue_update`, `core_issue_create`).

## Interaction rules

- Right-click is an accelerator, never the only path: every menu action has a visible button or link
  somewhere (card `⋯`, row `⋯`, header buttons, tabs).
- Menus clamp to the viewport, close on scroll, Escape, or an outside click, and support arrow keys.
- Destructive actions confirm and name the target (`Delete AXI-18?`).
- Motion is short (120–150 ms), respects `prefers-reduced-motion`, and never blocks input.

## Open questions

- One milestone per issue or many-to-many?
- Do project documents share the Notes table or get their own?
- Should project documents compile into the bundled docs, or stay private?
- Does archiving cascade to milestones/documents, or only hide the project?
