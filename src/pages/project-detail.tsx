/**======> Reference By Comment <======
 * ===> 01 - Imports & Tabs
 * ===> 02 - Stats & Tabs
 * ===> 03 - Overview
 * ===> 04 - Issues
 * ===> 05 - Milestones & Documents
 * ===> 06 - Project Detail Page
 */

//=====> Imports & Tabs <=====//

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Flag,
  ListTodo,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useState, type FormEvent } from 'react'

import { DocumentList } from '@/components/document-list'
import { IssueList } from '@/components/issue-list'
import { IssueRow } from '@/components/issue-row'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Progress,
} from '@/components/ui'
import { projectProgress } from '@/lib/derive'
import { PROJECT_COLORS, PROJECT_STATUS_META } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { useUI } from '@/lib/ui'
import { cn, formatDate, localISODate, pluralize } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'issues', label: 'Issues' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'documents', label: 'Documents' },
] as const

type TabId = (typeof TABS)[number]['id']

//=====> Stats & Tabs <=====//

function Stats({ projectId }: { projectId: string }) {
  //===> Read Issues & Progress <===//
  const { state } = useApp()
  const issues = state.issues.filter((issue) => issue.projectId === projectId)
  const progress = projectProgress(projectId, state.issues)
  const open = issues.filter((issue) => issue.status !== 'done')
  const inProgress = issues.filter((issue) => issue.status === 'in_progress')
  const today = localISODate()
  const overdue = open.filter((issue) => issue.dueDate && issue.dueDate < today)

  const stats = [
    { label: 'Open', value: open.length, hint: `${progress.total} total` },
    { label: 'In progress', value: inProgress.length, hint: 'being worked on' },
    { label: 'Done', value: progress.done, hint: `${progress.percent}% complete` },
    { label: 'Overdue', value: overdue.length, hint: overdue.length ? 'needs attention' : 'nothing late' },
  ]

  //===> Render Stats <===//
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-3.5">
          <p className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
            {stat.label}
          </p>
          <p className="mt-1 text-[20px] leading-none font-semibold tracking-[-0.02em] text-fg tabular-nums">
            {stat.value}
          </p>
          <p className="mt-1 text-[10.5px] text-fg-subtle">{stat.hint}</p>
        </Card>
      ))}
    </div>
  )
}

function ProjectTabs({ projectId, tab }: { projectId: string; tab: TabId }) {
  //===> Render Tabs <===//
  return (
    <nav aria-label="Project sections" className="flex items-center gap-1 border-b border-line pb-px">
      {TABS.map((entry) => (
        <Link
          key={entry.id}
          to={`/projects/${projectId}?tab=${entry.id}`}
          aria-current={tab === entry.id ? 'page' : undefined}
          className={cn(
            'relative -mb-px rounded-t-control px-2.5 py-2 text-[12px] transition-colors',
            tab === entry.id
              ? 'border-b-2 border-accent text-fg'
              : 'border-b-2 border-transparent text-fg-subtle hover:text-fg',
          )}
        >
          {entry.label}
        </Link>
      ))}
    </nav>
  )
}

//=====> Overview <=====//

