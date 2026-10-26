# Axiom Core — product specification

**Status:** v0.1 (foundation) · **Owner:** Abdullah · **Last updated:** 2026-10-25

> **Direction update — 2026-10-25.** Axiom Core is now **desktop-first**: a Tauri shell around a pure
> Rust core (`axiom-core`) with SQLite, so it can live in the tray and feel like part of the OS.
> It also grows a **media Library** module (games, movies, series, anime and user-defined kinds)
> whose first job is answering *"do I already have this?"*. See [LIBRARY.md](LIBRARY.md) for the
> module design and the current delivery order.
>
> The desktop shell spike (2026-10-25) is working: tray + global quick capture, windows destroyed on
> close, ~26 MB resident with no window open.
>
> Workspace persistence moved to SQLite (`load_state` / `save_state`, WAL, schema v1); the
> Library tables and six editable kinds exist before their UI does.

Axiom Core is a personal workspace for tasks, projects and notes. It should feel like Linear
when you are executing and like Notion when you are thinking — fast, quiet, keyboard-first,
and entirely yours.

This document is the plan we iterate on. Everything under **Shipped in v0.1** exists in the
repo today; everything under **Roadmap** is the next conversation.

---

## 1. Vision

One place to answer three questions, every morning:

1. **What matters today?** → a short, honest focus list.
2. **What is moving?** → projects with visible progress.
3. **What am I thinking about?** → notes that are easy to write and easy to find.

Most personal tools fail by asking for structure before they return value. Axiom Core should be
useful on day one with ten tasks and no projects, and still coherent at a thousand tasks.

## 2. Principles

| Principle | What it means in practice |
| --- | --- |
| **Density over decoration** | Small type, tight rows, one accent colour. No dashboards for the sake of it. |
| **Keyboard first, mouse friendly** | Every core action is reachable without the mouse; nothing *requires* a shortcut. |
| **One list** | Tasks live in one visible system, grouped by status. No duplicate "today" lists that drift. |
| **Local and immediate** | No account, no spinner. State is in the browser and survives reloads. |
| **Writing is first-class** | Notes are plain text, editable instantly, never trapped behind a save button. |
| **Progressive structure** | Labels, projects and due dates are optional; the app works without them. |

## 3. Who it is for

One person: a developer/designer who runs their own work. They think in projects but live in a
daily list, write a lot, and dislike tools that require maintenance. Secondary audience: anyone
who wants a self-hosted personal Linear.

## 4. Shipped in v0.1 (browser prototype)

### Shell

- Responsive app shell: sidebar (collapsible on desktop, drawer on mobile), sticky top bar,
  scrollable content column, footer with shortcut hints.
- Dark theme by default, light theme available; preference persists and is applied before first
  paint to avoid a flash.
- Workspace identity ("Axiom Core · Abdullah · Personal workspace") is a placeholder constant.

### Dashboard (`/`)

- Time-aware greeting, today's date, and a one-line summary (open / overdue / due today).
- Four stat cards: open tasks, due this week, completed in the last 7 days, active projects.
- **Focus** card: the six tasks that most deserve attention, scored by overdue → due today →
  urgency → in-progress. Inline quick-add creates a task due today.
- **Projects** card with per-project progress, **This week** chart of completions (7 days) plus a
  status breakdown, **Recent notes**, and an **Activity** feed.
- Quick actions: new issue, new note.

### Issues (`/issues`)

- All tasks grouped by status (Backlog / Todo / In progress / Done) with per-group counts.
- Filters: status pills, project, priority, free-text (title, key, labels). Project filter is
  URL-driven (`/issues?project=<id>`) so sidebar project links and deep links work.
- Row anatomy: status toggle, key (`WEB-4`), title, labels, due chip, priority indicator, project.
- Click a row to edit; click the status circle to complete; per-group "+" pre-fills that status.

### Issue dialog

- Create and edit from anywhere: title, description, status, priority, project, due date.
- Delete with confirmation; `⌘/Ctrl + Enter` saves.
- New issues get a sequential key from the project prefix — `WEB-1`, `SYS-7`, `TASK-16`.

### Projects (`/projects`)

- Cards with colour, key, status, target date, description, task counts and progress bar.
- Create a project (name, description, colour, target date); keys are derived from the name.
- Archive / restore a project; archived projects are listed separately.
- Per-project "Task" action creates an issue pre-assigned to that project.

### Notes (`/notes`)

