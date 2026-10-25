/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Docs Navigation
 * ===> 03 - Document Viewer
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'

import { Markdown } from '@/components/markdown'
import { Card, Input, PageHeader } from '@/components/ui'
import { DOCS, DOC_SECTIONS, getDoc } from '@/lib/docs'
import { cn } from '@/lib/utils'

export default function DocsPage() {
  const [params, setParams] = useSearchParams()
  const doc = getDoc(params.get('doc'))
  const [query, setQuery] = useState('')

  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0 })
  }, [doc.slug])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return DOCS
    return DOCS.filter((entry) =>
      `${entry.title} ${entry.content}`.toLowerCase().includes(needle),
    )
  }, [query])

  const sections = DOC_SECTIONS.map((section) => ({
    section,
    entries: filtered.filter((entry) => entry.section === section),
  })).filter((group) => group.entries.length > 0)

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Reference"
        title="Documentation"
        description="Pages, features and specifications — shipped with the app and readable offline."
        actions={
          <span className="text-[11px] text-fg-subtle tabular-nums">{DOCS.length} documents</span>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-20">
          <div className="border-b border-line p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search docs…"
                aria-label="Search documentation"
                className="h-8 ps-8 text-[12.5px]"
              />
            </div>
          </div>

          <div className="slim-scroll max-h-[calc(100vh-15rem)] overflow-y-auto p-2">
            {sections.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-fg-subtle">
                No documents match “{query.trim()}”.
              </p>
            ) : (
              sections.map((group) => (
                <div key={group.section} className="mb-2">
                  <p className="px-2 pt-1.5 pb-1 text-[9.5px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">
                    {group.section}
                  </p>
                  <div className="space-y-0.5">
                    {group.entries.map((entry) => {
                      const active = entry.slug === doc.slug
                      return (
                        <button
                          key={entry.slug}
                          type="button"
                          onClick={() => setParams({ doc: entry.slug })}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'block w-full truncate rounded-control px-2 py-1.5 text-start text-[12px] transition-colors',
                            active
                              ? 'bg-surface-2 font-medium text-fg'
                              : 'text-fg-muted hover:bg-surface-2/70 hover:text-fg',
                          )}
                        >
                          {entry.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="min-w-0 px-5 py-5 sm:px-7 sm:py-6">
          <Markdown content={doc.content} docSlug={doc.slug} />
        </Card>
      </div>
    </div>
  )
}
