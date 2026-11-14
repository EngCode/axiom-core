/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Thumbnail
 */

import { useEffect, useState } from 'react'
import { File, FileText, ImageOff } from 'lucide-react'

import { attachmentKind, attachmentSrc } from '@/lib/attachments'
import { renderPdfThumbnail } from '@/lib/pdf-thumbnail'
import { cn } from '@/lib/utils'

export function AttachmentThumb({
  name,
  path,
  className,
}: {
  name: string
  path: string
  className?: string
}) {
  //===> Resolve Kind & Preview <===//
  const kind = attachmentKind(name)
  const [preview, setPreview] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (kind !== 'pdf') return
    let cancelled = false
    setPreview(null)
    setFailed(false)
    renderPdfThumbnail(attachmentSrc(path))
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [kind, path])

  const frame = cn(
    'grid size-10 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-surface-2 text-fg-subtle',
    className,
  )

  //===> Image Thumbnail <===//
  if (kind === 'image' && !failed) {
    return (
      <span className={frame}>
        <img
          src={attachmentSrc(path)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      </span>
    )
  }

  //===> PDF Thumbnail <===//
  if (kind === 'pdf') {
    return (
      <span className={frame}>
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-0.5">
            <FileText className={cn('size-4', !failed && 'animate-pulse')} />
            <span className="text-[7px] font-semibold tracking-[0.08em]">PDF</span>
          </span>
        )}
      </span>
    )
  }

  //===> Generic File <===//
  const Icon = failed ? ImageOff : File
  return (
    <span className={frame}>
      <Icon className="size-4" />
    </span>
  )
}
