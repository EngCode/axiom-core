# Issue create / edit dialog

**Status:** shipped · **Source:**
[`src/components/issue-dialog.tsx`](../../src/components/issue-dialog.tsx) ·
**Related:** [issue row](../pages/issues.md), [keyboard](keyboard.md)

A single modal handles both creating and editing a task. It is mounted once in `App.tsx` and
opened through `useUI().openIssueDialog()`.

## Opening

| Context | Result |
| --- | --- |
| `C` or `⌘J` | new task, status **todo**, no project |
| Top bar / dashboard / issues header *New issue* | same |
| Per-status `+` on the Issues page | new task with that status |
| Project card *Task* | new task pre-assigned to the project |
| Clicking an issue row | edit that issue |
| Command palette → issue | edit that issue |

`openIssueDialog({ issueId, status, projectId })` — `issueId` switches to edit mode; the other two
pre-fill a new task.

## Form

| Field | Notes |
| --- | --- |
| Title | required, trimmed; autofocused; submit disabled while empty |
| Description | optional plain text, 3 rows |
| Status | four picker buttons: Backlog, Todo, In progress, Done |
| Priority | five picker buttons: Urgent, High, Medium, Low, No priority |
| Project | select, or “No project” (personal) |
| Due date | native date input; stored as `YYYY-MM-DD` |

Edit mode additionally shows `KEY · created <date> · updated <time>` under the fields.

## Saving

- `Create issue` / `Save changes`, or `⌘/Ctrl + Enter` from anywhere in the form.
- New issues receive their key in the reducer: project prefix + sequential counter
  (`WEB-4`, `TASK-16`).
- Changing status to **done** sets `completedAt`; moving out of done clears it. The reducer also
  appends an activity entry for status changes.
- The dialog closes on save; the new/updated task appears immediately.

## Deleting

Edit mode exposes a danger *Delete* action. It asks for confirmation (`window.confirm`) and then
removes the issue; the dialog closes and an activity entry is recorded.

## Behaviour details

- The modal is rendered in a portal with a backdrop; `Esc` and the close button dismiss it.
- Body scrolling is locked while open.
- The form is keyed by issue id (or `new-<status>-<project>`), so switching issues resets fields.
- No autosave: closing without saving discards changes.

## Known gaps

- Labels cannot be edited here (they are data-only for now).
- No attachments, sub-tasks, dependencies or reminders.
- `window.confirm` for delete will be replaced by an undo toast.
- No duplicate action.
