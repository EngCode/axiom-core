import { useEffect, useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, ArrowUpRight, FolderKanban, FolderPlus, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Progress,
} from '@/components/ui'
import { projectProgress } from '@/lib/derive'
import { PROJECT_COLORS, PROJECT_COLOR_ORDER, PROJECT_STATUS_META } from '@/lib/meta'
import { useApp } from '@/lib/store'
import type { Project, ProjectColor, ProjectInput } from '@/lib/types'
import { useUI } from '@/lib/ui'
import { cn, formatDate, projectKeyFromName } from '@/lib/utils'

export default function ProjectsPage() {
  const { state, updateProject } = useApp()
  const { openIssueDialog } = useUI()
  const [dialogOpen, setDialogOpen] = useState(false)

  const active = state.projects.filter((project) => project.status !== 'done')
  const archived = state.projects.filter((project) => project.status === 'done')

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="A project groups the tasks and notes that share one outcome. Keep a handful active, archive the rest."
        actions={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <FolderPlus className="size-3.5" />
            New project
          </Button>
        }
      />

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="size-4" />}
            title="No projects yet"
            description="Create one to group related tasks — or keep everything in your personal inbox."
            action={
              <Button size="sm" variant="primary" onClick={() => setDialogOpen(true)}>
                <FolderPlus className="size-3.5" />
                New project
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onNewTask={() => openIssueDialog({ projectId: project.id })}
              onArchive={() => updateProject(project.id, { status: 'done' })}
            />
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <div className="space-y-2">
          <h2 className="px-1 text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
            Archived
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((project) => {
              const progress = projectProgress(project.id, state.issues)
              return (
                <Card key={project.id} className="flex items-center gap-3 p-3.5">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${PROJECT_COLORS[project.color].hex} 16%, transparent)`,
                      color: PROJECT_COLORS[project.color].hex,
                    }}
                  >
                    <FolderKanban className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-fg">{project.name}</p>
                    <p className="text-[10.5px] text-fg-subtle">
                      {progress.done}/{progress.total} done
                    </p>
                  </div>
                  <IconButton
                    label="Restore project"
                    onClick={() => updateProject(project.id, { status: 'active' })}
                  >
                    <ArchiveRestore className="size-3.5" />
                  </IconButton>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}

      <ProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}

function ProjectCard({
  project,
  onNewTask,
  onArchive,
}: {
  project: Project
  onNewTask: () => void
  onArchive: () => void
}) {
  const { state } = useApp()
  const progress = projectProgress(project.id, state.issues)
  const hex = PROJECT_COLORS[project.color].hex

  return (
    <Card className="group flex flex-col p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: `color-mix(in oklab, ${hex} 16%, transparent)`,
            color: hex,
          }}
        >
          <FolderKanban className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13.5px] font-medium text-fg">{project.name}</h3>
          <p className="mt-0.5 truncate text-[10.5px] text-fg-subtle">
            {project.key} · {PROJECT_STATUS_META[project.status].label}
            {project.targetDate ? ` · target ${formatDate(project.targetDate)}` : ''}
          </p>
        </div>
        <IconButton
          label="Archive project"
          onClick={onArchive}
          className="size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Archive className="size-3.5" />
        </IconButton>
      </div>

      <p className="mt-3 min-h-[2.4rem] text-[12px] leading-5 text-fg-muted">
        {project.description || 'No description yet.'}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-fg-subtle">
          <span>
            {progress.done} of {progress.total} tasks done
          </span>
          <span className="tabular-nums">{progress.percent}%</span>
        </div>
        <Progress value={progress.percent} color={hex} />
      </div>

      <div className="mt-3.5 flex items-center gap-1.5">
        <Button variant="secondary" size="sm" onClick={onNewTask}>
          <Plus className="size-3.5" />
          Task
        </Button>
        <Link
          to={`/issues?project=${project.id}`}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
        >
          Open tasks
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  )
}

function ProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addProject } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<ProjectColor>('violet')
  const [targetDate, setTargetDate] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setColor('violet')
    setTargetDate('')
  }, [open])

  const previewKey = projectKeyFromName(name || 'New project')
  const canSubmit = name.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const input: ProjectInput = {
      name: name.trim(),
      description: description.trim(),
      color,
      targetDate: targetDate || null,
    }
    addProject(input)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} label="New project">
      <form onSubmit={handleSubmit}>
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">New project</h2>
          <p className="mt-1 text-[12px] leading-5 text-fg-muted">
            Give it a name, pick a colour, and keep tasks together around one outcome.
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
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="What does done look like?"
                className="w-full resize-none rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] leading-6 text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
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
                        color === option ? 'ring-2 ring-fg/40 ring-offset-2 ring-offset-surface' : '',
                      )}
                      style={{ backgroundColor: PROJECT_COLORS[option].hex }}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Target date">
                <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
              </Field>
            </div>

            <p className="text-[10.5px] text-fg-subtle">
              Issue keys will look like <span className="font-mono text-fg-muted">{previewKey}-1</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  )
}
