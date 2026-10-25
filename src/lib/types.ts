/**======> Reference By Comment <======
 * ===> 01 - Domain Models
 * ===> 02 - Application State
 * ===> 03 - Input Contracts
 */

import type { ThemeId } from './themes'

export type Theme = ThemeId

export interface Identity {
  appName: string
  workspaceName: string
  ownerName: string
}

export type Status = 'backlog' | 'todo' | 'in_progress' | 'done'

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

export type ProjectColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan'

export type ProjectStatus = 'active' | 'paused' | 'done'

export interface Project {
  id: string
  name: string
  /** Short prefix used for issue keys, e.g. WEB-12. */
  key: string
  description: string
  color: ProjectColor
  status: ProjectStatus
  createdAt: string
  targetDate: string | null
}

export interface Issue {
  id: string
  /** Human readable identifier, e.g. WEB-4 or TASK-9. */
  key: string
  title: string
  description: string
  status: Status
  priority: Priority
  projectId: string | null
  labels: string[]
  /** Local calendar date, YYYY-MM-DD. */
  dueDate: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface Note {
  id: string
  title: string
  content: string
  projectId: string | null
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface ActivityEntry {
  id: string
  kind: 'issue' | 'note' | 'project'
  message: string
  at: string
}

export interface AppState {
  version: number
  identity: Identity
  theme: Theme
  sidebarCollapsed: boolean
  projects: Project[]
  issues: Issue[]
  notes: Note[]
  activity: ActivityEntry[]
  counters: {
    issue: number
  }
}

export type IssueInput = {
  title: string
  description?: string
  status?: Status
  priority?: Priority
  projectId?: string | null
  labels?: string[]
  dueDate?: string | null
}

export type NoteInput = {
  title?: string
  content?: string
  projectId?: string | null
  tags?: string[]
  pinned?: boolean
}

export type ProjectInput = {
  name: string
  description?: string
  color?: ProjectColor
  targetDate?: string | null
}