function Overview({ projectId }: { projectId: string }) {
  //===> Read Project Data <===//
  const { state } = useApp()
  const { openIssueDialog } = useUI()
  const project = state.projects.find((candidate) => candidate.id === projectId)
  if (!project) return null

  const issues = state.issues.filter((issue) => issue.projectId === projectId)
  const open = issues
    .filter((issue) => issue.status !== 'done')
    .sort((left, right) => (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999'))
  const progress = projectProgress(projectId, state.issues)
  const projectNotes = state.notes.filter((note) => note.projectId === projectId)
  const projectMilestones = state.milestones.filter((milestone) => milestone.projectId === projectId)
  const nextMilestone = projectMilestones
    .filter((milestone) => milestone.status !== 'done')
    .sort((left, right) => (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999'))[0]
  const projectDocuments = state.documents.filter((document) => document.projectId === projectId)
  const hex = PROJECT_COLORS[project.color].hex

  //===> Render Overview <===//
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden">
        <CardHeader
          title="Open issues"
          hint={`${open.length} ${pluralize(open.length, 'issue')}`}
          action={
            <Link
              to={`/projects/${projectId}?tab=issues`}
              className="text-[11px] text-fg-subtle transition-colors hover:text-fg"
            >
              All issues
            </Link>
          }
        />
        {open.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-4" />}
            title="Nothing open"
            description="Every issue in this project is complete."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openIssueDialog({ projectId })}
              >
                <Plus className="size-3.5" />
                New issue
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-line/60 border-t border-line">
            {open.slice(0, 6).map((issue) => (
              <IssueRow key={issue.id} issue={issue} showProject={false} />
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Progress" hint={PROJECT_STATUS_META[project.status].label} />
          <div className="space-y-3 px-4 pb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[24px] leading-none font-semibold tracking-[-0.02em] text-fg tabular-nums">
                {progress.percent}%
              </span>
              <span className="text-[10.5px] text-fg-subtle">
                {progress.done}/{progress.total} done
              </span>
            </div>
            <Progress value={progress.percent} color={hex} />
            <dl className="space-y-1.5 text-[11.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-subtle">Target</dt>
                <dd className="text-fg-muted">
                  {project.targetDate ? formatDate(project.targetDate, 'long') : 'No date'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-subtle">Created</dt>
                <dd className="text-fg-muted">{formatDate(project.createdAt, 'long')}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-subtle">Notes</dt>
                <dd className="text-fg-muted">{projectNotes.length}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Milestones"
            hint={`${projectMilestones.filter((milestone) => milestone.status === 'done').length}/${projectMilestones.length}`}
          />
          <div className="px-4 pb-4 text-[11.5px] leading-5 text-fg-muted">
            <p className="flex items-start gap-2">
              <Flag className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" />
              {nextMilestone
                ? `${nextMilestone.title}${nextMilestone.dueDate ? ` · ${formatDate(nextMilestone.dueDate, 'long')}` : ''}`
                : 'No open milestone. Add one to group the next phase.'}
            </p>
            <Link
              to={`/projects/${projectId}?tab=milestones`}
              className="mt-2 inline-block text-[11px] text-accent underline decoration-accent/30 underline-offset-2"
            >
              Manage milestones
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Documents" hint={`${projectDocuments.length}`} />
          <div className="px-4 pb-4 text-[11.5px] leading-5 text-fg-muted">
            <p className="flex items-start gap-2">
              <FileText className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" />
              {projectDocuments[0]?.title ?? 'Briefs, specs and decision records for this project.'}
            </p>
            <Link
              to={`/projects/${projectId}?tab=documents`}
              className="mt-2 inline-block text-[11px] text-accent underline decoration-accent/30 underline-offset-2"
            >
              Open documents
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

//=====> Issues <=====//

function IssuesTab({ projectId }: { projectId: string }) {
  //===> Read Scoped Issues <===//
  const { state } = useApp()
  const { openIssueDialog } = useUI()
  const issues = state.issues.filter((issue) => issue.projectId === projectId)

  //===> Render Shared Issue List <===//
  return (
    <IssueList
      issues={issues}
      showProject={false}
      onAdd={(status) => openIssueDialog({ projectId, status })}
      emptyDescription="Add the first issue from the header to start the project."
    />
  )
}
//=====> Documents & Milestones <=====//

function DocumentsTab({ projectId }: { projectId: string }) {
  //===> Read Documents <===//
  const { state, addDocument } = useApp()
  const navigate = useNavigate()
  const documents = state.documents.filter((document) => document.projectId === projectId)

  //===> Create In Project <===//
  function createDocument() {
    const id = addDocument({ projectId, title: 'Untitled document' })
    navigate(`/documents?doc=${id}`)
  }

  //===> Render List <===//
  return (
    <DocumentList
      documents={documents}
      onCreate={createDocument}
      showProject={false}
      emptyTitle="No project documents"
      emptyDescription="Add the brief, spec or decision record for this project."
    />
  )
}

function MilestonesTab({ projectId }: { projectId: string }) {
  //===> Read & Mutate <===//
  const { state, addMilestone, updateMilestone, deleteMilestone, toggleMilestone } = useApp()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const milestones = state.milestones.filter((milestone) => milestone.projectId === projectId)
  const issues = state.issues.filter((issue) => issue.projectId === projectId)

  //===> Create <===//
  function createMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    addMilestone({ projectId, title, dueDate: dueDate || null })
    setTitle('')
    setDueDate('')
  }

  //===> Delete <===//
  function removeMilestone(id: string, name: string) {
    if (!window.confirm(`Delete milestone “${name}”?`)) return
    deleteMilestone(id)
  }

  //===> Render Tab <===//
  return (
    <div className="space-y-3">
      <Card>
        <form onSubmit={createMilestone} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
              New milestone
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Documents and milestones"
              className="mt-1"
            />
          </div>
          <div className="sm:w-40">
            <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
              Due
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={!title.trim()}>
            <Plus className="size-3.5" />
            Add
          </Button>
        </form>
      </Card>

      {milestones.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Flag className="size-4" />}
            title="No milestones yet"
            description="A milestone is a checkpoint with a due date and a rollup of linked issues."
          />
        </Card>
      ) : (
        milestones.map((milestone) => {
          const linked = issues.filter((issue) => milestone.issueIds.includes(issue.id))
          const done = linked.filter((issue) => issue.status === 'done').length
          const percent = linked.length === 0 ? 0 : Math.round((done / linked.length) * 100)
          const unlinked = issues.filter((issue) => !milestone.issueIds.includes(issue.id))

          return (
            <Card key={milestone.id} className="p-4">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  aria-label={milestone.status === 'done' ? 'Reopen milestone' : 'Complete milestone'}
                  onClick={() => toggleMilestone(milestone.id)}
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded transition-colors hover:bg-surface-3"
                >
                  {milestone.status === 'done' ? (
                    <CheckCircle2 className="size-[15px] text-accent" />
                  ) : (
                    <Circle className="size-[15px] text-fg-subtle" />
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      value={milestone.title}
                      onChange={(event) =>
                        updateMilestone(milestone.id, { title: event.target.value })
                      }
                      aria-label="Milestone title"
                      className={`min-w-0 flex-1 bg-transparent text-[13.5px] font-medium outline-none ${
                        milestone.status === 'done'
                          ? 'text-fg-subtle line-through decoration-fg-subtle/40'
                          : 'text-fg'
                      }`}
                    />
                    <IconButton
                      label="Delete milestone"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => removeMilestone(milestone.id, milestone.title)}
                    >
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>

                  {milestone.description ? (
                    <p className="text-[11px] leading-5 text-fg-muted">{milestone.description}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-fg-subtle">
                    <label className="inline-flex items-center gap-1.5">
                      Due
                      <input
                        type="date"
                        value={milestone.dueDate ?? ''}
                        onChange={(event) =>
                          updateMilestone(milestone.id, { dueDate: event.target.value || null })
                        }
                        className="h-6 rounded border border-line bg-surface-2 px-1 text-[10.5px] text-fg-muted outline-none"
                      />
                    </label>
                    <span>
                      {done}/{linked.length} issues · {percent}%
                    </span>
                  </div>

                  <Progress value={percent} />

                  {linked.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {linked.map((issue) => (
                        <span
                          key={issue.id}
                          className="inline-flex items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-muted"
                        >
                          <span className="font-mono text-[9.5px] text-fg-subtle">{issue.key}</span>
                          <button
                            type="button"
                            aria-label={`Unlink ${issue.key}`}
                            onClick={() =>
                              updateMilestone(milestone.id, {
                                issueIds: milestone.issueIds.filter((id) => id !== issue.id),
                              })
                            }
                            className="text-fg-subtle transition-colors hover:text-danger"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {unlinked.length > 0 ? (
                    <select
                      value=""
                      onChange={(event) => {
                        if (!event.target.value) return
                        updateMilestone(milestone.id, {
                          issueIds: [...milestone.issueIds, event.target.value],
                        })
                      }}
                      aria-label="Link issue to milestone"
                      className="h-7 max-w-[240px] rounded-control border border-line bg-surface-2 px-1.5 text-[10.5px] text-fg-muted outline-none"
                    >
                      <option value="">Link an issue…</option>
                      {unlinked.map((issue) => (
                        <option key={issue.id} value={issue.id}>
                          {issue.key} · {issue.title}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
//=====> Project Detail Page <=====//

export default function ProjectDetailPage() {
  //===> Read Route State <===//
  const { projectId = '' } = useParams()
  const { state, updateProject } = useApp()
  const { openIssueDialog } = useUI()
  const [searchParams] = useSearchParams()

  //===> Resolve Project <===//
  const project = state.projects.find((candidate) => candidate.id === projectId)

  //===> Guard Clause: Unknown Project <===//
  if (!project) {
    return (
      <Card>
        <EmptyState
          icon={<ListTodo className="size-4" />}
          title="Project not found"
          description="It may have been removed, or the link points at an old project."
          action={
            <Link
              to="/projects"
              className="text-[12px] font-medium text-accent underline decoration-accent/30 underline-offset-2"
            >
              Back to projects
            </Link>
          }
        />
      </Card>
    )
  }

  //===> Resolve Active Tab <===//
  const requested = searchParams.get('tab')
  const tab = TABS.some((entry) => entry.id === requested) ? (requested as TabId) : 'overview'
  const archived = project.status === 'done'

  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5 rtl:rotate-180" />
        Projects
      </Link>

      <PageHeader
        eyebrow={`${project.key} · ${PROJECT_STATUS_META[project.status].label}`}
        title={project.name}
        description={project.description || 'No description yet.'}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                updateProject(project.id, { status: archived ? 'active' : 'done' })
              }
            >
              {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
              {archived ? 'Restore' : 'Archive'}
            </Button>
            <Button variant="primary" onClick={() => openIssueDialog({ projectId: project.id })}>
              <Plus className="size-3.5" />
              New issue
            </Button>
          </>
        }
      />

      <Stats projectId={project.id} />
      <ProjectTabs projectId={project.id} tab={tab} />

      {tab === 'overview' ? <Overview projectId={project.id} /> : null}
      {tab === 'issues' ? <IssuesTab projectId={project.id} /> : null}
      {tab === 'milestones' ? <MilestonesTab projectId={project.id} /> : null}
      {tab === 'documents' ? <DocumentsTab projectId={project.id} /> : null}
    </div>
  )
}
