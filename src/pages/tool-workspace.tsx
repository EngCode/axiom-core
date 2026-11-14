/**======> Reference By Comment <======
 * ===> 01 - Imports & Helpers
 * ===> 02 - Image Processing
 * ===> 03 - Tool Controls
 * ===> 04 - Presets
 * ===> 05 - Contrast Tool
 * ===> 06 - Tool Workspace Page
 */

//=====> Imports & Helpers <=====//

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  ArrowLeftRight,
  Bookmark,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button, Card, CardHeader, Input, PageHeader } from '@/components/ui'
import { contrastRatio, contrastRating, normalizeHex, readableOn } from '@/lib/contrast'
import {
  listPresets,
  removePreset,
  savePreset,
  type ToolPreset,
  type ToolPresetValues,
} from '@/lib/tool-presets'
import {
  categoryLabel,
  toolById,
  toolRequiresImage,
  type ToolId,
} from '@/lib/tools'
import { cn, uid } from '@/lib/utils'

type OutputFormat = 'png' | 'jpeg' | 'webp'

const FORMATS: { id: OutputFormat; label: string; mime: string; ext: string }[] = [
  { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
  { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp' },
]

function formatMime(format: OutputFormat): { mime: string; ext: string } {
  const found = FORMATS.find((entry) => entry.id === format) ?? FORMATS[0]
  return { mime: found.mime, ext: found.ext }
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'image'
}

interface BatchEntry {
  id: string
  name: string
  source: string
  image: HTMLImageElement
  width: number
  height: number
}

interface BatchResult {
  dataUrl?: string
  palette?: string[]
}

interface ProcessSettings {
  width: number
  height: number
  format: OutputFormat
  quality: number
  tint: string
  intensity: number
}

//=====> Image Processing <=====//

function canvasFor(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.drawImage(image, 0, 0, width, height)
  return canvas
}

function extractPalette(image: HTMLImageElement): string[] {
  //===> Downscale For Speed <===//
  const size = 96
  const ratio = Math.min(size / image.width, size / image.height, 1)
  const canvas = canvasFor(
    image,
    Math.max(1, Math.round(image.width * ratio)),
    Math.max(1, Math.round(image.height * ratio)),
  )
  const context = canvas.getContext('2d')
  if (!context) return []

  //===> Quantize Buckets <===//
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data
  const buckets = new Map<string, number>()
  for (let index = 0; index < data.length; index += 16) {
    if (data[index + 3] < 128) continue
    const red = data[index] & 0xf0
    const green = data[index + 1] & 0xf0
    const blue = data[index + 2] & 0xf0
    const key = `#${red.toString(16).padStart(2, '0')}${green
      .toString(16)
      .padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return [...buckets.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([hex]) => hex)
}

function processImage(
  image: HTMLImageElement,
  mode: ToolId,
  settings: ProcessSettings,
  target?: { width: number; height: number },
): BatchResult {
  //===> Palette Path <===//
  if (mode === 'palette') return { palette: extractPalette(image) }

  const targetWidth =
    mode === 'resize'
      ? Math.max(1, Math.round(target?.width ?? settings.width))
      : image.width
  const targetHeight =
    mode === 'resize'
      ? Math.max(1, Math.round(target?.height ?? settings.height))
      : image.height

  const canvas = canvasFor(image, targetWidth, targetHeight)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  //===> Tint Composite <===//
  if (mode === 'tint') {
    context.globalCompositeOperation = 'color'
    context.globalAlpha = settings.intensity / 100
    context.fillStyle = settings.tint
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
  }

  const { mime } = formatMime(mode === 'convert' ? settings.format : 'png')
  return { dataUrl: canvas.toDataURL(mime, settings.quality) }
}

function loadBatchEntry(file: File): Promise<BatchEntry> {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () =>
      resolve({
        id: uid(),
        name: file.name,
        source,
        image,
        width: image.width,
        height: image.height,
      })
    image.onerror = () => {
      URL.revokeObjectURL(source)
      reject(new Error(`Could not read ${file.name}`))
    }
    image.src = source
  })
}

function triggerDownload(name: string, href: string): void {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

//=====> Tool Controls <=====//

function ToolControls({
  mode,
  width,
  height,
  lockAspect,
  format,
  quality,
  tint,
  intensity,
  image,
  onWidth,
  onHeight,
  onLock,
  onFormat,
  onQuality,
  onTint,
  onIntensity,
}: {
  mode: ToolId
  width: number
  height: number
  lockAspect: boolean
  format: OutputFormat
  quality: number
  tint: string
  intensity: number
  image: HTMLImageElement
  onWidth: (value: number) => void
  onHeight: (value: number) => void
  onLock: (value: boolean) => void
  onFormat: (value: OutputFormat) => void
  onQuality: (value: number) => void
  onTint: (value: string) => void
  onIntensity: (value: number) => void
}) {
  //===> Resize Controls <===//
  if (mode === 'resize') {
    const ratio = image.width / image.height
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
            Width
            <Input
              type="number"
              min={1}
              value={width}
              onChange={(event) => {
                const next = Number(event.target.value)
                onWidth(next)
                if (lockAspect) onHeight(Math.max(1, Math.round(next / ratio)))
              }}
              className="mt-1"
            />
          </label>
          <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
            Height
            <Input
              type="number"
              min={1}
              value={height}
              onChange={(event) => {
                const next = Number(event.target.value)
                onHeight(next)
                if (lockAspect) onWidth(Math.max(1, Math.round(next * ratio)))
              }}
              className="mt-1"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-fg-muted">
          <input
            type="checkbox"
            checked={lockAspect}
            onChange={(event) => onLock(event.target.checked)}
            className="size-3.5 accent-[var(--accent)]"
          />
          Lock aspect ratio
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => {
                onWidth(Math.max(1, Math.round((image.width * percent) / 100)))
                onHeight(Math.max(1, Math.round((image.height * percent) / 100)))
              }}
              className="rounded-control border border-line px-2 py-1 text-[10.5px] text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
            >
              {percent}%
            </button>
          ))}
        </div>
      </div>
    )
  }

  //===> Convert Controls <===//
  if (mode === 'convert') {
    return (
      <div className="space-y-3">
        <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          Format
          <select
            value={format}
            onChange={(event) => onFormat(event.target.value as OutputFormat)}
            className="mt-1 h-9 w-full rounded-control border border-line bg-surface-2 px-2 text-[12px] text-fg outline-none"
          >
            {FORMATS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        {format !== 'png' ? (
          <label className="block text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
            Quality
            <span className="float-end text-fg-muted">{Math.round(quality * 100)}%</span>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.02}
              value={quality}
              onChange={(event) => onQuality(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </label>
        ) : null}
      </div>
    )
  }

  //===> Tint Controls <===//
  if (mode === 'tint') {
    return (
      <div className="space-y-3">
        <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          Colour
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={tint}
              onChange={(event) => onTint(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded-control border border-line bg-surface-2"
            />
            <Input value={tint} onChange={(event) => onTint(event.target.value)} className="h-9" />
          </div>
        </label>
        <label className="block text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          Strength
          <span className="float-end text-fg-muted">{intensity}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={intensity}
            onChange={(event) => onIntensity(Number(event.target.value))}
            className="mt-2 w-full accent-[var(--accent)]"
          />
        </label>
      </div>
    )
  }

  //===> Palette Controls <===//
  return (
    <p className="text-[11.5px] leading-5 text-fg-muted">
      Extract the dominant colours from the image. Click a swatch to copy its hex value.
    </p>
  )
}

//=====> Presets <=====//

function PresetPanel({
  mode,
  presets,
  onApply,
  onSave,
  onRemove,
}: {
  mode: ToolId
  presets: ToolPreset[]
  onApply: (preset: ToolPreset) => void
  onSave: (name: string) => void
  onRemove: (preset: ToolPreset) => void
}) {
  const [name, setName] = useState('')

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
        <Bookmark className="size-3" />
        Presets
      </p>

      {presets.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <span
              key={preset.id}
              className="inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 py-0.5 ps-2 pe-0.5 text-[10.5px]"
            >
              <button
                type="button"
                onClick={() => onApply(preset)}
                title={`Apply ${preset.name}`}
                className="text-fg-muted transition-colors hover:text-fg"
              >
                {preset.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${preset.name}`}
                title={`Delete ${preset.name}`}
                onClick={() => onRemove(preset)}
                className="grid size-5 place-items-center rounded text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[10.5px] leading-5 text-fg-subtle">
          Save the current {mode} settings to reuse them in one click.
        </p>
      )}

      <form
        className="mt-2 flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          onSave(name.trim())
          setName('')
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Preset name"
          className="h-8"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!name.trim()}>
          <Bookmark className="size-3.5" />
          Save
        </Button>
      </form>
    </div>
  )
}

