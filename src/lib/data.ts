/**======> Reference By Comment <======
 * ===> 01 - Constants
 * ===> 02 - Seed Data
 */

import { DEFAULT_APPEARANCE } from './appearance'
import { DEFAULT_IDENTITY } from './identity'
import type { AppState, DocumentRecord, Issue, Milestone, Note, Project } from './types'
import { addDaysISO } from './utils'

export const STORAGE_KEY = 'axiom.state.v1'
export const LEGACY_STORAGE_KEY = 'orbit.state.v1'
export const APP_VERSION = 1


function daysAgo(days: number, hour = 10): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const projects: Project[] = [
  {
    id: 'p-axiom',
    name: 'Axiom Core',
    key: 'AXI',
    description: 'This workspace, tracked as a project: shipped work, remaining features and known bugs.',
    color: 'rose',
    status: 'active',
    createdAt: daysAgo(2),
    targetDate: addDaysISO(45),
  },
  {
    id: 'p-web',
    name: 'Website revamp',
    key: 'WEB',
    description: 'Rebuild the personal site around writing rather than a portfolio grid.',
    color: 'blue',
    status: 'active',
    createdAt: daysAgo(42),
    targetDate: addDaysISO(45),
  },
  {
    id: 'p-sys',
    name: 'Q4 systems',
    key: 'SYS',
    description: 'Weekly review, morning planning and the habits that keep them alive.',
    color: 'violet',
    status: 'active',
    createdAt: daysAgo(30),
    targetDate: addDaysISO(30),
  },
  {
    id: 'p-read',
    name: 'Reading list',
    key: 'READ',
    description: 'Books, essays and the notes worth keeping afterwards.',
    color: 'emerald',
    status: 'active',
    createdAt: daysAgo(21),
    targetDate: null,
  },
  {
    id: 'p-life',
    name: 'Life admin',
    key: 'LIFE',
    description: 'Appointments, renewals and the boring but necessary.',
    color: 'amber',
    status: 'paused',
    createdAt: daysAgo(60),
    targetDate: null,
  },
]

type SeedIssue = Omit<Issue, 'createdAt' | 'updatedAt' | 'completedAt'> & {
  createdDaysAgo: number
  completedDaysAgo?: number
}

