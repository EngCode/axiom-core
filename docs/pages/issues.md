# Issues

**Route:** `/issues` · **Scoped route:** `/issues?project=<id>` ·
**Status:** shipped · **Source:** [`src/pages/issues.tsx`](../../src/pages/issues.tsx)

The complete task list, grouped by status. This is the page where triage and editing happen.

## Header

- Without a project filter: eyebrow “Workspace”, title “Issues”, description with total and open
  counts.
- With `?project=<id>`: eyebrow `<KEY> · Project`, the project name as the title, and its
  description. The page is otherwise identical.
- Actions: *Clear filters* (only when a filter is active) and *New issue* (pre-fills the project).

## Filters

| Control | Behaviour |
| --- | --- |
| Status pills | All / Backlog / Todo / In progress / Done with live counts; clicking the active status clears it |
| Text search | Matches title, issue key and labels, case-insensitive |
| Project select | `all` or one project; written to the URL (`?project=`) so it is linkable |
| Priority select | `all` or one priority |

Counts are computed **after** the project, priority and text filters, so the pills describe what
you are currently looking at. Filter state other than project lives in memory and resets on reload.

## Groups

- Fixed group order: Backlog, Todo, In progress, Done.`n- Grab the grip handle on row hover to reorder inside a group; dropping on a row in another group`n  adopts that status.`n- The listing is the shared `IssueList` component, also used by the project detail Issues tab.
- Each group shows a status icon, label, count, a one-line hint and a `+` that creates a task
  directly in that status (and current project).
- Empty groups disappear; the page shows one empty state when nothing matches.
- Done tasks keep strikethrough titles but remain editable.

## Row anatomy

| Element | Behaviour |
| --- | --- |
| Status circle | toggles done/todo without opening the dialog |
| Key | monospace `WEB-4`, hidden below 640 px |
| Title | truncates; clicking opens the issue dialog |
| Labels | first two, hidden below 768 px |
| Due chip | “Today”, “Tomorrow”, weekday, date, or `Nd overdue` (danger colours) |
| Priority | bar indicator; tooltip carries the label |
| Project | coloured dot + name on wide screens; “Personal” when no project |

## Creating and editing

- New issues receive a sequential key from the project prefix (`WEB-1`) or `TASK-1`.
- The dialog is documented in [issue-dialog.md](../features/issue-dialog.md).
- The status circle is the fastest path: one click completes; another restores to todo.

## Rich task content

Inside the edit dialog an existing task has three extra surfaces:

- **Checklist** — items with done state; the row shows a `done/total` badge.
- **Subtasks** — child issues created with `parentId`; complete or open them from the parent.
- **Attachments** — native file picker copies the file into the app data folder; open or remove it
  later. Paths are validated against that folder before opening.

The description uses the shared rich-text editor (bold, italic, underline, heading, lists, quote,
link). Notes and documents can also be linked to a task; the task dialog shows those links.
## Empty states

- No issues at all: “No issues yet” with a create action.
- Filters match nothing: “No issues match those filters” with *Clear filters*.

## Footer line

Shows `Showing N issues` (and `of total` when filtered), plus a reminder that rows edit and
circles complete.

## Known gaps

- No automatic sorting (priority / due date) or grouping switch; order is manual and persisted.
- No bulk selection, multi-select or saved views.
- Filter state is not persisted across reloads.
- No task dependencies or recurring tasks.