- Two-pane layout: searchable list (pinned first, then recently edited) and an editor.
- Instant, per-keystroke autosave; title, body, tags (add/remove), optional project, pin, delete.
- New notes can be created from the page, the dashboard, or the command palette.

### Command palette (`⌘K` / `Ctrl+K`)

- Searches pages, actions, issues and notes; arrow keys + Enter; grouped results.
- Actions: create issue, create note, switch theme.

### Persistence

- Whole state is serialised to `localStorage` (`axiom.state.v1`) on every change.
- Seed data is relative to today, so the dashboard always looks alive on a fresh load.
- "Reset demo data" in the sidebar restores the seed after confirmation.

## 5. Information architecture

```
Axiom Core
├── Dashboard        /                  overview + focus
├── Issues           /issues            all tasks, grouped by status
│                    /issues?project=id project-scoped list
├── Projects         /projects          active + archived
└── Notes            /notes             list + editor
                     /notes?note=id     deep link to a note
```

Global overlays: command palette (`⌘K`), issue dialog (`C` or any "New issue" action).

Non-route concepts: Inbox (not shipped), Saved views (not shipped), Calendar (not shipped).

## 6. Data model

```ts
type Status = 'backlog' | 'todo' | 'in_progress' | 'done'
type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
type ProjectStatus = 'active' | 'paused' | 'done'
type ProjectColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan'

interface Issue {
  id: string
  key: string            // WEB-4, TASK-16
  title: string
  description: string
  status: Status
  priority: Priority
  projectId: string | null
  labels: string[]
  dueDate: string | null // YYYY-MM-DD, local calendar date
  createdAt: string      // ISO timestamp
  updatedAt: string
  completedAt: string | null
}

interface Project {
  id: string
  name: string
  key: string            // derived prefix, e.g. WEB
  description: string
  color: ProjectColor
  status: ProjectStatus
  createdAt: string
  targetDate: string | null
}

interface Note {
  id: string
  title: string
  content: string        // plain text for now
  projectId: string | null
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

interface ActivityEntry {
  id: string
  kind: 'issue' | 'note' | 'project'
  message: string
  at: string
}

interface AppState {
  version: number        // schema version, currently 1
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  projects: Project[]
  issues: Issue[]
  notes: Note[]
  activity: ActivityEntry[]   // capped at 60
  counters: { issue: number } // for sequential keys
}
```

**Derived, not stored:** open counts, due-this-week, overdue, completion series, project
progress, focus ordering, activity timestamps. This keeps the store small and impossible to
desynchronise.

## 7. Core flows

1. **Capture** — `C` anywhere (or the palette) → title → Enter. Nothing else required.
2. **Triage** — from the dashboard Focus card or the Issues page, change status inline by
   clicking the status circle; open the dialog for detail.
3. **Plan a week** — open a project from the sidebar, filter by status, set due dates.
4. **Think** — `Notes` → `+` → write. Everything autosaves; tags are added inline.
5. **Review** — dashboard: completions chart, overdue count, activity feed.
6. **Reset** — sidebar → Reset demo data (destructive, confirmed).

## 8. Design language

- **Type:** Inter (UI), JetBrains Mono (keys and IDs). Sizes: 10–11px metadata, 12–13px UI,
  20–27px headings. Tight tracking on large text.
- **Colour:** near-black canvas, layered surfaces (`surface`, `surface-2`, `surface-3`), one
  crimson accent. Status colours: amber = in progress, accent = done, grey = backlog/todo.
  Priority: rose/amber/sky/grey bars. Everything is a CSS variable with light/dark values.
- **Shape & depth:** 8–12px radii, 1px borders, shadows only for floating layers
  (dialogs, palette). Hairline dividers inside lists.
- **Motion:** 150–250ms, opacity + 4px lift. Respects `prefers-reduced-motion`.
- **Empty states:** every list explains what it is for and offers the one useful action.

## 9. Keyboard model

| Keys | Action |
| --- | --- |
| `⌘K` / `Ctrl+K` | Open / close command palette |
| `↑` `↓` `↵` | Move and run in the palette |
| `C` | New issue (ignored while typing) |
| `⌘J` / `Ctrl+J` | New issue (secondary binding) |
| `⌘/Ctrl + Enter` | Save the issue dialog |
| `Esc` | Close dialog / palette |
| `Enter` | Add quick task (dashboard), add tag (notes) |

## 10. Technical architecture

- **React 19 + TypeScript + Vite 8**, **Tailwind CSS 4** via `@tailwindcss/vite` (CSS-first
  tokens, no `tailwind.config.js`).