const seedIssues: SeedIssue[] = [
  {
    id: 'i-axiom-1',
    key: 'AXI-18',
    title: 'Fix the theme menu overflowing the window edge',
    description:
      'The top-bar picker anchored to the trigger start edge and spilled past the right side of the window. It now anchors to the end edge, clamps to the viewport, and still closes on Escape or an outside click.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['bug', 'ui'],
    dueDate: null,
    createdDaysAgo: 2,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-2',
    key: 'AXI-19',
    title: 'Tray labels keep the old app name after renaming',
    description:
      'The tray now rebuilds its tooltip and menu labels from the saved identity through the sync_tray command whenever the app name changes.',
    status: 'done',
    priority: 'low',
    projectId: 'p-axiom',
    labels: ['bug', 'native'],
    dueDate: null,
    createdDaysAgo: 2,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-3',
    key: 'AXI-20',
    title: 'Quick capture cannot target a project',
    description:
      'Global capture has an Inbox/project picker now, and the chosen project is stored on the new issue.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['bug', 'ux'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-4',
    key: 'AXI-21',
    title: 'Documents: ship the long-form editor',
    description:
      'The /documents shell exists but has no editor, hierarchy or storage. Needs a block model, nesting, backlinks and the table of contents.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'documents'],
    dueDate: addDaysISO(30),
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-5',
    key: 'AXI-22',
    title: 'Library: scan volumes and attach copies',
    description:
      'The library data layer is ready; the review-first scanner, volume detection and relative-path attachment are not. This is the first real library milestone.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'library'],
    dueDate: addDaysISO(45),
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-6',
    key: 'AXI-23',
    title: 'Appearance: accept local background images',
    description:
      'Backgrounds currently take an image URL. A file picker should copy the asset into app data and reference it safely instead of storing a data URL.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['feature', 'appearance'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-7',
    key: 'AXI-24',
    title: 'Audit contrast and focus rings across all three themes',
    description:
      'Crimson buttons now use light labels. Still to check: muted text on Paper, focus rings on Terminal, disabled states, and the new background layer at high opacity.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['design', 'a11y'],
    dueDate: addDaysISO(7),
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-8',
    key: 'AXI-25',
    title: 'Backgrounds: allow per-page scope',
    description:
      'Scope is window or content column. Per-page backgrounds would let Notes or Library carry their own texture without changing the rest of the workspace.',
    status: 'done',
    priority: 'low',
    projectId: 'p-axiom',
    labels: ['feature', 'appearance'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-9',
    key: 'AXI-26',
    title: 'Settings appearance panel with theme cards',
    description:
      'A real Settings page with theme cards, background controls, profile and local data. Replaced the hidden personalization dialog.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'settings'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-10',
    key: 'AXI-27',
    title: 'Crimson brand pass and Classic accent',
    description:
      'New crimson mark across the app, icons and tray; Classic accent moved from violet to crimson with a separate strong fill for primary buttons.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['design', 'brand'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-1',
    key: 'WEB-1',
    title: 'Design the new homepage hero',
    description:
      'Lead with a single sentence about what I do, then the three most recent notes. No carousel, no badges.',
    status: 'in_progress',
    priority: 'high',
    projectId: 'p-web',
    labels: ['design'],
    dueDate: addDaysISO(0),
    createdDaysAgo: 9,
  },
  {
    id: 'i-2',
    key: 'WEB-2',
    title: 'Write the about page copy',
    description: 'Third person feels wrong for a personal site. Keep it first person and short.',
    status: 'todo',
    priority: 'medium',
    projectId: 'p-web',
    labels: ['copy'],
    dueDate: addDaysISO(2),
    createdDaysAgo: 7,
  },
  {
    id: 'i-3',
    key: 'WEB-3',
    title: 'Set up RSS feed and newsletter',
    description: '',
    status: 'backlog',
    priority: 'low',
    projectId: 'p-web',
    labels: ['growth'],
    dueDate: null,
    createdDaysAgo: 20,
  },
  {
    id: 'i-4',
    key: 'WEB-4',
    title: 'Fix mobile nav layering bug',
    description: 'The menu sits under the sticky header below 420px. Reproduce on Safari first.',
    status: 'todo',
    priority: 'urgent',
    projectId: 'p-web',
    labels: ['bug', 'frontend'],
    dueDate: addDaysISO(-1),
    createdDaysAgo: 4,
  },
  {
    id: 'i-5',
    key: 'WEB-5',
    title: 'Ship dark mode toggle',
    description: 'Respect system preference, remember the choice.',
    status: 'done',
    priority: 'high',
    projectId: 'p-web',
    labels: ['frontend'],
    dueDate: null,
    createdDaysAgo: 14,
    completedDaysAgo: 2,
  },
  {
    id: 'i-6',
    key: 'WEB-6',
    title: 'Audit page performance on 3G',
    description: '',
    status: 'backlog',
    priority: 'medium',
    projectId: 'p-web',
    labels: ['performance'],
    dueDate: addDaysISO(12),
    createdDaysAgo: 11,
  },
  {
    id: 'i-7',
    key: 'SYS-7',
    title: 'Draft the weekly review template',
    description: 'Five questions, thirty minutes, Sunday evening. Keep it under one page.',
    status: 'todo',
    priority: 'high',
    projectId: 'p-sys',
    labels: ['ritual'],
    dueDate: addDaysISO(1),
    createdDaysAgo: 6,
  },
  {
    id: 'i-8',
    key: 'SYS-8',
    title: 'Connect calendar to morning planning',
    description: 'Pull today’s events into the dashboard so planning does not need a second tab.',
    status: 'in_progress',
    priority: 'medium',
    projectId: 'p-sys',
    labels: ['automation'],
    dueDate: addDaysISO(4),
    createdDaysAgo: 5,
  },
  {
    id: 'i-9',
    key: 'SYS-9',
    title: 'Define quarterly goals',
    description: '',
    status: 'backlog',
    priority: 'medium',
    projectId: 'p-sys',
    labels: ['planning'],
    dueDate: null,
    createdDaysAgo: 3,
  },
  {
    id: 'i-10',
    key: 'SYS-10',
    title: 'Archive old project notes',
    description: '',
    status: 'done',
    priority: 'low',
    projectId: 'p-sys',
    labels: ['cleanup'],
    dueDate: null,
    createdDaysAgo: 13,
    completedDaysAgo: 4,
  },
  {
    id: 'i-11',
    key: 'READ-11',
    title: 'Finish The Design of Everyday Things',
    description: 'Chapter 6 on affordances is the one to keep.',
    status: 'in_progress',
    priority: 'none',
    projectId: 'p-read',
    labels: ['book'],
    dueDate: addDaysISO(10),
    createdDaysAgo: 24,
  },
  {
    id: 'i-12',
    key: 'READ-12',
    title: 'Write notes on Atomic Habits',
    description: '',
    status: 'todo',
    priority: 'low',
    projectId: 'p-read',
    labels: ['notes'],
    dueDate: null,
    createdDaysAgo: 8,
  },
  {
    id: 'i-13',
    key: 'READ-13',
    title: 'Build a reading queue for next month',
    description: '',
    status: 'backlog',
    priority: 'none',
    projectId: 'p-read',
    labels: ['planning'],
    dueDate: null,
    createdDaysAgo: 16,
  },
  {
    id: 'i-14',
    key: 'LIFE-14',
    title: 'Renew passport',
    description: 'Needs photos, the old passport and about 45 minutes at the office.',
    status: 'todo',
    priority: 'urgent',
    projectId: 'p-life',
    labels: ['errand'],
    dueDate: addDaysISO(20),
    createdDaysAgo: 18,
  },
  {
    id: 'i-15',
    key: 'LIFE-15',
    title: 'Book dentist appointment',
    description: '',
    status: 'done',
    priority: 'medium',
    projectId: 'p-life',
    labels: ['health'],
    dueDate: null,
    createdDaysAgo: 25,
    completedDaysAgo: 1,
  },
  {
    id: 'i-16',
    key: 'TASK-16',
    title: 'Review October spending',
    description: 'Reconcile the two cards, then set next month’s budget.',
    status: 'todo',
    priority: 'medium',
    projectId: null,
    labels: ['finance'],
    dueDate: addDaysISO(3),
    createdDaysAgo: 2,
  },
  {
    id: 'i-17',
    key: 'TASK-17',
    title: 'Plan the weekend trip',
    description: '',
    status: 'backlog',
    priority: 'low',
    projectId: null,
    labels: ['travel'],
    dueDate: null,
    createdDaysAgo: 2,
  },
  {
    id: 'i-axiom-11',
    key: 'AXI-28',
    title: 'Project detail page with issues and overview',
    description:
      'A dedicated /projects/:id workspace with stats, overview, all issues grouped by status, and planned milestone/document tabs. Project cards now link into it.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'projects'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-12',
    key: 'AXI-29',
    title: 'Right-click menus for projects and issues',
    description:
      'A reusable context menu with viewport clamping, keyboard navigation and typed actions. Project cards and issue rows expose open, issue, archive and delete actions.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'ui'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-13',
    key: 'AXI-30',
    title: 'Micro-interactions for cards, rows and menus',
    description:
      'Hover lift on project cards, press settle, animated context menus, hover row actions and a visible actions affordance without crowding the list.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['design', 'ui'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-14',
    key: 'AXI-31',
    title: 'Milestones: model, dates and rollup',
    description:
      'Milestones become a first-class project primitive: title, due date, status, description and optional milestone on an issue. The project overview shows the next checkpoint.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'projects'],
    dueDate: addDaysISO(21),
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-15',
    key: 'AXI-32',
    title: 'Project documents owned by the project',
    description:
      'Long-form project pages (briefs, specs, decisions) attached to a project, linkable from milestones and issues, reusing the Documents editor when it lands.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['feature', 'documents'],
    dueDate: null,
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-axiom-16',
    key: 'AXI-33',
    title: 'Core action API for every entity surface',
    description:
      'Core API v1 is shipped: read commands (version, snapshot, project, issue) plus issue update/create mutations, a typed frontend client and the CORE-API contract. Mutation responses still feed the snapshot writer.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['core', 'api'],
    dueDate: addDaysISO(14),
    createdDaysAgo: 1,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-34',
    key: 'AXI-34',
    title: 'Pointer-based drag sorting with visible handles',
    description:
      'HTML5 drag was unreliable in WebView2, so sorting now uses pointer events, elementFromPoint and a floating label. Handles are always faintly visible on projects and issues.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'ui'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-35',
    key: 'AXI-35',
    title: 'Shared IssueList for Issues and project detail',
    description:
      'One listing component now owns status groups, per-group add, drag reorder and empty states. The Issues page and the project Issues tab only supply data and the add handler.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'ui'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-36',
    key: 'AXI-36',
    title: 'Auto-scroll while pointer sorting',
    description:
      'Dragging near the viewport edge should scroll the list. The current sortable works within the visible area only.',
    status: 'done',
    priority: 'low',
    projectId: 'p-axiom',
    labels: ['ux', 'sorting'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-37',
    key: 'AXI-37',
    title: 'Task checklists and subtasks',
    description:
      'Checklist items with progress, child issues with parentId, completion rollup and row badges.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'tasks'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-38',
    key: 'AXI-38',
    title: 'Task file attachments',
    description:
      'Native file picker copies attachments into app data; open, remove and validate paths. Attachments persist in issueExtras.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'tasks'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-39',
    key: 'AXI-39',
    title: 'Shared WYSIWYG editor',
    description:
      'One rich-text editor for task descriptions, project briefs, notes and documents, with sanitisation and legacy Markdown conversion.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'editor'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-40',
    key: 'AXI-40',
    title: 'Link notes and documents to tasks',
    description:
      'Task links from note and document headers, shown back on the task under Linked.',
    status: 'done',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['feature', 'links'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-41',
    key: 'AXI-41',
    title: 'User screen and scalable Tools catalog',
    description:
      'Profile and appearance moved to /user; Tools became a searchable category catalog with individual tool routes and recent tools.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'tools'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-42',
    key: 'AXI-42',
    title: 'Docs assets tree and README rewrite',
    description:
      'Screenshots moved into docs/assets/screens and docs/assets/styles; README rewritten for personal and freelance use.',
    status: 'done',
    priority: 'low',
    projectId: 'p-axiom',
    labels: ['docs', 'polish'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-43',
    key: 'AXI-43',
    title: 'Configurable media scanner',
    description:
      'Library scan takes media type and depth, classifies files or game folders, and was probed against the D: movie, series and game libraries.',
    status: 'done',
    priority: 'high',
    projectId: 'p-axiom',
    labels: ['feature', 'library'],
    dueDate: null,
    createdDaysAgo: 0,
    completedDaysAgo: 0,
  },
  {
    id: 'i-api-44',
    key: 'AXI-44',
    title: 'Project edit with rich brief',
    description:
      'Projects can only be edited at creation; add an edit dialog so the rich brief and target date can change later.',
    status: 'todo',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['feature', 'projects'],
    dueDate: addDaysISO(14),
    createdDaysAgo: 0,
  },
  {
    id: 'i-api-45',
    key: 'AXI-45',
    title: 'GList inventory and metadata pipeline',
    description:
      'Parse the GList Markdown inventories and add a metadata/provider layer on top of the folder scanner.',
    status: 'todo',
    priority: 'medium',
    projectId: 'p-axiom',
    labels: ['feature', 'media'],
    dueDate: addDaysISO(30),
    createdDaysAgo: 0,
  },
  {
    id: 'i-api-46',
    key: 'AXI-46',
    title: 'Tools batch, presets and contrast checker',
    description:
      'Batch processing, saved presets and a colour-contrast tool on top of the new catalog.',
    status: 'todo',
    priority: 'low',
    projectId: 'p-axiom',
    labels: ['feature', 'tools'],
    dueDate: null,
    createdDaysAgo: 0,
  },
  {
    id: 'i-api-47',
    key: 'AXI-47',
    title: 'Attachment previews and open-with',
    description:
      'Thumbnails for image/PDF attachments and an OS open-with path from the task.',
    status: 'todo',
    priority: 'low',
    projectId: 'p-axiom',
    labels: ['feature', 'tasks'],
    dueDate: null,
    createdDaysAgo: 0,
  },]

const issues: Issue[] = seedIssues.map(({ createdDaysAgo, completedDaysAgo, ...issue }) => {
  const createdAt = daysAgo(createdDaysAgo, 9)
  const updatedAt = completedDaysAgo !== undefined ? daysAgo(completedDaysAgo, 16) : daysAgo(createdDaysAgo, 9)
  return {
    ...issue,
    createdAt,
    updatedAt,
    completedAt: completedDaysAgo !== undefined ? daysAgo(completedDaysAgo, 16) : null,
  }
})

const notes: Note[] = [
  {
    id: 'n-1',
    title: 'Weekly review — the template I keep coming back to',
    content: `Sunday, 30 minutes, no laptop except for this page.

1. What actually happened this week?
2. What did I avoid, and why?
3. What is the one thing that would make next week easier?
4. What am I saying yes to that I should say no to?
5. What does "done" look like on Friday?

The rule: every answer becomes a task, a note, or nothing. Nothing is a valid answer.`,
    projectId: 'p-sys',
    tags: ['systems', 'review'],
    pinned: true,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(0, 8),
  },
  {
    id: 'n-2',
    title: 'Homepage directions',
    content: `Three directions worth prototyping:

• A single paragraph, the latest three notes, and an email field. Nothing else.
• An index of everything, like a personal wiki with a good search bar.
• A timeline: what I am working on this month, updated by hand.

Direction one is probably right. It is the only one that survives being looked at twice.`,
    projectId: 'p-web',
    tags: ['web', 'design'],
    pinned: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },
  {
    id: 'n-3',
    title: 'Reading queue · Q4',
    content: `Currently reading
— The Design of Everyday Things (Norman)
— The Art of Doing Science and Engineering (Hamming)

Next
— A Pattern Language (Alexander) — read in slices, not cover to cover
— The Staff Engineer’s Path

Abandoned
— anything that needs a highlighter to stay interesting`,
    projectId: 'p-read',
    tags: ['reading'],
    pinned: false,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
  },
  {
    id: 'n-4',
    title: 'October retrospective',
    content: `Shipped: the notes section, dark mode, and the RSS draft.
Stalled: the about page (still do not know what to say).

What worked: planning on paper, then moving it here.
What did not: keeping three inboxes.

Next month: one inbox, one list, one place for notes.`,
    projectId: null,
    tags: ['review'],
    pinned: false,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
  },
  {
    id: 'n-5',
    title: 'Small wins log',
    content: `A place to put things that are too small for a retrospective.

— Finally deleted the old domain.
— Wrote 400 words before opening email.
— Fixed the nav bug on the third try.`,
    projectId: null,
    tags: ['journal'],
    pinned: true,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(0, 7),
  },
  {
    id: 'n-axiom-plan',
    title: 'Project workspace — the plan',
    content: `The plan for turning projects into containers, not just filtered task lists.

**Model**
- Project — key, name, description, colour, status, target date. Shipped.
- Milestone — title, due date, status, description and a rollup of its issues. Next.
- Project document — long-form page owned by a project. Later.
- Issue — gains an optional milestone so a task can roll up without moving it.

**Action API**
Cards, context menus, the detail header and the palette should call one typed action layer rather
than re-implementing navigation. The contract is injected with handlers:
open(project), openIssues(project), newIssue(project), archive/restore(project),
edit(issue), toggleDone(issue), openProject(issue), remove(issue), copyKey(issue).
The same shape can later be backed by Tauri commands.

**Phases**
1. Project detail, context menus and micro-interactions — done (AXI-28, AXI-29, AXI-30).
2. Milestones and rollups — AXI-31.
3. Project documents — AXI-32.
4. Move the action layer behind the core boundary — AXI-33.

**Open questions**
- One milestone per issue, or many?
- Do project documents share the Notes store or get their own table?
- Should project documents compile into the bundled docs, or stay private?
- Does archiving a project also archive its milestones and documents?`,
    projectId: 'p-axiom',
    tags: ['planning', 'architecture'],
    pinned: true,
    createdAt: daysAgo(0, 9),
    updatedAt: daysAgo(0, 8),
  },]


const documents: DocumentRecord[] = [
  {
    id: 'd-axiom-brief',
    title: 'Axiom Core — project brief',
    content: `A desktop-first personal workspace: projects, issues, notes, documents and a media library.

**Shipped**
- Project detail, context menus and pointer sorting.
- Shared issue list across Issues and project detail.
- Settings, themes and backgrounds.
- Core API v1: reads plus issue mutations.

**Next**
- Documents and milestones as first-class entities.
- Library folder scan and import.
- Local background images and per-page overrides.

**Constraints**
- One writer: the SQLite snapshot.
- No bundled browser engine.
- Offline first; no telemetry.`,
    projectId: 'p-axiom',
    pinned: true,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0, 9),
  },
  {
    id: 'd-core-api',
    title: 'Core API contract',
    content: `The core API is the boundary between Rust and any surface.

**Commands (v1)**
- core_api_version
- core_snapshot
- core_project(projectId)
- core_issue(issueId)
- core_issue_update(issueId, patch)
- core_issue_create(draft)

**Rules**
- Mutations load the snapshot, validate, and call save_state.
- Status and priority are enums; empty titles are rejected.
- Counters derive issue keys exactly like the UI.

**Next**
- Project update/delete and issue reorder.
- Milestones and project documents.`,
    projectId: 'p-axiom',
    pinned: false,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0, 8),
  },
  {
    id: 'd-writing-style',
    title: 'Writing style',
    content: `Short sentences. Concrete verbs. No filler.

- Prefer "deleted" over "removed from the system".
- Say what the user can do now, then what is planned.
- A bug note names the symptom, the cause and the fix.`,
    projectId: null,
    pinned: false,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(4),
  },
]

const milestones: Milestone[] = [
  {
    id: 'm-workspace',
    projectId: 'p-axiom',
    title: 'Project workspace',
    description: 'Detail page, context menus, pointer sorting and one shared issue list.',
    dueDate: addDaysISO(0),
    status: 'done',
    issueIds: ['i-axiom-11', 'i-axiom-12', 'i-axiom-13', 'i-api-34', 'i-api-35'],
    createdAt: daysAgo(2),
  },
  {
    id: 'm-docs',
    projectId: 'p-axiom',
    title: 'Documents and milestones',
    description: 'First-class documents plus milestone rollups in the project workspace.',
    dueDate: addDaysISO(21),
    status: 'open',
    issueIds: ['i-axiom-4', 'i-axiom-14', 'i-axiom-15'],
    createdAt: daysAgo(1),
  },
  {
    id: 'm-library',
    projectId: 'p-axiom',
    title: 'Library and polish',
    description: 'Folder scan, local images, per-page backgrounds and the contrast pass.',
    dueDate: addDaysISO(45),
    status: 'open',
    issueIds: ['i-axiom-5', 'i-axiom-6', 'i-axiom-7', 'i-axiom-8', 'i-api-36'],
    createdAt: daysAgo(1),
  },
]

export function createSeedState(): AppState {
  return {
    version: APP_VERSION,
    identity: DEFAULT_IDENTITY,
    appearance: DEFAULT_APPEARANCE,
    theme: 'classic',
    sidebarCollapsed: false,
    projects,
    issues,
    notes,
    documents,
    milestones,
    issueExtras: {
      'i-axiom-16': {
        checklist: [
          { id: 'c-api-1', text: 'Versioned read commands', done: true },
          { id: 'c-api-2', text: 'Issue update/create mutations', done: true },
          { id: 'c-api-3', text: 'Typed frontend client', done: true },
          { id: 'c-api-4', text: 'Route UI writes through the API', done: false },
        ],
        attachments: [],
        parentId: null,
      },
      'i-axiom-4': {
        checklist: [
          { id: 'c-doc-1', text: 'Editor and autosave', done: true },
          { id: 'c-doc-2', text: 'Project documents', done: true },
          { id: 'c-doc-3', text: 'Nesting and backlinks', done: false },
        ],
        attachments: [],
        parentId: null,
      },
    },
    taskLinks: {
      'note:n-axiom-plan': 'i-axiom-16',
      'doc:d-core-api': 'i-axiom-16',
      'doc:d-axiom-brief': 'i-axiom-11',
    },
    activity: [
      { id: 'a-axiom-1', kind: 'project', message: 'Created project · Axiom Core', at: daysAgo(2, 10) },
      { id: 'a-axiom-2', kind: 'issue', message: 'Completed AXI-18 · Fix the theme menu overflow', at: daysAgo(0, 12) },
      { id: 'a-1', kind: 'note', message: 'Edited “Weekly review — the template I keep coming back to”', at: daysAgo(0, 8) },
      { id: 'a-2', kind: 'issue', message: 'Moved WEB-1 to In progress', at: daysAgo(0, 11) },
      { id: 'a-3', kind: 'issue', message: 'Completed LIFE-15 · Book dentist appointment', at: daysAgo(1, 16) },
      { id: 'a-4', kind: 'issue', message: 'Created WEB-4 · Fix mobile nav layering bug', at: daysAgo(4, 9) },
      { id: 'a-5', kind: 'issue', message: 'Completed WEB-5 · Ship dark mode toggle', at: daysAgo(2, 16) },
      { id: 'a-6', kind: 'project', message: 'Created project · Reading list', at: daysAgo(21, 10) },
    ],
    counters: { issue: 47 },
  }
}