//=====> Contrast Tool <=====//

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  return (
    <label className="block text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          aria-label={`${label} colour picker`}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-control border border-line bg-surface-2"
        />
        <Input
          value={draft}
          spellCheck={false}
          onChange={(event) => {
            setDraft(event.target.value)
            const next = normalizeHex(event.target.value)
            if (next) onChange(next)
          }}
          onBlur={() => setDraft(value)}
          className="h-9 font-mono"
        />
      </div>
    </label>
  )
}

function ContrastTool() {
  //===> Colour State <===//
  const [foreground, setForeground] = useState('#111827')
  const [background, setBackground] = useState('#f9fafb')
  const [copied, setCopied] = useState(false)

  //===> Derive Ratio & Ratings <===//
  const ratio = contrastRatio(foreground, background)
  const rating = contrastRating(ratio)
  const badges = [
    { id: 'aa', label: 'AA · normal', pass: rating.aa, hint: '4.5:1' },
    { id: 'aaa', label: 'AAA · normal', pass: rating.aaa, hint: '7:1' },
    { id: 'large', label: 'AA · large', pass: rating.aaLarge, hint: '3:1' },
  ]
  const suggestion = readableOn(background)

  function update(setter: (value: string) => void, value: string) {
    setter(value)
    setCopied(false)
  }

  async function copyCss() {
    try {
      await navigator.clipboard?.writeText(
        `color: ${foreground}; background-color: ${background};`,
      )
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="p-3.5">
        <CardHeader title="Colours" hint="WCAG 2.1" />
        <div className="mt-3 space-y-3">
          <ColorField
            label="Text"
            value={foreground}
            onChange={(value) => update(setForeground, value)}
          />
          <ColorField
            label="Background"
            value={background}
            onChange={(value) => update(setBackground, value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const next = foreground
                update(setForeground, background)
                update(setBackground, next)
              }}
            >
              <ArrowLeftRight className="size-3.5" />
              Swap
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void copyCss()}>
              <Copy className="size-3.5" />
              {copied ? 'Copied' : 'Copy CSS'}
            </Button>
          </div>
          <p className="text-[10.5px] leading-5 text-fg-subtle">
            Contrast is measured for normal text at 4.5:1 (AA) and 7:1 (AAA). Large text and UI
            components only need 3:1.
          </p>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader title="Preview" hint={`${foreground} on ${background}`} />
          <div
            className="m-3 rounded-control border border-line/40 p-5"
            style={{ backgroundColor: background, color: foreground }}
          >
            <p className="text-[34px] leading-none font-semibold">Aa</p>
            <p className="mt-3 text-[13px] leading-6">
              The quick brown fox jumps over the lazy dog.
            </p>
            <p className="mt-1 text-[11px] leading-5 opacity-80">
              Small print matters too — labels, captions and helper text all need to stay legible.
            </p>
            <span
              className="mt-4 inline-flex h-8 items-center rounded-control border px-3 text-[12px] font-medium"
              style={{ borderColor: foreground }}
            >
              Button label
            </span>
          </div>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-baseline gap-2">
            <p className="text-[28px] leading-none font-semibold text-fg tabular-nums">
              {ratio.toFixed(2)}
              <span className="text-[13px] font-normal text-fg-subtle">:1</span>
            </p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                rating.aaLarge
                  ? 'bg-ok-soft text-ok'
                  : 'bg-danger-soft text-danger',
              )}
            >
              {rating.label}
            </span>
          </div>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  'rounded-control border px-2.5 py-2',
                  badge.pass
                    ? 'border-ok/25 bg-ok-soft text-ok'
                    : 'border-line bg-surface-2 text-fg-subtle',
                )}
              >
                <p className="text-[11.5px] font-medium">{badge.label}</p>
                <p className="text-[10px] opacity-80">
                  {badge.pass ? 'Pass' : 'Fail'} · {badge.hint}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-fg-subtle">
            Suggested text colour on this background:
            <span
              className="inline-block size-3 rounded-full border border-line"
              style={{ backgroundColor: suggestion }}
            />
            <span className="font-mono text-fg-muted">{suggestion}</span>
          </p>
        </Card>
      </div>
    </div>
  )
}

