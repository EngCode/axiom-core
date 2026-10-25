# Projects

**Route:** `/projects` · **Status:** shipped · **Source:** [`src/pages/projects.tsx`](../../src/pages/projects.tsx)

Projects group tasks around one outcome. The page manages their lifecycle: create, work, archive,
restore.

## Layout

- **Active grid** — every project whose status is not `done`, including paused projects (their
  status is shown as “Paused” on the card). Up to three columns; two at medium width.
- **Archived section** — a compact list of `done` projects with a restore action.
- **Create action** — *New project* in the header opens a dialog.

## Project card

| Element | Behaviour |
| --- | --- |
| Colour icon | project colour on a tinted background |
| Name, key, status | `WEB · Active` or `LIFE · Paused`, plus `target <date>` when set |
| Description | two lines, or “No description yet.” |
| Progress | `done of total tasks done`, percentage and a bar in the project colour |
| Task | opens the issue dialog pre-assigned to this project |
| Open tasks | navigates to `/issues?project=<id>` |
| Archive | hover action (top-right); sets status to `done` |

Progress is derived from issues with that `projectId`; the bar is colour-coded per project, not
per completion state.

## Creating a project

| Field | Rules |
| --- | --- |
| Name | required; trimmed; also derives the issue-key prefix |
| Description | optional, trimmed |
| Colour | one of six swatches (violet, blue, emerald, amber, rose, cyan) |
| Target date | optional date input |

The dialog previews the derived key (`Website revamp` → `WEB-1`) using
`projectKeyFromName`: initials of up to three words, or the first four characters of a single
word. Keys are not editable after creation in this version.

## Archiving and restoring

- Archive sets `status = done`; the project moves to the archived section.
- Restore sets `status = active`; the project returns to the grid.
- Tasks are never deleted or reassigned by either action — they keep their `projectId` and remain
  visible on the Issues page.
- There is no delete for projects yet; archiving is the safe path.

## Empty states

- No active projects: “No projects yet” with a create action.
- No archived projects: the section is omitted entirely.

## Data

Reads `state.projects` and `state.issues`; progress comes from `projectProgress()` in
[`derive.ts`](../../src/lib/derive.ts). Creation and status changes go through `addProject` and
`updateProject` in the store.

## Known gaps

- No project detail page (description, notes, milestones, activity).
- No editing of name, colour, description or target date after creation.
- Paused is displayed but there is no control to pause/unpause yet.
- Notes cannot be filtered by project from this page.
