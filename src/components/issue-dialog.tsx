/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Dialog Controller
 * ===> 03 - Issue Form
 */

import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'

import { useApp } from '@/lib/store'
import type { Issue, Priority, Status } from '@/lib/types'
import { useUI } from '@/lib/ui'

import { PriorityPicker, StatusPicker } from './issue-bits'
import { Button, Field, Input, Modal, Select } from './ui'

export function IssueDialog() {
  const { state } = useApp()
  const { issueDialog, closeIssueDialog } = useUI()
  const issue = issueDialog.issueId
    ? state.issues.find((candidate) => candidate.id === issueDialog.issueId)
    : undefined

  if (!issueDialog.open) return null

  return (
    <Modal
      open
      onClose={closeIssueDialog}
      label={issue ? `Edit ${issue.key}` : 'New issue'}
      className="max-w-xl"
    >
      <IssueForm
        key={issue?.id ?? `new-${issueDialog.status ?? 'todo'}-${issueDialog.projectId ?? 'none'}`}
        issue={issue}
        defaultStatus={issueDialog.status ?? 'todo'}
        defaultProjectId={issueDialog.projectId ?? null}
        onClose={closeIssueDialog}
      />
    </Modal>
  )
}

function IssueForm({
  issue,
  defaultStatus,
  defaultProjectId,
  onClose,
}: {
  issue?: Issue
  defaultStatus: Status
  defaultProjectId: string | null
  onClose: () => void
}) {
  const { state, addIssue, updateIssue, deleteIssue } = useApp()
  const [title, setTitle] = useState(issue?.title ?? '')
  const [description, setDescription] = useState(issue?.description ?? '')
  const [status, setStatus] = useState<Status>(issue?.status ?? defaultStatus)
  const [priority, setPriority] = useState<Priority>(issue?.priority ?? 'none')
  const [projectId, setProjectId] = useState(issue?.projectId ?? defaultProjectId ?? '')
  const [dueDate, setDueDate] = useState(issue?.dueDate ?? '')

  const canSubmit = title.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      projectId: projectId || null,
      dueDate: dueDate || null,
    }
    if (issue) updateIssue(issue.id, payload)
    else addIssue(payload)
    onClose()
  }

  function handleDelete() {
    if (!issue) return
    if (window.confirm(`Delete ${issue.key} · ${issue.title}? This cannot be undone.`)) {
      deleteIssue(issue.id)
      onClose()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.requestSubmit()
        }
      }}
    >
      <div className="px-5 pt-5 pb-4">
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Issue title"
          aria-label="Issue title"
          className="w-full bg-transparent pr-10 text-[16px] font-medium tracking-[-0.01em] text-fg outline-none placeholder:text-fg-subtle"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add a description…"
          rows={3}
          aria-label="Description"
          className="mt-2.5 w-full resize-none bg-transparent text-[13px] leading-6 text-fg-muted outline-none placeholder:text-fg-subtle"
        />
      </div>

      <div className="space-y-3.5 border-t border-line px-5 py-4">
        <Field label="Status">
          <StatusPicker value={status} onChange={setStatus} />
        </Field>

        <Field label="Priority">
          <PriorityPicker value={priority} onChange={setPriority} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project">
            <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">No project</option>
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
        </div>

        {issue ? (
          <p className="text-[10.5px] text-fg-subtle">
            {issue.key} · created {new Date(issue.createdAt).toLocaleDateString()} · updated{' '}
            {new Date(issue.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
        <div>
          {issue ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-danger hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
            {issue ? 'Save changes' : 'Create issue'}
          </Button>
        </div>
      </div>
    </form>
  )
}
