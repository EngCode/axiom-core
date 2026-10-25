/**======> Reference By Comment <======
 * ===> 01 - Imports & Constants
 * ===> 02 - Library Page
 */

//=====> Imports & Constants <=====//

import { Library } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'

const MEDIA_KINDS = [
  { key: 'movies', name: 'Movies', note: 'resolution' },
  { key: 'series', name: 'Series', note: 'episode progress' },
  { key: 'anime', name: 'Anime', note: 'episode progress' },
  { key: 'games', name: 'Games', note: 'platform · playtime' },
  { key: 'books', name: 'Books', note: 'author · pages' },
  { key: 'music', name: 'Music', note: 'artist' },
]

const READY_LAYERS = [
  'SQLite tables for kinds, items, copies, volumes and progress',
  'Volume-aware file paths (GUID + serial, relative paths)',
  'Typed Rust commands and a frontend client',
]

//=====> Library Page <=====//

export default function LibraryPage() {
  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="Library"
        description="Everything you already own — games, movies, series, anime, books and music — indexed so you never download it twice."
      />

      <Card>
        <EmptyState
          icon={<Library className="size-4" />}
          title="The data layer is ready; the library screen is next"
          description="Kinds, items, copies, volumes and progress already persist locally. Browsing, scanning and metadata fetching are the next milestone."
          action={
            <Link
              to="/docs?doc=resources/LIBRARY"
              className="text-[12px] font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              Read the library specification
            </Link>
          }
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/*=====> Media Kinds <=====*/}
        <Card>
          <CardHeader title="Kinds" hint={`${MEDIA_KINDS.length} seeded · editable`} />
          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
            {MEDIA_KINDS.map((kind) => (
              <div
                key={kind.key}
                className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface-2/40 px-3 py-2"
              >
                <span className="text-[12.5px] font-medium text-fg">{kind.name}</span>
                <span className="truncate text-[10.5px] text-fg-subtle">{kind.note}</span>
              </div>
            ))}
          </div>
        </Card>

        {/*=====> Data Readiness <=====*/}
        <Card>
          <CardHeader title="Ready underneath" hint="shipped" />
          <ul className="space-y-2 px-4 pb-4 text-[12px] leading-5 text-fg-muted">
            {READY_LAYERS.map((layer) => (
              <li key={layer} className="flex items-start gap-2">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ok/70" />
                <span>{layer}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
