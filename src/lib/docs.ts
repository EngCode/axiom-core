/**======> Reference By Comment <======
 * ===> 01 - Types & Content Loading
 * ===> 02 - Resolution Helpers
 */

const rawDocs = import.meta.glob('/docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const rawImages = import.meta.glob('/docs/**/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

export type DocSection = 'Overview' | 'Project' | 'Pages' | 'Features' | 'Specifications'

export interface DocEntry {
  slug: string
  title: string
  section: DocSection
  content: string
  order: number
}

export const DOC_SECTIONS: DocSection[] = [
  'Overview',
  'Project',
  'Pages',
  'Features',
  'Specifications',
]

const ORDER: string[] = [
  'README',
  'project-structure',
  'architecture',
  'pages/dashboard',
  'pages/issues',
  'pages/projects',
  'pages/project-detail',
  'pages/notes',
  'pages/documents',
  'pages/library',
  'pages/tools',
  'pages/settings',
  'features/command-palette',
  'features/issue-dialog',
  'features/quick-capture',
  'features/themes',
  'features/installer',
  'features/persistence',
  'features/keyboard',
  'features/media-library',
  'features/in-app-docs',
  'features/personalization',
  'resources/SPEC',
  'resources/LIBRARY',
  'resources/DESIGN',
]

function sectionFor(slug: string): DocSection {
  if (slug === 'README') return 'Overview'
  if (slug.startsWith('pages/')) return 'Pages'
  if (slug.startsWith('features/')) return 'Features'
  if (slug.startsWith('resources/')) return 'Specifications'
  return 'Project'
}

function titleFor(content: string, slug: string): string {
  const heading = content.match(/^#\s+(.+)$/m)
  if (heading) return heading[1].trim()
  const fallback = slug.split('/').pop() ?? slug
  return fallback.charAt(0).toUpperCase() + fallback.slice(1).replace(/-/g, ' ')
}

export const DOCS: DocEntry[] = Object.entries(rawDocs)
  .map(([path, content]) => {
    const slug = path.replace(/^\/docs\//, '').replace(/\.md$/i, '')
    const orderIndex = ORDER.indexOf(slug)
    return {
      slug,
      title: titleFor(content, slug),
      section: sectionFor(slug),
      content,
      order: orderIndex === -1 ? 1000 : orderIndex,
    }
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

const DOC_BY_SLUG = new Map(DOCS.map((doc) => [doc.slug, doc]))

export function getDoc(slug: string | null | undefined): DocEntry {
  if (!slug) return DOC_BY_SLUG.get('README') ?? DOCS[0]
  return DOC_BY_SLUG.get(slug) ?? DOC_BY_SLUG.get('README') ?? DOCS[0]
}

/** Resolves `..` and `.` segments without touching the filesystem. */
export function normalizeDocPath(path: string): string {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

export type DocLink =
  | { kind: 'doc'; slug: string }
  | { kind: 'anchor' }
  | { kind: 'external' }
  | { kind: 'file' }

export function resolveDocLink(currentSlug: string, href: string): DocLink {
  if (/^(https?:|mailto:)/i.test(href)) return { kind: 'external' }
  if (href.startsWith('#')) return { kind: 'anchor' }

  const [pathPart] = href.split('#')
  if (!pathPart.toLowerCase().endsWith('.md')) return { kind: 'file' }

  const base = currentSlug.includes('/')
    ? currentSlug.slice(0, currentSlug.lastIndexOf('/') + 1)
    : ''
  const clean = decodeURIComponent(pathPart)
  const normalized = normalizeDocPath(clean.startsWith('/') ? clean : base + clean)
  const slug = normalized.replace(/\.md$/i, '')
  return DOC_BY_SLUG.has(slug) ? { kind: 'doc', slug } : { kind: 'file' }
}

/** Maps a markdown image path to a bundled asset URL, if one exists. */
export function resolveDocImage(currentSlug: string, src: string): string | null {
  if (/^https?:/i.test(src)) return src
  const base = currentSlug.includes('/')
    ? currentSlug.slice(0, currentSlug.lastIndexOf('/') + 1)
    : ''
  const normalized = normalizeDocPath(
    src.startsWith('/') ? src.replace(/^\//, '') : base + src,
  )
  return rawImages[`/docs/${normalized}`] ?? null
}
