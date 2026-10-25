/**======> Reference By Comment <======
 * ===> 01 - Imports & Constants
 * ===> 02 - Documents Page
 */

//=====> Imports & Constants <=====//

import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'

const PLANNED_CAPABILITIES = [
  'Long-form documents with sections and a table of contents',
  'Documents linked to projects, issues and library items',
  'Nested pages with backlinks between them',
  'Markdown import and PDF export',
]

//=====> Documents Page <=====//

export default function DocumentsPage() {
  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="Documents"
        description="The long-form counterpart to Notes: structured pages that belong to a project and can be linked from anywhere."
      />

      {/*=====> Status <=====*/}
      <Card>
        <EmptyState
          icon={<FileText className="size-4" />}
          title="Documents are the next workspace layer"
          description="The page and navigation exist so the feature has a home. Editing, nesting and backlinks are planned, not implied."
          action={
            <Link
              to="/docs?doc=pages/notes"
              className="text-[12px] font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              Read how Notes works today
            </Link>
          }
        />
      </Card>

      {/*=====> Planned Scope <=====*/}
      <Card>
        <CardHeader title="What will live here" hint="planned" />
        <ul className="space-y-2 px-4 pb-4 text-[12.5px] leading-5 text-fg-muted">
          {PLANNED_CAPABILITIES.map((capability) => (
            <li key={capability} className="flex items-start gap-2">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-fg-subtle/60" />
              <span>{capability}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
