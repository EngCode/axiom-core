/**======> Reference By Comment <======
 * ===> 01 - Imports & Helpers
 * ===> 02 - Tools Catalog
 */

//=====> Imports & Helpers <=====//

import { useMemo, useState } from 'react'
import { ArrowUpRight, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, EmptyState, Input, PageHeader } from '@/components/ui'
import { TOOLS, TOOL_CATEGORIES, categoryLabel, type ToolCategoryId } from '@/lib/tools'
import { cn } from '@/lib/utils'

type Filter = 'all' | ToolCategoryId

//=====> Tools Catalog <=====//

export default function ToolsPage() {
  //===> Catalog State <===//
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [recent] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('axiom.tools.recent') ?? '[]') as string[]
    } catch {
      return []
    }
  })

  //===> Filter Tools <===//
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return TOOLS.filter((tool) => {
      if (filter !== 'all' && tool.category !== filter) return false
      if (!needle) return true
      return `${tool.name} ${tool.description} ${tool.keywords}`.toLowerCase().includes(needle)
    })
  }, [filter, query])

  const recentTools = TOOLS.filter((tool) => recent.includes(tool.id))

  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="Tools"
        description="Local utilities for design and development. Every tool runs in this window; nothing is uploaded."
      />

      <Card className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="h-8 ps-8 text-[12px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={cn(
              'rounded-control border px-2 py-1 text-[10.5px] transition-colors',
              filter === 'all'
                ? 'border-accent/40 bg-accent-soft/40 text-fg'
                : 'border-line text-fg-subtle hover:border-line-strong hover:text-fg',
            )}
          >
            All
            <span className="ms-1 text-fg-subtle">{TOOLS.length}</span>
          </button>
          {TOOL_CATEGORIES.map((category) => {
            const count = TOOLS.filter((tool) => tool.category === category.id).length
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setFilter(category.id)}
                aria-pressed={filter === category.id}
                className={cn(
                  'rounded-control border px-2 py-1 text-[10.5px] transition-colors',
                  filter === category.id
                    ? 'border-accent/40 bg-accent-soft/40 text-fg'
                    : 'border-line text-fg-subtle hover:border-line-strong hover:text-fg',
                )}
              >
                {category.label}
                <span className="ms-1 text-fg-subtle">{count}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {recentTools.length > 0 && !query.trim() && filter === 'all' ? (
        <section className="space-y-2">
          <h2 className="px-1 text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
            Recent
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {recentTools.slice(0, 4).map((tool) => (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1 text-[11px] text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <tool.icon className="size-3" />
                {tool.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="size-4" />}
            title="No tools match"
            description="Try a different search or category."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((tool) => (
            <Link
              key={tool.id}
              to={`/tools/${tool.id}`}
              className="group flex flex-col rounded-card border border-line bg-surface p-4 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-control border border-line bg-surface-2 text-fg-muted transition-colors group-hover:text-accent">
                  <tool.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-fg">{tool.name}</p>
                  <p className="mt-0.5 text-[10px] tracking-[0.1em] text-fg-subtle uppercase">
                    {categoryLabel(tool.category)}
                  </p>
                </div>
                <ArrowUpRight className="size-3.5 shrink-0 text-fg-subtle transition-transform group-hover:-translate-y-0.5 group-hover:text-fg rtl:-scale-x-100" />
              </div>
              <p className="mt-3 text-[11.5px] leading-5 text-fg-muted">{tool.description}</p>
            </Link>
          ))}
        </div>
      )}

      <Card className="flex items-start gap-2 px-3 py-2.5 text-[10.5px] leading-4 text-fg-subtle">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" />
        Each tool has its own route, so the catalog can grow without turning this page into one long
        form. More image, colour and generator tools will land in the same structure.
      </Card>
    </div>
  )
}
