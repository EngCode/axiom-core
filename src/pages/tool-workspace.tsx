/**======> Reference By Comment <======
 * ===> 01 - Imports & Helpers
 * ===> 02 - Tool Controls
 * ===> 03 - Tools Page
 */

//=====> Imports & Helpers <=====//

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Download, Image as ImageIcon, Loader2, Upload } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button, Card, CardHeader, Input, PageHeader } from '@/components/ui'
import { categoryLabel, toolById, type ToolId } from '@/lib/tools'

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

//=====> Tool Workspace <=====//

export default function ToolWorkspacePage() {
  //===> Tool State <===//
  const { toolId } = useParams()
  const tool = toolById(toolId)
  const mode: ToolId = tool?.id ?? 'resize'
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [source, setSource] = useState<string | null>(null)
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const objectUrl = useRef<string | null>(null)

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
  //===> Revoke Object URLs <===//
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )

  //===> Load A File <===//
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    const url = URL.createObjectURL(file)
    objectUrl.current = url

    const next = new Image()
    next.onload = () => {
      setImage(next)
      setSource(url)
      setWidth(next.width)
      setHeight(next.height)
      setResult(null)
      setPalette([])
      setError(null)
      setFileName(file.name.replace(/\.[^.]+$/, '') || 'image')
    }
    next.onerror = () => setError('That image could not be read.')
    next.src = url
    event.target.value = ''
  }

  //===> Apply The Current Tool <===//
  function applyTool() {
    if (!image) return
    setError(null)

    //===> Palette Path <===//
    if (mode === 'palette') {
      setPalette(extractPalette(image))
      return
    }

    setBusy(true)
    try {
      const targetWidth = mode === 'resize' ? Math.max(1, width) : image.width
      const targetHeight = mode === 'resize' ? Math.max(1, height) : image.height
      const canvas = canvasFor(image, targetWidth, targetHeight)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas is not available')

      //===> Tint Composite <===//
      if (mode === 'tint') {
        context.globalCompositeOperation = 'color'
        context.globalAlpha = intensity / 100
        context.fillStyle = tint
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.globalAlpha = 1
        context.globalCompositeOperation = 'source-over'
      }

      const { mime } = formatMime(mode === 'convert' ? format : 'png')
      setResult(canvas.toDataURL(mime, quality))
    } catch (toolError) {
      setError(toolError instanceof Error ? toolError.message : String(toolError))
    } finally {
      setBusy(false)
    }
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

      {!image ? (
        <Card>
          <div className="grid place-items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-control border border-line bg-surface-2 text-fg-subtle">
              <ImageIcon className="size-5" />
            </span>
            <h2 className="mt-3 text-[14px] font-medium text-fg">Start with an image</h2>
            <p className="mt-1 max-w-sm text-[11.5px] leading-5 text-fg-muted">
              PNG, JPEG or WebP. Processing happens in a canvas in this window.
            </p>
            <label className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-control bg-accent-strong px-3 text-[12px] font-medium text-accent-fg">
              <Upload className="size-3.5" />
              Choose image
              <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
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
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
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

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={applyTool} disabled={busy}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
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

      {palette.length > 0 ? (
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