- **Routing:** React Router 7 (`BrowserRouter`).
- **State:** single reducer in `src/lib/store.tsx`, exposed through `useApp()`. Mutations go
  through intent methods (`addIssue`, `updateIssue`, `toggleIssueDone`, `addNote`, …) so activity
  logging and timestamps stay consistent.
- **Persistence:** `localStorage`, versioned (`axiom.state.v1`); a version mismatch falls back to
  seed data.
- **UI state:** `src/lib/ui.tsx` holds the palette and issue-dialog state plus global shortcuts.
- **Styling:** semantic Tailwind utilities (`bg-surface`, `text-fg-muted`, `border-line`) mapped
  to CSS variables in `src/index.css`.
- **Structure:**

```
src/
├── components/   app-shell, sidebar, topbar, ui primitives, issue bits/row/dialog, palette
├── lib/          types, meta, data (seed), store, ui, derive, utils
├── pages/        dashboard, issues, projects, notes
├── App.tsx       providers + routes + global overlays
└── index.css     design tokens, base styles, motion
```

## 11. Non-goals for v0.1

Accounts, sync, multi-user, notifications, mobile apps, drag-and-drop, recurring tasks,
sub-tasks, file attachments, Markdown rendering, reminders, calendar integration, search across
closed items. Each is deliberately deferred rather than forgotten.

## 12. Roadmap

> **Sequencing (2026-10-25):** desktop-first — Tauri shell, then the Rust core + SQLite, then the Library milestones in [LIBRARY.md](LIBRARY.md). The phases below are the feature backlog, not the build order.

### v0.2 — make the daily loop real

- **Today view** and a proper daily plan: schedule tasks to a date, "push to tomorrow", roll-over
  of unfinished work.
- **Undo** for destructive actions (toast + `⌘Z`), replacing `window.confirm`.
- **Quick-add parsing**: `tomorrow`, `fri`, `!urgent`, `#project`, `@label`.
- **Sorting and grouping** on the Issues page (priority, due date, project).
- **Subtasks** (one level) and a "blocked by" flag.

Acceptance: open dashboard → add three tasks with dates using only the keyboard → tomorrow's
plan reflects them.

### v0.3 — writing

- Markdown with a live preview or inline formatting; slash menu; checkboxes inside notes.
- Search across notes and issues from one index; jump-to-line in the palette.
- Convert note ⇄ issue; backlinks between notes and projects.

### v0.4 — structure

- Project detail pages with milestones, description docs and filtered views.
- Saved views (filters + grouping persisted and linkable).
- Label management and bulk selection (multi-row actions).

### v0.5 — continuity

- Export / import JSON; automatic local backups.
- Optional sync (Supabase or a self-hosted endpoint) with offline queue.
- PWA install + offline shell; browser notifications for due reminders.

### v1.0 — a complete personal system

- Multiple workspaces, integrations (calendar read-only), weekly review mode.
- Import from Linear / Todoist / Notion.

## 13. Open questions for the next planning round

1. **Flow model:** is a task's `status` enough, or do we need a separate *scheduled date* +
   *Today* bucket? (Recommendation: keep status, add `scheduledFor`.)
2. **Notes editor:** stay plain-text-plus-Markdown, or move to a block editor? The former keeps
   the app fast and portable; the latter unlocks structure at a real complexity cost.
3. **Sync:** local-only forever, or a small backend? If sync, do we need multi-device conflict
   handling now or later?
4. **Recurring work:** habits and chores are a large slice of personal life. Recurrence rules in
   v0.3?
5. **Review ritual:** should the app generate a weekly review note automatically, or stay out of
   the way?
6. **Naming:** "Axiom Core" is a placeholder. Keep it or rename before the first shared build?

## 14. Decision log

| # | Decision | Why |
| --- | --- | --- |
| 1 | Single status field, no separate Today list in v0.1 | Avoids two sources of truth; revisit with `scheduledFor` in v0.2. |
| 2 | Client-only state in `localStorage` | Fastest path to a usable personal tool; versioned so a backend can replace it later. |
| 3 | Tailwind v4 CSS-first tokens | Theme switch is one class on `<html>`; no config drift. |
| 4 | Issue keys derived from project prefix + global counter | Linear-familiar, readable in notes and commits. |
| 5 | Derived stats instead of stored aggregates | No cache invalidation bugs; cheap at personal scale. |
| 6 | Native `confirm()` for destructive actions in v0.1 | Ships now; replaced by undo toasts in v0.2. |
