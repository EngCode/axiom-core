import { useMemo, useState, type ReactNode } from 'react'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { IssueRow } from '@/components/issue-row'
import { StatusIcon } from '@/components/issue-bits'
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Select,
} from '@/components/ui'
import { getStats } from '@/lib/derive'
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from '@/lib/meta'
import { useApp } from '@/lib/store'
import type { Priority, Status } from '@/lib/types'
import { useUI } from '@/lib/ui'
import { cn, pluralize } from '@/lib/utils'

type StatusFilter = Status | 'all'
type PriorityFilter = Priority | 'all'

export default function IssuesPage() {
  const { state } = useApp()
  const { openIssueDialog } = useUI()
  const [searchParams, setSearchParams] = useSearchParams()

  const projectFilter = searchParams.get('project') ?? 'all'
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [query, setQuery] = useState('')

  const currentProject = state.projects.find((project) => project.id === projectFilter)
  const stats = getStats(state.issues)

  const scoped = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return state.issues.filter((issue) => {
      if (projectFilter !== 'all' && issue.projectId !== projectFilter) return false
      if (priorityFilter !== 'all' && issue.priority !== priorityFilter) return false
      if (needle) {
        const haystack = `${issue.title} ${issue.key} ${issue.labels.join(' ')}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [state.issues, projectFilter, priorityFilter, query])

  const counts = useMemo(() => {
    const map: Record<Status, number> = { backlog: 0, todo: 0, in_progress: 0, done: 0 }
    for (const issue of scoped) map[issue.status] += 1
    return map
  }, [scoped])

  const visible = statusFilter === 'all' ? scoped : scoped.filter((issue) => issue.status === statusFilter)
  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: visible.filter((issue) => issue.status === status),
  })).filter((group) => group.items.length > 0)

  const hasFilters = projectFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || query.trim() !== ''

  function setProjectFilter(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('project')
    else next.set('project', value)
    setSearchParams(next, { replace: true })
  }

  function clearFilters() {
    setProjectFilter('all')
    setStatusFilter('all')
    setPriorityFilter('all')
    setQuery('')
  }

  function addIssue(status?: Status) {
    openIssueDialog({
      status,
      projectId: projectFilter === 'all' ? null : projectFilter,
    })
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow={currentProject ? `${currentProject.key} · Project` : 'Workspace'}
        title={currentProject ? currentProject.name : 'Issues'}
        description={
          currentProject
            ? currentProject.description || 'Every task collected under this project.'
            : `All ${stats.total} tasks in one place, grouped by status. ${stats.open} still open.`
        }
        actions={
          <>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => addIssue()}>
              <Plus className="size-3.5" />
              New issue
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
        <div className="flex flex-wrap items-center gap-1">
          <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            All
            <Count value={scoped.length} />
          </FilterPill>
          {STATUS_ORDER.map((status) => (
            <FilterPill
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            >
              <StatusIcon status={status} />
              {STATUS_META[status].label}
              <Count value={counts[status]} />
            </FilterPill>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
          <div className="relative min-w-0 flex-1 sm:max-w-[220px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter issues…"
              aria-label="Filter issues"
              className="h-8 pl-8 text-[12.5px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-3.5 shrink-0 text-fg-subtle" />
            <Select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              aria-label="Filter by project"
              className="h-8 w-[140px] text-[12px]"
            >
              <option value="all">All projects</option>
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
              aria-label="Filter by priority"
              className="h-8 w-[130px] text-[12px]"
            >
              <option value="all">Any priority</option>
              {PRIORITY_ORDER.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_META[priority].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="size-4" />}
            title={hasFilters ? 'No issues match those filters' : 'No issues yet'}
            description={
              hasFilters
                ? 'Try a different search term, or clear the filters to see everything.'
                : 'Create the first task and it will show up here, grouped by status.'
            }
            action={
              hasFilters ? (
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => addIssue()}>
                  <Plus className="size-3.5" />
                  New issue
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(({ status, items }) => (
            <Card key={status}>
              <div className="flex items-center gap-2 px-3 py-2">
                <StatusIcon status={status} />
                <h2 className="text-[12.5px] font-medium text-fg">{STATUS_META[status].label}</h2>
                <span className="text-[10.5px] text-fg-subtle tabular-nums">{items.length}</span>
                <span className="hidden text-[10.5px] text-fg-subtle/70 sm:inline">
                  · {STATUS_META[status].hint}
                </span>
                <div className="ml-auto">
                  <IconButton
                    label={`New ${STATUS_META[status].label.toLowerCase()} issue`}
                    onClick={() => addIssue(status)}
                    className="size-7"
                  >
                    <Plus className="size-3.5" />
                  </IconButton>
                </div>
              </div>
              <div className="divide-y divide-line/60 border-t border-line/60">
                {items.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </div>
            </Card>
          ))}
          <p className="px-1 text-[10.5px] text-fg-subtle">
            Showing {pluralize(visible.length, 'issue')}
            {visible.length !== state.issues.length ? ` of ${state.issues.length}` : ''}. Click a row to
            edit · click the circle to complete.
          </p>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium transition-colors',
        active
          ? 'border-accent/40 bg-accent-soft text-fg'
          : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

function Count({ value }: { value: number }) {
  return <span className="text-[10px] text-fg-subtle tabular-nums">{value}</span>
}
