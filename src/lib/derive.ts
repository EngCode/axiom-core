/**======> Reference By Comment <======
 * ===> 01 - Workspace Stats
 * ===> 02 - Focus Scoring
 * ===> 03 - Progress & Series
 */

import type { Issue, Project } from './types'
import { PRIORITY_META, PROJECT_COLORS } from './meta'
import { daysFromToday, isDueThisWeek, localISODate } from './utils'

export interface WorkspaceStats {
  total: number
  open: number
  inProgress: number
  done: number
  dueThisWeek: number
  overdue: number
  dueToday: number
  completedLast7: number
}

export function getStats(issues: Issue[]): WorkspaceStats {
  const open = issues.filter((issue) => issue.status !== 'done')
  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  return {
    total: issues.length,
    open: open.length,
    inProgress: issues.filter((issue) => issue.status === 'in_progress').length,
    done: issues.filter((issue) => issue.status === 'done').length,
    dueThisWeek: open.filter((issue) => isDueThisWeek(issue.dueDate)).length,
    overdue: open.filter((issue) => issue.dueDate !== null && daysFromToday(issue.dueDate) < 0).length,
    dueToday: open.filter((issue) => issue.dueDate !== null && daysFromToday(issue.dueDate) === 0).length,
    completedLast7: issues.filter((issue) => {
      if (!issue.completedAt) return false
      return new Date(issue.completedAt).getTime() >= sevenDaysAgo
    }).length,
  }
}

const PRIORITY_WEIGHT = { urgent: 40, high: 24, medium: 12, low: 4, none: 0 } as const

function focusScore(issue: Issue): number {
  let score = PRIORITY_WEIGHT[issue.priority]
  if (issue.dueDate) {
    const diff = daysFromToday(issue.dueDate)
    if (diff < 0) score += 100 + Math.min(30, Math.abs(diff) * 3)
    else if (diff === 0) score += 80
    else if (diff === 1) score += 55
    else if (diff <= 3) score += 35
    else if (diff <= 7) score += 18
  }
  if (issue.status === 'in_progress') score += 16
  return score
}

/** The handful of tasks that deserve attention today, ordered by urgency. */
export function focusIssues(issues: Issue[], limit = 6): Issue[] {
  return issues
    .filter((issue) => issue.status !== 'done')
    .map((issue) => ({ issue, score: focusScore(issue) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.issue)
}

export interface ProjectProgress {
  total: number
  done: number
  open: number
  percent: number
}

export function projectProgress(projectId: string, issues: Issue[]): ProjectProgress {
  const scoped = issues.filter((issue) => issue.projectId === projectId)
  const done = scoped.filter((issue) => issue.status === 'done').length
  return {
    total: scoped.length,
    done,
    open: scoped.length - done,
    percent: scoped.length === 0 ? 0 : Math.round((done / scoped.length) * 100),
  }
}

export interface DayBucket {
  date: string
  label: string
  count: number
  isToday: boolean
}

/** Completions per day for the trailing `days` window, oldest first. */
export function completionSeries(issues: Issue[], days = 7): DayBucket[] {
  const buckets: DayBucket[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const iso = localISODate(date)
    buckets.push({
      date: iso,
      label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      count: 0,
      isToday: offset === 0,
    })
  }
  for (const issue of issues) {
    if (!issue.completedAt) continue
    const iso = localISODate(new Date(issue.completedAt))
    const bucket = buckets.find((candidate) => candidate.date === iso)
    if (bucket) bucket.count += 1
  }
  return buckets
}

export function sortNotes<T extends { pinned: boolean; updatedAt: string }>(notes: T[]): T[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function projectColorOf(project: Project | undefined): string {
  return project ? PROJECT_COLORS[project.color].hex : 'var(--fg-subtle)'
}

export function priorityLabel(issue: Issue): string {
  return PRIORITY_META[issue.priority].label
}