//=====> Tool Workspace Page <=====//

export default function ToolWorkspacePage() {
  //===> Tool State <===//
  const { toolId } = useParams()
  const tool = toolById(toolId)
  const mode: ToolId = tool?.id ?? 'resize'
  const needsImage = toolRequiresImage(mode)
  const presetsEnabled = mode === 'resize' || mode === 'convert' || mode === 'tint'

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('image')
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lockAspect, setLockAspect] = useState(true)
  const [format, setFormat] = useState<OutputFormat>('png')
  const [quality, setQuality] = useState(0.9)
  const [tint, setTint] = useState('#f5253f')
  const [intensity, setIntensity] = useState(45)
  const [result, setResult] = useState<string | null>(null)
  const [palette, setPalette] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [presets, setPresets] = useState<ToolPreset[]>(() => listPresets(mode))

  //===> Batch State <===//
  const [batch, setBatch] = useState<BatchEntry[]>([])
  const [batchResults, setBatchResults] = useState<Record<string, BatchResult>>({})
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)
  const batchRef = useRef<BatchEntry[]>([])

  //===> Remember The Last Opened Tools <===//
  useEffect(() => {
    if (!tool) return
    try {
      const current = JSON.parse(
        window.localStorage.getItem('axiom.tools.recent') ?? '[]',
      ) as string[]
      const next = [tool.id, ...current.filter((id) => id !== tool.id)].slice(0, 6)
      window.localStorage.setItem('axiom.tools.recent', JSON.stringify(next))
    } catch {
      /* storage may be unavailable */
    }
  }, [tool])

  //===> Reload Presets For This Tool <===//
  useEffect(() => {
    setPresets(listPresets(mode))
  }, [mode])

  //===> Keep Batch Ref In Sync & Revoke On Unmount <===//
  useEffect(() => {
    batchRef.current = batch
  }, [batch])

  useEffect(
    () => () => {
      batchRef.current.forEach((entry) => URL.revokeObjectURL(entry.source))
    },
    [],
  )

  //===> Activate A Batch Entry <===//
  function activate(entry: BatchEntry, existing?: BatchResult) {
    setActiveId(entry.id)
    setImage(entry.image)
    setSource(entry.source)
    setWidth(entry.width)
    setHeight(entry.height)
    setFileName(stripExtension(entry.name))
    setResult(existing?.dataUrl ?? null)
    setPalette(existing?.palette ?? [])
    setError(null)
  }

  //===> Load Files Into The Batch <===//
  async function loadFiles(fileList: FileList | null, append: boolean) {
    if (!fileList?.length) return
    const files = [...fileList].filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) {
      setError('Choose PNG, JPEG or WebP images.')
      return
    }

    setError(null)
    try {
      const entries = await Promise.all(files.map(loadBatchEntry))

      if (append) {
        const merged = [...batchRef.current, ...entries]
        batchRef.current = merged
        setBatch(merged)
        setSelected((current) => {
          const next = new Set(current)
          entries.forEach((entry) => next.add(entry.id))
          return next
        })
        if (!activeId && entries[0]) activate(entries[0])
        return
      }

      //===> Replace The Existing Queue <===//
      batchRef.current.forEach((entry) => URL.revokeObjectURL(entry.source))
      batchRef.current = entries
      setBatch(entries)
      setBatchResults({})
      setSelected(new Set(entries.map((entry) => entry.id)))
      if (entries[0]) activate(entries[0])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    }
  }

  //===> Remove A Batch Entry <===//
  function removeEntry(id: string) {
    const entry = batch.find((candidate) => candidate.id === id)
    if (entry) URL.revokeObjectURL(entry.source)

    const next = batch.filter((candidate) => candidate.id !== id)
    batchRef.current = next
    setBatch(next)
    setBatchResults((current) => {
      const rest = { ...current }
      delete rest[id]
      return rest
    })
    setSelected((current) => {
      const rest = new Set(current)
      rest.delete(id)
      return rest
    })

    if (activeId === id) {
      if (next[0]) {
        activate(next[0], batchResults[next[0].id])
      } else {
        setActiveId(null)
        setImage(null)
        setSource(null)
        setWidth(0)
        setHeight(0)
        setFileName('image')
        setResult(null)
        setPalette([])
      }
    }
  }

  //===> Switch Active Entry From The Queue <===//
  function selectEntry(entry: BatchEntry) {
    activate(entry, batchResults[entry.id])
  }

  //===> Apply The Current Tool To One Image <===//
  function applyTool() {
    if (!image) return
    setError(null)
    try {
      const next = processImage(
        image,
        mode,
        { width, height, format, quality, tint, intensity },
        { width, height },
      )
      setResult(next.dataUrl ?? null)
      setPalette(next.palette ?? [])
      if (activeId) {
        setBatchResults((current) => ({ ...current, [activeId]: next }))
      }
    } catch (toolError) {
      setError(toolError instanceof Error ? toolError.message : String(toolError))
    }
  }

  //===> Apply The Current Tool To Every Selected Image <===//
  async function applyBatch() {
    if (!image) return
    const targets = batch.filter((entry) => selected.has(entry.id))
    if (targets.length === 0) {
      setError('Select at least one image in the batch.')
      return
    }

    setError(null)
    setBatchBusy(true)
    setBatchProgress({ done: 0, total: targets.length })

    // Scale every image by the same factor as the active image.
    const scaleX = image.width > 0 ? width / image.width : 1
    const scaleY = image.height > 0 ? height / image.height : 1
    const settings: ProcessSettings = { width, height, format, quality, tint, intensity }
    const produced: Record<string, BatchResult> = {}

    try {
      for (const [index, entry] of targets.entries()) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        produced[entry.id] = processImage(entry.image, mode, settings, {
          width: entry.image.width * scaleX,
          height: entry.image.height * scaleY,
        })
        setBatchProgress({ done: index + 1, total: targets.length })
      }

      setBatchResults((current) => ({ ...current, ...produced }))
      if (activeId && produced[activeId]) {
        setResult(produced[activeId].dataUrl ?? null)
        setPalette(produced[activeId].palette ?? [])
      }
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : String(batchError))
    } finally {
      setBatchBusy(false)
      setBatchProgress(null)
    }
  }

  //===> Download Every Processed Image <===//
  function downloadAll() {
    const extension = formatMime(mode === 'convert' ? format : 'png').ext
    for (const entry of batch) {
      const dataUrl = batchResults[entry.id]?.dataUrl
      if (!dataUrl) continue
      triggerDownload(`${stripExtension(entry.name)}-axiom.${extension}`, dataUrl)
    }
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  //===> Preset Actions <===//
  function currentPresetValues(): ToolPresetValues {
    const values: ToolPresetValues = {}
    if (mode === 'resize') {
      values.width = Math.max(1, width)
      values.height = Math.max(1, height)
      values.lockAspect = lockAspect
    }
    if (mode === 'convert') {
      values.format = format
      values.quality = quality
    }
    if (mode === 'tint') {
      values.tint = tint
      values.intensity = intensity
    }
    return values
  }

  function applyPreset(preset: ToolPreset) {
    const values = preset.values
    if (typeof values.width === 'number' && values.width > 0) setWidth(values.width)
    if (typeof values.height === 'number' && values.height > 0) setHeight(values.height)
    if (typeof values.lockAspect === 'boolean') setLockAspect(values.lockAspect)
    if (values.format) setFormat(values.format)
    if (typeof values.quality === 'number') setQuality(values.quality)
    if (typeof values.tint === 'string') setTint(values.tint)
    if (typeof values.intensity === 'number') setIntensity(values.intensity)
  }

  function saveCurrentPreset(name: string) {
    setPresets(savePreset(mode, name, currentPresetValues()))
  }

  function deletePreset(preset: ToolPreset) {
    setPresets(removePreset(mode, preset.id))
  }

  //===> Copy A Hex Swatch <===//
  function copyColor(hex: string) {
    void navigator.clipboard?.writeText(hex)
  }

  const download = formatMime(mode === 'convert' ? format : 'png')

  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <Link
        to="/tools"
        className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5 rtl:rotate-180" />
        Tools
      </Link>

      <PageHeader
        eyebrow={tool ? categoryLabel(tool.category) : 'Tool'}
        title={tool?.name ?? 'Tool not found'}
        description={tool?.description ?? 'This tool does not exist.'}
      />

      {error ? (
        <Card className="border-danger/30 bg-danger/5 px-4 py-2.5 text-[11.5px] text-danger">
          {error}
        </Card>
      ) : null}

      {!needsImage ? (
        <ContrastTool />
      ) : !image ? (
        <Card>
          <div className="grid place-items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-control border border-line bg-surface-2 text-fg-subtle">
              <ImageIcon className="size-5" />
            </span>
            <h2 className="mt-3 text-[14px] font-medium text-fg">Start with an image</h2>
            <p className="mt-1 max-w-sm text-[11.5px] leading-5 text-fg-muted">
              PNG, JPEG or WebP. Choose one or several — processing happens in a canvas in this
              window.
            </p>
            <label className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-control bg-accent-strong px-3 text-[12px] font-medium text-accent-fg">
              <Upload className="size-3.5" />
              Choose images
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  void loadFiles(event.target.files, false)
                  event.target.value = ''
                }}
              />
            </label>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="p-3.5">
            <CardHeader
              title={tool?.name ?? 'Tool'}
              hint={`${image.width} × ${image.height}`}
              action={
                <label className="cursor-pointer text-[10.5px] text-accent underline decoration-accent/30 underline-offset-2">
                  Replace
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      void loadFiles(event.target.files, false)
                      event.target.value = ''
                    }}
                  />
                </label>
              }
            />
            <div className="mt-3">
              <ToolControls
                mode={mode}
                width={width}
                height={height}
                lockAspect={lockAspect}
                format={format}
                quality={quality}
                tint={tint}
                intensity={intensity}
                image={image}
                onWidth={setWidth}
                onHeight={setHeight}
                onLock={setLockAspect}
                onFormat={setFormat}
                onQuality={setQuality}
                onTint={setTint}
                onIntensity={setIntensity}
              />
            </div>

            {presetsEnabled ? (
              <PresetPanel
                mode={mode}
                presets={presets}
                onApply={applyPreset}
                onSave={saveCurrentPreset}
                onRemove={deletePreset}
              />
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={applyTool}>
                {mode === 'palette' ? 'Extract colours' : 'Apply'}
              </Button>
              {result ? (
                <a
                  href={result}
                  download={`${fileName}-axiom.${download.ext}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface-2 px-2.5 text-[11.5px] text-fg transition-colors hover:border-line-strong hover:bg-surface-3"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Preview" hint={result ? 'result' : 'source'} />
            <div className="grid min-h-[320px] place-items-center bg-[repeating-conic-gradient(var(--surface-2)_0%_25%,var(--surface)_0%_50%)] bg-[length:18px_18px] p-4">
              <img
                src={result ?? source ?? ''}
                alt={result ? 'Processed preview' : 'Source preview'}
                className="max-h-[520px] max-w-full object-contain"
              />
            </div>
          </Card>
        </div>
      )}

      {needsImage && batch.length > 0 ? (
        <Card>
          <CardHeader
            title="Batch"
            hint={
              batchProgress
                ? `processing ${batchProgress.done}/${batchProgress.total}`
                : `${batch.length} image${batch.length === 1 ? '' : 's'}`
            }
            action={
              <label className="cursor-pointer text-[10.5px] text-accent underline decoration-accent/30 underline-offset-2">
                Add images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    void loadFiles(event.target.files, true)
                    event.target.value = ''
                  }}
                />
              </label>
            }
          />

          <div className="space-y-1.5 px-3 pb-3">
            {batch.map((entry) => {
              const produced = batchResults[entry.id]
              const included = selected.has(entry.id)
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-2 rounded-control border px-2 py-1.5 text-[11px] transition-colors',
                    entry.id === activeId
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-line/70 bg-surface-2/40',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => toggleSelected(entry.id)}
                    aria-label={`Include ${entry.name}`}
                    className="size-3.5 shrink-0 accent-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => selectEntry(entry)}
                    aria-label={`Edit ${entry.name}`}
                    className="size-9 shrink-0 overflow-hidden rounded-control border border-line bg-surface-2"
                  >
                    <img src={entry.source} alt="" className="size-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectEntry(entry)}
                    className="min-w-0 flex-1 truncate text-start text-fg-muted transition-colors hover:text-fg"
                    title={entry.name}
                  >
                    {entry.name}
                  </button>
                  <span className="shrink-0 text-[10px] text-fg-subtle tabular-nums">
                    {entry.width} × {entry.height}
                  </span>
                  {produced ? (
                    produced.dataUrl ? (
                      <a
                        href={produced.dataUrl}
                        download={`${stripExtension(entry.name)}-axiom.${download.ext}`}
                        aria-label={`Download ${entry.name}`}
                        title="Download result"
                        className="grid size-6 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
                      >
                        <Download className="size-3" />
                      </a>
                    ) : (
                      <span className="shrink-0 text-[10px] text-ok">
                        {produced.palette?.length ?? 0} colours
                      </span>
                    )
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${entry.name}`}
                    title="Remove from batch"
                    onClick={() => removeEntry(entry.id)}
                    className="grid size-6 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => void applyBatch()}
              disabled={batchBusy}
            >
              {batchBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {mode === 'palette' ? 'Extract from selected' : 'Apply to selected'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={downloadAll}
              disabled={!Object.values(batchResults).some((entry) => entry.dataUrl)}
            >
              <Download className="size-3.5" />
              Download all
            </Button>
            <span className="ms-auto text-[10.5px] text-fg-subtle">
              {selected.size} of {batch.length} selected
            </span>
          </div>
        </Card>
      ) : null}

      {needsImage && palette.length > 0 ? (
        <Card>
          <CardHeader title="Palette" hint="click to copy" />
          <div className="grid grid-cols-5 gap-2 px-3 pb-3 sm:grid-cols-10">
            {palette.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => copyColor(hex)}
                className="group overflow-hidden rounded-control border border-line text-center"
                title={`Copy ${hex}`}
              >
                <span className="block h-10" style={{ backgroundColor: hex }} />
                <span className="block px-1 py-1 font-mono text-[9px] text-fg-subtle group-hover:text-fg">
                  {hex}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
