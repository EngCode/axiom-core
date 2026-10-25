/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Selection & Tag Actions
 * ===> 03 - List Pane
 * ===> 04 - Editor Pane
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { NotebookPen, Pin, Plus, Search, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Select,
} from '@/components/ui'
import { sortNotes } from '@/lib/derive'
import { useApp } from '@/lib/store'
import { cn, formatRelative, truncate } from '@/lib/utils'

export default function NotesPage() {
  const { state, addNote, updateNote, deleteNote, toggleNotePin } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const handledNew = useRef(false)

  const ordered = useMemo(() => sortNotes(state.notes), [state.notes])
  const selectedId = searchParams.get('note')
  const selected = ordered.find((note) => note.id === selectedId) ?? ordered[0] ?? null

  useEffect(() => {
    setTagDraft('')
  }, [selected?.id])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return ordered
    return ordered.filter((note) =>
      `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase().includes(needle),
    )
  }, [ordered, query])

  const wantsNewNote = searchParams.get('new')

  useEffect(() => {
    if (!wantsNewNote || handledNew.current) return
    handledNew.current = true
    const id = addNote()
    setSearchParams({ note: id }, { replace: true })
  }, [wantsNewNote, addNote, setSearchParams])

  function selectNote(id: string) {
    setSearchParams({ note: id }, { replace: true })
  }

  function createNote() {
    const id = addNote()
    setSearchParams({ note: id }, { replace: true })
  }

  function removeNote(id: string, title: string) {
    if (!window.confirm(`Delete “${title || 'Untitled note'}”? This cannot be undone.`)) return
    deleteNote(id)
    const next = ordered.find((note) => note.id !== id)
    setSearchParams(next ? { note: next.id } : {}, { replace: true })
  }

  function commitTag() {
    if (!selected) return
    const additions = tagDraft
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean)
    if (additions.length === 0) return
    updateNote(selected.id, { tags: Array.from(new Set([...selected.tags, ...additions])) })
    setTagDraft('')
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Workspace"
        title="Notes"
        description="Long-form thinking, meeting notes and the paragraphs that do not fit in a task."
        actions={
          <Button variant="primary" onClick={createNote}>
            <Plus className="size-3.5" />
            New note
          </Button>
        }
      />

      <div className="grid gap-4 lg:h-[calc(100vh-13rem)] lg:min-h-[540px] lg:grid-cols-[290px_1fr]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-line p-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes…"
                aria-label="Search notes"
                className="h-8 ps-8 text-[12.5px]"
              />
            </div>
            <IconButton label="New note" onClick={createNote}>
              <Plus className="size-4" />
            </IconButton>
          </div>

          <div className="slim-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-[12px] text-fg-subtle">
                {query.trim() ? 'No notes match that search.' : 'No notes yet.'}
              </p>
            ) : (
              filtered.map((note) => {
                const isActive = note.id === selected?.id
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => selectNote(note.id)}
                    className={cn(
                      'block w-full rounded-lg px-2.5 py-2 text-start transition-colors',
                      isActive ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {note.pinned ? <Pin className="size-3 shrink-0 text-accent" /> : null}
                      <span className="truncate text-[12.5px] font-medium text-fg">
                        {note.title || 'Untitled note'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
                      {truncate(note.content, 80) || 'Empty note'}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {note.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[9.5px] text-fg-subtle">
                          #{tag}
                        </span>
                      ))}
                      <span className="ms-auto text-[9.5px] text-fg-subtle">
                        {formatRelative(note.updatedAt)}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </Card>

        {selected ? (
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2">
              <span className="text-[10.5px] text-fg-subtle">
                {selected.pinned ? 'Pinned' : 'Note'} · saved {formatRelative(selected.updatedAt)}
              </span>
              <div className="ms-auto flex items-center gap-1.5">
                <Select
                  value={selected.projectId ?? ''}
                  onChange={(event) => updateNote(selected.id, { projectId: event.target.value || null })}
                  aria-label="Note project"
                  className="h-6 w-auto min-w-[112px] border-transparent bg-transparent pr-6 text-[10.5px] text-fg-subtle hover:border-line"
                >
                  <option value="">No project</option>
                  {state.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
                <IconButton
                  label={selected.pinned ? 'Unpin note' : 'Pin note'}
                  onClick={() => toggleNotePin(selected.id)}
                  className={selected.pinned ? 'text-accent hover:text-accent' : ''}
                >
                  <Pin className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Delete note"
                  onClick={() => removeNote(selected.id, selected.title)}
                  className="hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </div>

            <div className="slim-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-6">
              <input
                value={selected.title}
                onChange={(event) => updateNote(selected.id, { title: event.target.value })}
                placeholder="Untitled note"
                aria-label="Note title"
                className="w-full bg-transparent font-display text-[22px] font-semibold tracking-[-0.02em] text-fg outline-none placeholder:text-fg-subtle/70"
              />

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface-2 py-0.5 pr-0.5 pl-2 text-[10px] text-fg-muted"
                  >
                    #{tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      onClick={() =>
                        updateNote(selected.id, {
                          tags: selected.tags.filter((candidate) => candidate !== tag),
                        })
                      }
                      className="grid size-3.5 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
                    >
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onBlur={commitTag}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault()
                      commitTag()
                    } else if (event.key === 'Backspace' && !tagDraft && selected.tags.length > 0) {
                      updateNote(selected.id, { tags: selected.tags.slice(0, -1) })
                    }
                  }}
                  placeholder="+ tag"
                  aria-label="Add a tag"
                  className="h-5 w-[64px] bg-transparent text-[10.5px] text-fg-subtle outline-none placeholder:text-fg-subtle/70"
                />
              </div>

              <textarea
                value={selected.content}
                onChange={(event) => updateNote(selected.id, { content: event.target.value })}
                placeholder="Start writing…"
                aria-label="Note content"
                className="mt-3 min-h-[320px] w-full flex-1 resize-none bg-transparent text-[13.5px] leading-7 text-fg outline-none placeholder:text-fg-subtle/70"
              />
            </div>
          </Card>
        ) : (
          <Card className="flex min-h-0 flex-col justify-center">
            <EmptyState
              icon={<NotebookPen className="size-4" />}
              title="Start your first note"
              description="Notes are for the thinking that does not fit into a task. Everything is saved to this browser."
              action={
                <Button size="sm" variant="primary" onClick={createNote}>
                  <Plus className="size-3.5" />
                  New note
                </Button>
              }
            />
          </Card>
        )}
      </div>
    </div>
  )
}
