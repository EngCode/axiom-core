/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Project Card
 * ===> 03 - Project Dialog
 */

import { useEffect, useState, type FormEvent } from 'react'
import { ArchiveRestore, ArrowUpRight, FolderKanban, FolderPlus, GripVertical, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

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
import { ContextMenu } from '@/components/context-menu'
import { DragOverlay } from '@/components/drag-overlay'
import { DeleteProjectDialog } from '@/components/delete-project-dialog'
import { projectMenu, type ProjectActions } from '@/lib/actions'
import { projectProgress } from '@/lib/derive'
import { PROJECT_COLORS, PROJECT_COLOR_ORDER, PROJECT_STATUS_META } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { RichTextEditor, plainText } from '@/lib/rich-text'
import { usePointerSort, type PointerSortHandleProps } from '@/lib/use-pointer-sort'
import type { Project, ProjectColor, ProjectInput } from '@/lib/types'
import { useUI } from '@/lib/ui'
import { cn, formatDate, projectKeyFromName } from '@/lib/utils'

export default function ProjectsPage() {
  const { state, updateProject, reorderProjects } = useApp()
  const { openIssueDialog } = useUI()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const { draggingId, overId, pointer, handleProps } = usePointerSort({
    onReorder: (id, targetId) => reorderProjects(id, targetId),
    itemSelector: '[data-project-card]',
  })

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
              onDelete={() => setDeleteTarget(project)}
              dragging={draggingId === project.id}
              dropTarget={overId === project.id}
              handleProps={handleProps(project.id)}
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
                <Card
                  key={project.id}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('a, button')) return
                    navigate(`/projects/${project.id}`)
                  }}
                  className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:border-line-strong"
                >
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
                  <IconButton
                    label="Delete project"
                    className="text-danger hover:bg-danger/10"
                    onClick={() => {
                      const issueCount = state.issues.filter(
                        (issue) => issue.projectId === project.id,
                      ).length
                      if (
                        !window.confirm(
                          `Delete ${project.name}? ${issueCount} issues move to your inbox.`,
                        )
                      ) {
                        return
                      }
                      setDeleteTarget(project)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}

      <ProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <DeleteProjectDialog project={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <DragOverlay
        pointer={pointer}
        label={state.projects.find((project) => project.id === draggingId)?.name ?? 'Project'}
      />
    </div>
  )
}

function ProjectCard({
  project,
  onNewTask,
  onArchive,
  onDelete,
  dragging,
  dropTarget,
  handleProps,
}: {
  project: Project
  onNewTask: () => void
  onArchive: () => void
  onDelete: () => void
  dragging: boolean
  dropTarget: boolean
  handleProps: PointerSortHandleProps
}) {
  //===> Read State & Navigation <===//
  const { state, updateProject } = useApp()
  const navigate = useNavigate()

  //===> Local Menu State <===//
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  //===> Derive Display Values <===//
  const progress = projectProgress(project.id, state.issues)
  const hex = PROJECT_COLORS[project.color].hex

  //===> Expose Project Actions <===//
  const actions: ProjectActions = {
    open: (target) => navigate(`/projects/${target.id}`),
    openIssues: (target) => navigate(`/issues?project=${target.id}`),
    newIssue: () => onNewTask(),
    archive: () => onArchive(),
    restore: () => updateProject(project.id, { status: 'active' }),
    remove: () => onDelete(),
  }

  //===> Render Card <===//
  return (
    <>
      <Card
        data-project-card
        data-sort-id={project.id}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a, button')) return
          navigate(`/projects/${project.id}`)
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          setMenu({ x: event.clientX, y: event.clientY })
        }}
        className={cn(
          'group flex cursor-pointer flex-col p-4 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg hover:shadow-black/20 active:translate-y-0',
          dragging && 'opacity-40',
          dropTarget && 'ring-2 ring-accent/40',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-150 group-hover:scale-105"
            style={{
              backgroundColor: `color-mix(in oklab, ${hex} 16%, transparent)`,
              color: hex,
            }}
          >
            <FolderKanban className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13.5px] font-medium text-fg">
              <Link
                to={`/projects/${project.id}`}
                className="outline-none transition-colors hover:text-accent focus-visible:text-accent"
              >
                {project.name}
              </Link>
            </h3>
            <p className="mt-0.5 truncate text-[10.5px] text-fg-subtle">
              {project.key} · {PROJECT_STATUS_META[project.status].label}
              {project.targetDate ? ` · target ${formatDate(project.targetDate)}` : ''}
            </p>
          </div>
          <span
            role="button"
            tabIndex={0}
            aria-label="Drag project to reorder"
            title="Drag to reorder"
            {...handleProps}
            className="mt-0.5 grid size-6 shrink-0 cursor-grab touch-none place-items-center rounded-control text-fg-subtle opacity-40 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </span>
          <button
            type="button"
            aria-label="Project actions"
            title="Project actions"
            onClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              setMenu({ x: rect.right - 8, y: rect.bottom + 4 })
            }}
            className="grid size-7 shrink-0 place-items-center rounded-control text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>

        <p className="mt-3 min-h-[2.4rem] text-[12px] leading-5 text-fg-muted">
          {plainText(project.description) || 'No description yet.'}
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
          <div className="ms-auto flex items-center gap-1">
            <Link
              to={`/projects/${project.id}`}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
            >
              Details
            </Link>
            <span className="text-fg-subtle/40">/</span>
            <Link
              to={`/issues?project=${project.id}`}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
            >
              Tasks
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </Card>

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={projectMenu(project, actions)}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
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
