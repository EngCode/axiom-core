/**======> Reference By Comment <======
 * ===> 01 - Action Contract
 * ===> 02 - Project Actions
 * ===> 03 - Issue Actions
 */

//=====> Action Contract <=====//

import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderOpen,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import type { MenuAction } from '@/components/context-menu'
import type { Issue, Project } from './types'

/**
 * Project surfaces (cards, detail header, future palette scopes) expose the same actions through
 * this contract. Handlers are injected so the action layer stays independent of routing and dialogs.
 */
export interface ProjectActions {
  open: (project: Project) => void
  openIssues: (project: Project) => void
  newIssue: (project: Project) => void
  archive: (project: Project) => void
  restore: (project: Project) => void
  remove: (project: Project) => void
}

export interface IssueActions {
  edit: () => void
  toggleDone: () => void
  openProject: (project: Project) => void
  remove: () => void
  copyKey: () => void
}

//=====> Project Actions <=====//

export function projectMenu(project: Project, actions: ProjectActions): MenuAction[] {
  const archived = project.status === 'done'

  return [
    {
      id: 'open-project',
      label: 'Open project',
      icon: FolderOpen,
      shortcut: '↵',
      run: () => actions.open(project),
    },
    {
      id: 'open-issues',
      label: 'Open issues',
      icon: ListTodo,
      run: () => actions.openIssues(project),
    },
    {
      id: 'new-issue',
      label: 'New issue',
      icon: Plus,
      divider: true,
      run: () => actions.newIssue(project),
    },
    archived
      ? {
          id: 'restore',
          label: 'Restore project',
          icon: ArchiveRestore,
          divider: true,
          run: () => actions.restore(project),
        }
      : {
          id: 'archive',
          label: 'Archive project',
          icon: Archive,
          divider: true,
          run: () => actions.archive(project),
        },
    {
      id: 'delete',
      label: 'Delete project',
      icon: Trash2,
      danger: true,
      divider: true,
      run: () => actions.remove(project),
    },
  ]
}

//=====> Issue Actions <=====//

export function issueMenu(
  issue: Issue,
  project: Project | undefined,
  actions: IssueActions,
): MenuAction[] {
  const done = issue.status === 'done'

  return [
    { id: 'edit', label: 'Edit issue', icon: Pencil, shortcut: '↵', run: () => actions.edit() },
    {
      id: 'toggle',
      label: done ? 'Mark as not done' : 'Mark as done',
      icon: CheckCircle2,
      run: () => actions.toggleDone(),
    },
    {
      id: 'copy',
      label: 'Copy issue key',
      icon: Copy,
      run: () => actions.copyKey(),
    },
    {
      id: 'project',
      label: 'Open project',
      icon: ExternalLink,
      disabled: !project,
      divider: true,
      run: () => {
        if (project) actions.openProject(project)
      },
    },
    {
      id: 'delete',
      label: 'Delete issue',
      icon: Trash2,
      danger: true,
      divider: true,
      run: () => actions.remove(),
    },
  ]
}
