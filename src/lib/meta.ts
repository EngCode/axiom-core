/**======> Reference By Comment <======
 * ===> 01 - Domain Vocabularies
 */

import type { Priority, ProjectColor, ProjectStatus, Status } from './types'

export const STATUS_ORDER: Status[] = ['backlog', 'todo', 'in_progress', 'done']

export const STATUS_META: Record<Status, { label: string; tone: string; hint: string }> = {
  backlog: { label: 'Backlog', tone: 'text-fg-subtle', hint: 'Someday / not scheduled' },
  todo: { label: 'Todo', tone: 'text-fg-muted', hint: 'Ready to pick up' },
  in_progress: { label: 'In progress', tone: 'text-amber-500 dark:text-amber-400', hint: 'Being worked on now' },
  done: { label: 'Done', tone: 'text-accent', hint: 'Completed' },
}

export const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low', 'none']

export const PRIORITY_META: Record<Priority, { label: string; tone: string; bars: number }> = {
  urgent: { label: 'Urgent', tone: 'text-rose-500 dark:text-rose-400', bars: 3 },
  high: { label: 'High', tone: 'text-amber-500 dark:text-amber-400', bars: 3 },
  medium: { label: 'Medium', tone: 'text-sky-500 dark:text-sky-400', bars: 2 },
  low: { label: 'Low', tone: 'text-fg-subtle', bars: 1 },
  none: { label: 'No priority', tone: 'text-fg-subtle', bars: 0 },
}

export const PROJECT_COLORS: Record<ProjectColor, { label: string; hex: string }> = {
  violet: { label: 'Violet', hex: '#8b86ff' },
  blue: { label: 'Blue', hex: '#5aa9f8' },
  emerald: { label: 'Emerald', hex: '#3ecf8e' },
  amber: { label: 'Amber', hex: '#f0b429' },
  rose: { label: 'Rose', hex: '#fb7185' },
  cyan: { label: 'Cyan', hex: '#38d6e6' },
}

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'text-ok' },
  paused: { label: 'Paused', tone: 'text-fg-subtle' },
  done: { label: 'Archived', tone: 'text-fg-subtle' },
}

export const PROJECT_COLOR_ORDER: ProjectColor[] = ['violet', 'blue', 'emerald', 'amber', 'rose', 'cyan']
