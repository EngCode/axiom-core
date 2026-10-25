import type { AppState, Issue, Note, Project } from './types'
import { addDaysISO } from './utils'

export const STORAGE_KEY = 'orbit.state.v1'
export const APP_VERSION = 1

export const WORKSPACE = {
  name: 'Orbit',
  owner: 'Abdullah',
  kind: 'Personal workspace',
}

function daysAgo(days: number, hour = 10): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const projects: Project[] = [
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
]

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
]

export function createSeedState(): AppState {
  return {
    version: APP_VERSION,
    theme: 'orbit',
    sidebarCollapsed: false,
    projects,
    issues,
    notes,
    activity: [
      { id: 'a-1', kind: 'note', message: 'Edited “Weekly review — the template I keep coming back to”', at: daysAgo(0, 8) },
      { id: 'a-2', kind: 'issue', message: 'Moved WEB-1 to In progress', at: daysAgo(0, 11) },
      { id: 'a-3', kind: 'issue', message: 'Completed LIFE-15 · Book dentist appointment', at: daysAgo(1, 16) },
      { id: 'a-4', kind: 'issue', message: 'Created WEB-4 · Fix mobile nav layering bug', at: daysAgo(4, 9) },
      { id: 'a-5', kind: 'issue', message: 'Completed WEB-5 · Ship dark mode toggle', at: daysAgo(2, 16) },
      { id: 'a-6', kind: 'project', message: 'Created project · Reading list', at: daysAgo(21, 10) },
    ],
    counters: { issue: 17 },
  }
}
