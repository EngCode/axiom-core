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

export type ProjectDeleteMode = 'inbox' | 'move' | 'delete'

export interface ProjectDeleteOptions {
  mode: ProjectDeleteMode
  targetProjectId?: string | null
}
export type BackgroundKind = 'none' | 'grid' | 'dots' | 'gradient' | 'image'

export type BackgroundScope = 'window' | 'content'

export interface BackgroundSettings {
  kind: BackgroundKind
  imageUrl: string
  /** 0 – 0.4; the layer is blended into the theme canvas. */
  opacity: number
  scope: BackgroundScope
}

export interface Appearance {
  background: BackgroundSettings
  pageBackgrounds: Record<string, BackgroundSettings>
}
export type FolderKind = 'notes' | 'documents'

export interface FolderRecord {
  id: string
  name: string
  kind: FolderKind
  parentId: string | null
  createdAt: string
}

export interface DocumentRecord {
  id: string
  title: string
  content: string
  projectId: string | null
  pinned: boolean
  folderId?: string | null
  parentId?: string | null
  createdAt: string
  updatedAt: string
}

export type MilestoneStatus = 'open' | 'done'

export interface Milestone {
  id: string
  projectId: string
  title: string
  description: string
  dueDate: string | null
  status: MilestoneStatus
  /** Issues that roll up into this milestone. */
  issueIds: string[]
  createdAt: string
}
export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Attachment {
  id: string
  name: string
  size: number
  path: string
  createdAt: string
}

export interface IssueExtras {
  checklist: ChecklistItem[]
  attachments: Attachment[]
  /** Present when this issue is a subtask. */
  parentId: string | null
}
export interface AppState {
  version: number
  identity: Identity
  appearance: Appearance
  theme: Theme
  sidebarCollapsed: boolean
  projects: Project[]
  issues: Issue[]
  notes: Note[]
  documents: DocumentRecord[]
  milestones: Milestone[]
  issueExtras: Record<string, IssueExtras>
  taskLinks: Record<string, string>
  folders: FolderRecord[]
  noteFolders: Record<string, string>
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
