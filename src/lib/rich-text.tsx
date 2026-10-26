/**======> Reference By Comment <======
 * ===> 01 - Detection & Sanitising
 * ===> 02 - Markdown Bridge
 * ===> 03 - Rich Text Editor
 * ===> 04 - Rich Content
 */

//=====> Detection & Sanitising <=====//

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline,
} from 'lucide-react'

import { cn } from './utils'

const HTML_PATTERN = /<(p|div|h[1-6]|ul|ol|li|br|strong|em|b|i|u|blockquote|pre|code|a|span)\b/i

export function isHtml(value: string): boolean {
  return HTML_PATTERN.test(value)
}

export function sanitizeHtml(value: string): string {
  //===> Guard Clause: Non-Browser Context <===//
  if (typeof DOMParser === 'undefined') return value

  const parsed = new DOMParser().parseFromString(value, 'text/html')
  parsed
    .querySelectorAll('script, style, iframe, object, embed, link, meta, form, input')
    .forEach((node) => node.remove())

  parsed.body.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on')) element.removeAttribute(attribute.name)
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attribute.value)) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  return parsed.body.innerHTML
}

export function plainText(value: string): string {
  //===> Guard Clause: Already Plain <===//
  if (!isHtml(value)) return value
  if (typeof document === 'undefined') return value.replace(/<[^>]+>/g, ' ')

  const container = document.createElement('div')
  container.innerHTML = value
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim()
}

//=====> Markdown Bridge <=====//

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

/** Minimal Markdown → HTML for existing notes/documents before the first rich edit. */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let list: 'ul' | 'ol' | null = null
  let paragraph: string[] = []

  function flushParagraph() {
    if (paragraph.length === 0) return
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  function closeList() {
    if (!list) return
    html.push(`</${list}>`)
    list = null
  }

  for (const line of lines) {
    //===> Headings <===//
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    //===> Lists <===//
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      if (list !== 'ul') {
        closeList()
        html.push('<ul>')
        list = 'ul'
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`)
      continue
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      if (list !== 'ol') {
        closeList()
        html.push('<ol>')
        list = 'ol'
      }
      html.push(`<li>${inlineMarkdown(numbered[1])}</li>`)
      continue
    }

    //===> Quote <===//
    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      flushParagraph()
      closeList()
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`)
      continue
    }

    //===> Blank & Paragraph <===//
    if (line.trim() === '') {
      flushParagraph()
      closeList()
      continue
    }

    closeList()
    paragraph.push(line.trim())
  }

  flushParagraph()
  closeList()
  return html.join('\n')
}

function toInitialHtml(value: string): string {
  return isHtml(value) ? sanitizeHtml(value) : markdownToHtml(value)
}

//=====> Rich Text Editor <=====//

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-control text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  className,
  minHeight = 96,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: number
}) {
  //===> Editor Ref & Focus <===//
  const editor = useRef<HTMLDivElement>(null)
  const focused = useRef(false)

  //===> Hydrate From External Changes <===//
  useEffect(() => {
    if (!editor.current || focused.current) return
    const next = toInitialHtml(value)
    if (editor.current.innerHTML !== next) editor.current.innerHTML = next
  }, [value])

  //===> Execute Toolbar Commands <===//
  function run(command: string, argument?: string) {
    editor.current?.focus()
    document.execCommand(command, false, argument)
    onChange(editor.current?.innerHTML ?? '')
  }

  function addLink() {
    const url = window.prompt('Link URL')
    if (!url) return
    run('createLink', url)
  }

  //===> Render Editor <===//
  return (
    <div className={cn('rounded-control border border-line bg-surface-2/30', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        <ToolButton label="Bold" onClick={() => run('bold')}>
          <Bold className="size-3.5" />
        </ToolButton>
        <ToolButton label="Italic" onClick={() => run('italic')}>
          <Italic className="size-3.5" />
        </ToolButton>
        <ToolButton label="Underline" onClick={() => run('underline')}>
          <Underline className="size-3.5" />
        </ToolButton>
        <span className="mx-1 h-4 w-px bg-line" />
        <ToolButton label="Heading" onClick={() => run('formatBlock', 'h2')}>
          <Heading2 className="size-3.5" />
        </ToolButton>
        <ToolButton label="Bullet list" onClick={() => run('insertUnorderedList')}>
          <List className="size-3.5" />
        </ToolButton>
        <ToolButton label="Numbered list" onClick={() => run('insertOrderedList')}>
          <ListOrdered className="size-3.5" />
        </ToolButton>
        <ToolButton label="Quote" onClick={() => run('formatBlock', 'blockquote')}>
          <Quote className="size-3.5" />
        </ToolButton>
        <ToolButton label="Link" onClick={addLink}>
          <Link2 className="size-3.5" />
        </ToolButton>
      </div>

      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        dir="auto"
        data-placeholder={placeholder}
        onFocus={() => {
          focused.current = true
        }}
        onBlur={() => {
          focused.current = false
        }}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="rich-editor rich-text w-full px-3 py-2 text-[13px] leading-6 text-fg outline-none"
        style={{ minHeight }}
      />
    </div>
  )
}

//=====> Rich Content <=====//

export function RichContent({ content, className }: { content: string; className?: string }) {
  //===> Render Sanitised HTML <===//
  const html = useMemo(() => (isHtml(content) ? sanitizeHtml(content) : markdownToHtml(content)), [content])

  return (
    <div
      className={cn('rich-text', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
