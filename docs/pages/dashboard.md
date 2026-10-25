# Dashboard

**Route:** `/` · **Status:** shipped · **Source:** [`src/pages/dashboard.tsx`](../../src/pages/dashboard.tsx)

The dashboard answers three questions in one glance: what is open, what needs attention today,
and what moved recently. It is assembled from independent cards, all reading the same store.

## Layout

| Region | Contents |
| --- | --- |
| Hero | date, time-aware greeting, open/overdue summary, *New issue* and *New note* |
| Stat row | open tasks, due this week, completed in the last 7 days, active projects |
| Focus (2/3) | urgency-ranked open tasks with inline quick-add |
| Rail (1/3) | project progress, weekly completions, status counts |
| Recent notes (2/3) | three pinned/recent notes |
| Activity (1/3) | last six activity entries |

Below 1024 px the grid collapses to a single column; the rail follows Focus.

## Features

### Greeting and summary
- `greeting()` chooses “Good morning / afternoon / evening”, or “Working late” before 05:00.
- Summary is derived, never stored: `14 tasks open · 1 overdue · 1 due today`. When nothing is open
  it reads “Everything is clear.”
- Date is the local calendar date, long format.

### Stat cards
- **Open tasks** — status ≠ done; caption shows in-progress count.
- **Due this week** — open tasks due within 0–7 days; caption becomes `1 overdue` and the icon
  turns danger-coloured when anything is overdue.
- **Completed · 7 days** — tasks whose `completedAt` is within the window; caption shows the
  percentage of all tasks completed.
- **Active projects** — projects with status `active`; caption shows the note count.

### Focus list
The six tasks most worth attention, scored in [`derive.ts`](../../src/lib/derive.ts):

| Signal | Weight |
| --- | --- |
| Overdue | 100 + 3/day (max 30) |
| Due today | 80 |
| Due tomorrow | 55 |
| Due within 3 / 7 days | 35 / 18 |
| Priority urgent / high / medium / low | 40 / 24 / 12 / 4 |
| In progress | 16 |

- Inline quick-add creates a task with status **todo**, priority **medium**, due **today**.
  `Enter` submits; the input clears and the task appears immediately.
- The status circle completes/uncompletes a task without opening it.
- Clicking a row opens the issue dialog.
- Footer summarises overdue / due today / in progress, and labels the ordering.

### Projects card
- Lists active projects (paused projects are not shown here).
- Each row shows done/total, a percentage and a bar coloured by project colour.
- Clicking a project opens `/issues?project=<id>`.

### This week
- Seven buckets (oldest → today). Bar height is relative to the busiest day; today is accent-filled.
- Tooltip per bar: “N tasks completed · date”.
- Legend below counts backlog / todo / in progress / done across the whole workspace.

### Recent notes
- Ordered by pinned first, then `updatedAt`; three cards.
- Each shows title, a 110-character excerpt, relative update time and a pin marker.

### Activity
- The last six entries from the reducer's activity feed (created/completed/moved/deleted issues,
  notes, projects). Relative timestamps.

## Data

Reads `state.issues`, `state.projects`, `state.notes`, `state.activity`; computes stats, focus,
progress and the weekly series through `getStats`, `focusIssues`, `projectProgress`,
`completionSeries`. No dashboard-specific storage.

## States

- **Empty workspace** — every list shows an empty state; the Focus card offers “Add a task”.
- **No projects** — the projects card explains there is nothing active yet.
- **No notes** — offers “Write a note”.
- There is no loading state: state is local and synchronous.

## Keyboard and links

| Action | How |
| --- | --- |
| New issue | `C`, `⌘J`, the hero button, or the top bar |
| New note | hero button → `/notes?new=1` |
| Open an issue | click a row |
| Complete an issue | click its status circle |

## Known gaps

- Focus cannot be reordered or snoozed by hand.
- No “today” bucket separate from due dates (planned for v0.2).
- The week chart tracks completions only, not created/closed balance.
