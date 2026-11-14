/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Project Dialog
 */

//=====> Imports <=====//

import { useEffect, useState, type FormEvent } from 'react'

import { Button, Field, Input, Modal } from '@/components/ui'
import { PROJECT_COLORS, PROJECT_COLOR_ORDER } from '@/lib/meta'
import { RichTextEditor } from '@/lib/rich-text'
import { useApp } from '@/lib/store'
import type { Project, ProjectColor, ProjectInput } from '@/lib/types'
import { cn, projectKeyFromName } from '@/lib/utils'

//=====> Project Dialog <=====//

/**
 * Create or edit a project. The same form backs both flows so the rich brief,
 * colour and target date stay editable after the project exists.
 */
export function ProjectDialog({
  open,
  project,
  onClose,
}: {
  open: boolean
  project?: Project | null
  onClose: () => void
}) {
  //===> Form State <===//
  const { addProject, updateProject } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<ProjectColor>('violet')
  const [targetDate, setTargetDate] = useState('')

  //===> Hydrate On Open <===//
  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setColor(project?.color ?? 'violet')
    setTargetDate(project?.targetDate ?? '')
  }, [open, project])

  const editing = Boolean(project)
  const previewKey = projectKeyFromName(name || 'New project')
  const canSubmit = name.trim().length > 0

  //===> Save <===//
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const input: ProjectInput = {
      name: name.trim(),
      description: description.trim(),
      color,
      targetDate: targetDate || null,
    }
    if (project) {
      updateProject(project.id, input)
    } else {
      addProject(input)
    }
    onClose()
  }

  //===> Render <===//
  return (
    <Modal open={open} onClose={onClose} label={editing ? 'Edit project' : 'New project'}>
      <form onSubmit={handleSubmit}>
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
            {editing ? `Edit ${project?.key ?? 'project'}` : 'New project'}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-fg-muted">
            {editing
              ? 'Update the brief, colour or target date. Issue keys stay the same.'
              : 'Give it a name, pick a colour, and keep tasks together around one outcome.'}
          </p>

          <div className="mt-4 space-y-3">
            <Field label="Name">
              <Input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website revamp"
              />
            </Field>

            <Field label="Description">
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="What does done look like?"
                minHeight={84}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Colour">
                <div className="flex h-9 items-center gap-2">
                  {PROJECT_COLOR_ORDER.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={PROJECT_COLORS[option].label}
                      aria-pressed={color === option}
                      onClick={() => setColor(option)}
                      className={cn(
                        'size-5 rounded-full transition-transform hover:scale-110',
                        color === option
                          ? 'ring-2 ring-fg/40 ring-offset-2 ring-offset-surface'
                          : '',
                      )}
                      style={{ backgroundColor: PROJECT_COLORS[option].hex }}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Target date">
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </Field>
            </div>

            {editing ? (
              <p className="text-[10.5px] text-fg-subtle">
                Issue keys keep the <span className="font-mono text-fg-muted">{project?.key}</span>{' '}
                prefix.
              </p>
            ) : (
              <p className="text-[10.5px] text-fg-subtle">
                Issue keys will look like{' '}
                <span className="font-mono text-fg-muted">{previewKey}-1</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
            {editing ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
