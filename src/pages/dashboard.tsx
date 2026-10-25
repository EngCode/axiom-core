import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  Layers,
  NotebookPen,
  Pin,
  Plus,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { IssueRow } from '@/components/issue-row'
import { ProjectDot } from '@/components/issue-bits'
import { Button, Card, CardHeader, EmptyState, Progress } from '@/components/ui'
import { WORKSPACE } from '@/lib/data'
import { completionSeries, focusIssues, getStats, projectProgress, sortNotes } from '@/lib/derive'
import { PROJECT_COLORS, STATUS_ORDER, STATUS_META } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { useUI } from '@/lib/ui'
import {
  cn,
  formatDate,
  formatRelative,
  greeting,
  localISODate,
  pluralize,
  truncate,
} from '@/lib/utils'

export default function DashboardPage() {
  const { state, addIssue } = useApp()
  const { openIssueDialog } = useUI()
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')

  const issues = state.issues
  const stats = getStats(issues)
  const focus = focusIssues(issues, 6)
  const activeProjects = state.projects.filter((project) => project.status === 'active')
  const recentNotes = sortNotes(state.notes).slice(0, 3)
  const series = completionSeries(issues, 7)
  const maxCount = Math.max(1, ...series.map((day) => day.count))
  const completedThisWeek = series.reduce((total, day) => total + day.count, 0)
  const donePercent = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100)

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: issues.filter((issue) => issue.status === status).length,
  }))

  const statCards = [
    {
      label: 'Open tasks',
      value: stats.open,
      icon: CircleDashed,
      tone: 'text-fg-muted',
      caption: `${stats.inProgress} in progress`,
    },
    {
      label: 'Due this week',
      value: stats.dueThisWeek,
      icon: CalendarClock,
      tone: stats.overdue > 0 ? 'text-danger' : 'text-warn',
      caption: stats.overdue > 0 ? `${stats.overdue} overdue` : 'Nothing overdue',
    },
    {
      label: 'Completed · 7 days',
      value: stats.completedLast7,
      icon: CircleCheck,
      tone: 'text-ok',
      caption: `${donePercent}% of everything done`,
    },
    {
      label: 'Active projects',
      value: activeProjects.length,
      icon: Layers,
      tone: 'text-accent',
      caption: `${state.notes.length} notes written`,
    },
  ]

  function handleQuickAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    addIssue({ title, status: 'todo', priority: 'medium', dueDate: localISODate() })
    setDraft('')
  }

  const summary =
    stats.open === 0
      ? 'Everything is clear. A good moment to plan the week ahead.'
      : [
          `${pluralize(stats.open, 'task')} open`,
          stats.overdue > 0 ? `${stats.overdue} overdue` : null,
          stats.dueToday > 0 ? `${stats.dueToday} due today` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <div className="animate-fade-in space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid-wash pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium tracking-[0.16em] text-fg-subtle uppercase">
              {formatDate(localISODate(), 'long')}
            </p>
            <h1 className="mt-2 font-display text-[25px] leading-tight font-semibold tracking-[-0.03em] text-fg sm:text-[27px]">
              {greeting()}, {WORKSPACE.owner}
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-fg-muted">{summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => openIssueDialog()}>
              <Plus className="size-3.5" />
              New issue
            </Button>
            <Button variant="secondary" onClick={() => navigate('/notes?new=1')}>
              <NotebookPen className="size-3.5" />
              New note
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11.5px] font-medium text-fg-muted">{card.label}</span>
              <span className={cn('grid size-6 place-items-center rounded-md bg-surface-2', card.tone)}>
                <card.icon className="size-3.5" />
              </span>
            </div>
            <p className="mt-2 text-[23px] leading-none font-semibold tracking-[-0.02em] text-fg tabular-nums">
              {card.value}
            </p>
            <p className="mt-1.5 text-[10.5px] text-fg-subtle">{card.caption}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader
            title="Focus"
            hint={focus.length > 0 ? `${focus.length} tasks` : undefined}
            action={
              <Link
                to="/issues"
                className="inline-flex items-center gap-1 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
              >
                All issues
                <ArrowRight className="size-3" />
              </Link>
            }
          />
          <div className="px-3 pb-2">
            <form
              onSubmit={handleQuickAdd}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-1.5 transition-colors focus-within:border-accent/40"
            >
              <Plus className="size-3.5 shrink-0 text-fg-subtle" />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a task for today…"
                aria-label="Add a task for today"
                className="h-6 min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-fg-subtle"
              />
              {draft.trim() ? (
                <Button type="submit" variant="primary" size="sm" className="h-6 px-2 text-[11px]">
                  Add
                </Button>
              ) : (
                <span className="hidden text-[10px] text-fg-subtle sm:inline">due today</span>
              )}
            </form>
          </div>
          {focus.length > 0 ? (
            <div className="divide-y divide-line/60 border-t border-line/60">
              {focus.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CircleCheck className="size-4" />}
              title="Nothing urgent today"
              description="Every open task is parked in the backlog. Add something when it matters."
              action={
                <Button size="sm" variant="secondary" onClick={() => openIssueDialog()}>
                  <Plus className="size-3.5" />
                  Add a task
                </Button>
              }
            />
          )}
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/60 px-4 py-2.5 text-[10.5px] text-fg-subtle">
            <span>
              {stats.overdue} overdue · {stats.dueToday} due today · {stats.inProgress} in progress
            </span>
            <span className="hidden sm:inline">Ordered by urgency</span>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Projects"
              action={
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
                >
                  Manage
                  <ArrowUpRight className="size-3" />
                </Link>
              }
            />
            <div className="space-y-3 px-4 pb-4">
              {activeProjects.length === 0 ? (
                <p className="py-2 text-[12px] text-fg-subtle">No active projects yet.</p>
              ) : (
                activeProjects.map((project) => {
                  const progress = projectProgress(project.id, issues)
                  return (
                    <Link
                      key={project.id}
                      to={`/issues?project=${project.id}`}
                      className="-mx-1 block rounded-lg px-1 py-0.5 transition-colors hover:bg-surface-2/60"
                    >
                      <div className="flex items-center gap-2">
                        <ProjectDot project={project} />
                        <span className="truncate text-[12px] text-fg">{project.name}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-fg-subtle tabular-nums">
                          {progress.done}/{progress.total}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress
                          value={progress.percent}
                          className="h-1"
                          color={PROJECT_COLORS[project.color].hex}
                        />
                        <span className="w-6 shrink-0 text-right text-[9.5px] text-fg-subtle tabular-nums">
                          {progress.percent}%
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="This week" hint={`${completedThisWeek} completed`} />
            <div className="px-4 pb-4">
              <div className="flex h-[72px] items-end gap-1.5">
                {series.map((day) => (
                  <div
                    key={day.date}
                    title={`${pluralize(day.count, 'task')} completed · ${formatDate(day.date)}`}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span
                      className={cn(
                        'text-[9px] text-fg-subtle tabular-nums',
                        day.count === 0 && 'invisible',
                      )}
                    >
                      {day.count}
                    </span>
                    <div
                      className={cn(
                        'w-full rounded-sm transition-colors',
                        day.isToday
                          ? 'bg-accent'
                          : 'bg-accent/25 group-hover:bg-accent/45',
                      )}
                      style={{
                        height: `${Math.max(4, (day.count / maxCount) * 52)}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {series.map((day) => (
                  <span
                    key={day.date}
                    className={cn(
                      'flex-1 text-center text-[9px] tracking-wide uppercase',
                      day.isToday ? 'font-medium text-fg' : 'text-fg-subtle',
                    )}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line/60 pt-2.5">
                {statusCounts.map(({ status, count }) => (
                  <span key={status} className="inline-flex items-center gap-1 text-[10px] text-fg-subtle">
                    <span
                      className={cn('size-1.5 rounded-full', {
                        'bg-fg-subtle/60': status === 'backlog',
                        'bg-fg-muted/70': status === 'todo',
                        'bg-warn': status === 'in_progress',
                        'bg-accent': status === 'done',
                      })}
                    />
                    {STATUS_META[status].label}
                    <span className="text-fg tabular-nums">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent notes"
            hint={`${state.notes.length} total`}
            action={
              <Link
                to="/notes"
                className="inline-flex items-center gap-1 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
              >
                All notes
                <ArrowRight className="size-3" />
              </Link>
            }
          />
          {recentNotes.length > 0 ? (
            <div className="grid gap-2 px-3 pb-3 sm:grid-cols-3">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes?note=${note.id}`}
                  className="group flex flex-col rounded-lg border border-line bg-surface-2/40 p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <div className="flex items-center gap-1.5">
                    {note.pinned ? <Pin className="size-3 shrink-0 text-accent" /> : null}
                    <p className="truncate text-[12px] font-medium text-fg">
                      {note.title || 'Untitled note'}
                    </p>
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-[11px] leading-5 text-fg-muted">
                    {truncate(note.content, 110) || 'Empty note'}
                  </p>
                  <p className="mt-auto pt-2 text-[10px] text-fg-subtle">
                    {formatRelative(note.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<NotebookPen className="size-4" />}
              title="No notes yet"
              description="Ideas, meeting notes and half-finished thoughts live here."
              action={
                <Button size="sm" variant="secondary" onClick={() => navigate('/notes?new=1')}>
                  <Plus className="size-3.5" />
                  Write a note
                </Button>
              }
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Activity" />
          <ul className="space-y-0.5 px-2 pb-3">
            {state.activity.slice(0, 6).map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/60"
              >
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent/50" />
                <div className="min-w-0">
                  <p className="text-[11.5px] leading-5 text-fg-muted">{entry.message}</p>
                  <p className="text-[10px] text-fg-subtle">{formatRelative(entry.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
