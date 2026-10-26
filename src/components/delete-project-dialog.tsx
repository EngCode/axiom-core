/**======> Reference By Comment <======
 * ===> 01 - Imports & Options
 * ===> 02 - Delete Project Dialog
 */

//=====> Imports & Options <=====//

import { useEffect, useState } from 'react'

import { Button, Field, Modal, Select } from '@/components/ui'
import { useApp } from '@/lib/store'
import type { Project, ProjectDeleteMode } from '@/lib/types'
import { pluralize } from '@/lib/utils'

const MODES: { id: ProjectDeleteMode; label: string; hint: string }[] = [
  {
    id: 'inbox',
    label: 'Move them to the Inbox',
    hint: 'Keep every issue and note, unassigned. Nothing is deleted.',
  },
  {
    id: 'move',
    label: 'Move them to another project',
    hint: 'Pick a destination; the project itself is deleted.',
  },
  {
    id: 'delete',
    label: 'Delete them with the project',
    hint: 'Issues and notes are removed permanently. This cannot be undone.',
  },
]

//=====> Delete Project Dialog <=====//

export function DeleteProjectDialog({
  project,
  onClose,
}: {
  project: Project | null
  onClose: () => void
}) {
  //===> Read State & Actions <===//
  const { state, deleteProject } = useApp()

  //===> Local Choice <===//
  const [mode, setMode] = useState<ProjectDeleteMode>('inbox')
  const [targetId, setTargetId] = useState('')

  //===> Derive Counts <===//
  const issueCount = project
    ? state.issues.filter((issue) => issue.projectId === project.id).length
    : 0
  const noteCount = project
    ? state.notes.filter((note) => note.projectId === project.id).length
    : 0
  const destinations = state.projects.filter((candidate) => candidate.id !== project?.id)

  //===> Reset Choice When The Target Changes <===//
  useEffect(() => {
    if (!project) return
    setMode('inbox')
    const first = state.projects.find((candidate) => candidate.id !== project.id)
    setTargetId(first?.id ?? '')
  }, [project, state.projects])

  //===> Guard Clause: Nothing To Delete <===//
  if (!project) return null

  //===> Confirm <===//
  const canConfirm = mode !== 'move' || Boolean(targetId)

  function handleConfirm() {
    if (!project || !canConfirm) return
    deleteProject(project.id, {
      mode,
      targetProjectId: mode === 'move' ? targetId : null,
    })
    onClose()
  }

  //===> Render Dialog <===//
  return (
    <Modal open onClose={onClose} label="Delete project">
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
          Delete “{project.name}”?
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-fg-muted">
          {pluralize(issueCount, 'issue')} and {pluralize(noteCount, 'note')} belong to this
          project. Choose what happens to them.
        </p>

        <div className="mt-4 space-y-2">
          {MODES.map((option) => {
            const disabled = option.id === 'move' && destinations.length === 0
            const active = mode === option.id

            return (
              <div key={option.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setMode(option.id)}
                  aria-pressed={active}
                  className={`flex w-full items-start gap-2.5 rounded-control border p-3 text-start transition-colors ${
                    active
                      ? option.id === 'delete'
                        ? 'border-danger/50 bg-danger/10'
                        : 'border-accent/40 bg-accent-soft/30'
                      : 'border-line bg-surface-2/30 hover:border-line-strong'
                  } disabled:pointer-events-none disabled:opacity-40`}
                >
                  <span
                    className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border ${
                      active
                        ? option.id === 'delete'
                          ? 'border-danger'
                          : 'border-accent'
                        : 'border-line-strong'
                    }`}
                  >
                    {active ? (
                      <span
                        className={`size-1.5 rounded-full ${
                          option.id === 'delete' ? 'bg-danger' : 'bg-accent'
                        }`}
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-fg">{option.label}</span>
                    <span className="mt-0.5 block text-[10.5px] leading-4 text-fg-subtle">
                      {option.hint}
                    </span>
                  </span>
                </button>

                {option.id === 'move' && active ? (
                  <div className="mt-2 ps-7">
                    <Field label="Destination">
                      <Select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                        {destinations.map((destination) => (
                          <option key={destination.id} value={destination.id}>
                            {destination.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
        <p className="text-[10px] text-fg-subtle">
          {mode === 'delete' ? 'This cannot be undone.' : 'You can move items again later.'}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="bg-danger-strong text-white hover:brightness-110"
          >
            Delete project
          </Button>
        </div>
      </div>
    </Modal>
  )
}
