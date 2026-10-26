/**======> Reference By Comment <======
 * ===> 01 - Transport
 * ===> 02 - Client
 */

//=====> Transport <=====//

import { invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'
import type { AppState, Issue, Note, Project } from './types'

export const CORE_API_VERSION = 1

export interface ProjectPayload {
  project: Project
  issues: Issue[]
  notes: Note[]
}


export interface IssuePatch {
  title?: string
  description?: string
  status?: string
  priority?: string
  labels?: string[]
  dueDate?: string
  projectId?: string
}

export interface IssueDraft {
  title: string
  description?: string
  status?: string
  priority?: string
  projectId?: string
  labels?: string[]
  dueDate?: string
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  //===> Guard Clause: Browser Mode Has No Core <===//
  if (!isTauri()) return null
  return invoke<T>(command, args)
}

//=====> Client <=====//

/**
 * Transport-agnostic core read API. The Rust side owns the SQLite snapshot; the webview consumes
 * typed payloads. Mutations stay in the store until the command layer lands (AXI-33).
 */
export const coreApi = {
  version: CORE_API_VERSION,

  snapshot: () => call<AppState | null>('core_snapshot'),

  project: (projectId: string) =>
    call<ProjectPayload | null>('core_project', { projectId }),

  issue: (issueId: string) => call<Issue | null>('core_issue', { issueId }),

  updateIssue: (issueId: string, patch: IssuePatch) =>
    call<Issue | null>('core_issue_update', { issueId, patch }),

  createIssue: (draft: IssueDraft) => call<Issue | null>('core_issue_create', { draft }),
}
