/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Dialog Controller
 * ===> 03 - Issue Form
 */

import { useState, type FormEvent } from 'react'
import { CheckSquare, ExternalLink, ListTree, Paperclip, Plus, Trash2, X } from 'lucide-react'

import { deleteAttachmentFile, openAttachment, pickAttachment } from '@/lib/attachments'
import { useApp } from '@/lib/store'
import type { Issue, Priority, Status } from '@/lib/types'
import { RichTextEditor } from '@/lib/rich-text'
import { uid } from '@/lib/utils'
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
      className="max-h-[86vh] max-w-xl overflow-y-auto"
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

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function IssueExtrasPanel({ issue }: { issue: Issue }) {
  //===> Read Extras <===//
  const {
    state,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    addAttachment,
    removeAttachment,
    addSubtask,
    toggleIssueDone,
  } = useApp()
  const { openIssueDialog } = useUI()
  const extras = state.issueExtras[issue.id] ?? { checklist: [], attachments: [], parentId: null }
  const subtasks = state.issues.filter(
    (candidate) => state.issueExtras[candidate.id]?.parentId === issue.id,
  )
  const linkedNotes = state.notes.filter((note) => state.taskLinks[`note:${note.id}`] === issue.id)
  const linkedDocuments = state.documents.filter(
    (document) => state.taskLinks[`doc:${document.id}`] === issue.id,
  )

  //===> Local Drafts <===//
  const [checkText, setCheckText] = useState('')
  const [subtaskText, setSubtaskText] = useState('')

  const done = extras.checklist.filter((item) => item.done).length

  //===> Attach A File <===//
  async function attachFile() {
    const picked = await pickAttachment()
    if (!picked) return
    addAttachment(issue.id, {
      id: uid(),
      name: picked.name,
      size: picked.size,
      path: picked.path,
      createdAt: new Date().toISOString(),
    })
  }

  //===> Remove An Attachment <===//
  async function removeFile(id: string, path: string, name: string) {
    if (!window.confirm(`Remove “${name}” from this task?`)) return
    await deleteAttachmentFile(path).catch(() => {})
    removeAttachment(issue.id, id)
  }

  //===> Render Panel <===//
  return (
    <div className="space-y-4 border-t border-line pt-4">
      {/*====> Checklist <====*/}
      <section>
        <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          <CheckSquare className="size-3" />
          Checklist
          <span className="ms-auto text-fg-subtle/70 normal-case tracking-normal">
            {done}/{extras.checklist.length}
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {extras.checklist.map((item) => (
            <label key={item.id} className="group flex items-center gap-2 text-[12px] text-fg-muted">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklistItem(issue.id, item.id)}
                className="size-3.5 accent-[var(--accent)]"
              />
              <span className={item.done ? 'line-through opacity-60' : ''}>{item.text}</span>
              <button
                type="button"
                aria-label={`Remove ${item.text}`}
                onClick={() => removeChecklistItem(issue.id, item.id)}
                className="ms-auto text-fg-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </label>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Input
            value={checkText}
            onChange={(event) => setCheckText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              addChecklistItem(issue.id, checkText)
              setCheckText('')
            }}
            placeholder="Add a checklist item…"
            className="h-7 text-[11.5px]"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!checkText.trim()}
            onClick={() => {
              addChecklistItem(issue.id, checkText)
              setCheckText('')
            }}
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </section>

      {/*====> Subtasks <====*/}
      <section>
        <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          <ListTree className="size-3" />
          Subtasks
          <span className="ms-auto text-fg-subtle/70 normal-case tracking-normal">
            {subtasks.filter((task) => task.status === 'done').length}/{subtasks.length}
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {subtasks.map((task) => (
            <div key={task.id} className="group flex items-center gap-2 text-[11.5px]">
              <button
                type="button"
                aria-label={task.status === 'done' ? 'Reopen subtask' : 'Complete subtask'}
                onClick={() => toggleIssueDone(task.id)}
                className="grid size-4 place-items-center rounded border border-line text-[9px] text-fg-subtle"
              >
                {task.status === 'done' ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => openIssueDialog({ issueId: task.id })}
                className="min-w-0 flex-1 truncate text-start text-fg-muted hover:text-fg"
              >
                {task.key} · {task.title}
              </button>
              <ExternalLink className="size-3 text-fg-subtle" />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Input
            value={subtaskText}
            onChange={(event) => setSubtaskText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              if (!subtaskText.trim()) return
              addSubtask(issue.id, subtaskText)
              setSubtaskText('')
            }}
            placeholder="Add a subtask…"
            className="h-7 text-[11.5px]"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!subtaskText.trim()}
            onClick={() => {
              addSubtask(issue.id, subtaskText)
              setSubtaskText('')
            }}
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </section>

      {/*====> Attachments <====*/}
      <section>
        <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          <Paperclip className="size-3" />
          Attachments
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ms-auto h-6 px-1.5 text-[10px] tracking-normal normal-case"
            onClick={() => void attachFile()}
          >
            <Plus className="size-3" />
            Attach
          </Button>
        </div>
        <div className="mt-2 space-y-1">
          {extras.attachments.length === 0 ? (
            <p className="text-[10.5px] text-fg-subtle">No files attached.</p>
          ) : (
            extras.attachments.map((file) => (
              <div key={file.id} className="group flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => void openAttachment(file.path)}
                  className="min-w-0 flex-1 truncate text-start text-fg-muted hover:text-fg"
                  title={file.name}
                >
                  {file.name}
                </button>
                <span className="shrink-0 text-[10px] text-fg-subtle">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => void removeFile(file.id, file.path, file.name)}
                  className="text-fg-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/*====> Linked Notes & Documents <====*/}
      {linkedNotes.length + linkedDocuments.length > 0 ? (
        <section>
          <div className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
            Linked
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {linkedNotes.map((note) => (
              <span key={note.id} className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-muted">
                Note · {note.title}
              </span>
            ))}
            {linkedDocuments.map((document) => (
              <span key={document.id} className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-muted">
                Doc · {document.title}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
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
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Add a description…"
          className="mt-2.5"
          minHeight={80}
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

        {issue ? <IssueExtrasPanel issue={issue} /> : null}

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
