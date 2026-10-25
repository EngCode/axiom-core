/**======> Reference By Comment <======
 * ===> 01 - Types & Inline Grammar
 * ===> 02 - Block Parser
 * ===> 03 - Inline Renderer
 * ===> 04 - Block Renderer & Markdown Export
 */

import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { resolveDocImage, resolveDocLink } from '@/lib/docs'
import { cn } from '@/lib/utils'

type Block =
  | { kind: 'heading'; level: number; text: string; id: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'list'; ordered: boolean; items: { text: string; depth: number }[] }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'hr' }

const INLINE =
  /(`[^`]+`)|(!\[[^\]]*\]\([^)\s]+\))|(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isFence(line: string): RegExpMatchArray | null {
  return line.match(/^```(\w*)\s*$/)
}

//=====> Block Parser <=====//

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = isFence(line)
    if (fence) {
      const lang = fence[1]
      const code: string[] = []
      index += 1
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push({ kind: 'code', lang, code: code.join('\n') })
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const text = heading[2].trim()
      blocks.push({ kind: 'heading', level: heading[1].length, text, id: slugifyHeading(text) })
      index += 1
      continue
    }

    if (/^\s*---+\s*$/.test(line)) {
      blocks.push({ kind: 'hr' })
      index += 1
      continue
    }

    if (line.trim().startsWith('|') && isTableSeparator(lines[index + 1] ?? '')) {
      const header = splitRow(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(splitRow(lines[index]))
        index += 1
      }
      blocks.push({ kind: 'table', header, rows })
      continue
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: { text: string; depth: number }[] = []
      while (index < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[index])) {
        const match = lines[index].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
        if (!match) break
        const indent = match[1].replace(/\t/g, '  ').length
        let text = match[3]
        index += 1
        while (
          index < lines.length &&
          lines[index].trim() &&
          /^\s{2,}/.test(lines[index]) &&
          !/^\s*([-*]|\d+\.)\s+/.test(lines[index])
        ) {
          text += ` ${lines[index].trim()}`
          index += 1
        }
        items.push({ text, depth: Math.min(3, Math.floor(indent / 2)) })
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    if (/^>\s?/.test(line)) {
      const parts: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        parts.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push({ kind: 'quote', text: parts.join(' ') })
      continue
    }

    const parts: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|```|\||>|\s*([-*]|\d+\.)\s+|\s*---+\s*$)/.test(lines[index])
    ) {
      parts.push(lines[index].trim())
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: parts.join(' ') })
  }

  return blocks
}

//=====> Inline Renderer <=====//

function renderInline(text: string, docSlug: string, depth = 0): ReactNode[] {
  if (depth > 4) return [text]
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(INLINE)) {
    const token = match[0]
    const position = match.index ?? 0
    if (position > lastIndex) nodes.push(text.slice(lastIndex, position))

    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${position}-code`}
          className="rounded border border-line bg-surface-2 px-1 py-0.5 font-mono text-[11.5px] text-fg"
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('![')) {
      const close = token.indexOf(']')
      const alt = token.slice(2, close)
      const src = token.slice(close + 2, -1)
      const url = resolveDocImage(docSlug, src)
      nodes.push(
        url ? (
          <img
            key={`${position}-img`}
            src={url}
            alt={alt}
            className="my-3 max-w-full rounded-control border border-line"
          />
        ) : (
          <span
            key={`${position}-img`}
            className="my-2 inline-block rounded border border-dashed border-line px-2 py-1 text-[11px] text-fg-subtle"
          >
            image: {alt}
          </span>
        ),
      )
    } else if (token.startsWith('[')) {
      const close = token.indexOf(']')
      const label = token.slice(1, close)
      const href = token.slice(close + 2, -1)
      const resolved = resolveDocLink(docSlug, href)
      if (resolved.kind === 'doc') {
        nodes.push(
          <Link
            key={`${position}-link`}
            to={`/docs?doc=${encodeURIComponent(resolved.slug)}`}
            className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
          >
            {renderInline(label, docSlug, depth + 1)}
          </Link>,
        )
      } else if (resolved.kind === 'external') {
        nodes.push(
          <a
            key={`${position}-link`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
          >
            {renderInline(label, docSlug, depth + 1)}
          </a>,
        )
      } else if (resolved.kind === 'anchor') {
        nodes.push(
          <a
            key={`${position}-link`}
            href={href}
            className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
          >
            {renderInline(label, docSlug, depth + 1)}
          </a>,
        )
      } else {
        nodes.push(
          <code
            key={`${position}-file`}
            className="rounded border border-line bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-fg-muted"
          >
            {label.replace(/`/g, '')}
          </code>,
        )
      }
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${position}-bold`} className="font-medium text-fg">
          {renderInline(token.slice(2, -2), docSlug, depth + 1)}
        </strong>,
      )
    } else {
      nodes.push(
        <em key={`${position}-em`} className="text-fg-muted italic">
          {renderInline(token.slice(1, -1), docSlug, depth + 1)}
        </em>,
      )
    }

    lastIndex = position + token.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

//=====> Block Renderer <=====//

function renderBlock(block: Block, key: number, docSlug: string) {
  switch (block.kind) {
    case 'heading': {
      const content = renderInline(block.text, docSlug)
      if (block.level === 1) {
        return (
          <h1
            key={key}
            id={block.id}
            className="mt-0 mb-4 border-b border-line pb-3 font-display text-[26px] font-semibold tracking-[-0.03em] text-fg"
          >
            {content}
          </h1>
        )
      }
      if (block.level === 2) {
        return (
          <h2
            key={key}
            id={block.id}
            className="mt-8 mb-2 font-display text-[19px] font-semibold tracking-[-0.01em] text-fg"
          >
            {content}
          </h2>
        )
      }
      if (block.level === 3) {
        return (
          <h3 key={key} id={block.id} className="mt-5 mb-1.5 text-[13.5px] font-semibold text-fg">
            {content}
          </h3>
        )
      }
      return (
        <h4 key={key} id={block.id} className="mt-4 mb-1 text-[12.5px] font-semibold text-fg-muted">
          {content}
        </h4>
      )
    }
    case 'paragraph':
      return (
        <p key={key} className="my-2.5 text-[13px] leading-6 text-fg-muted">
          {renderInline(block.text, docSlug)}
        </p>
      )
    case 'code':
      return (
        <div key={key} className="my-4 overflow-hidden rounded-control border border-line">
          {block.lang ? (
            <div className="border-b border-line bg-surface-2 px-3 py-1 font-mono text-[10px] tracking-wide text-fg-subtle uppercase">
              {block.lang}
            </div>
          ) : null}
          <pre className="slim-scroll overflow-x-auto bg-surface-2/50 p-3 font-mono text-[11.5px] leading-5 text-fg">
            <code>{block.code}</code>
          </pre>
        </div>
      )
    case 'list':
      return (
        <ul
          key={key}
          className={cn(
            'my-3 space-y-1 ps-5 text-[13px] leading-6 text-fg-muted',
            block.ordered ? 'list-decimal' : 'list-disc',
          )}
        >
          {block.items.map((item, itemIndex) => (
            <li
              key={itemIndex}
              style={{ paddingLeft: item.depth * 14 }}
              className="marker:text-fg-subtle"
            >
              {renderInline(item.text, docSlug)}
            </li>
          ))}
        </ul>
      )
    case 'quote':
      return (
        <blockquote
          key={key}
          className="my-3 border-l-2 border-accent/40 ps-3 text-[12.5px] leading-6 text-fg-muted italic"
        >
          {renderInline(block.text, docSlug)}
        </blockquote>
      )
    case 'table':
      return (
        <div
          key={key}
          className="slim-scroll my-4 overflow-x-auto rounded-control border border-line"
        >
          <table className="w-full border-collapse text-start text-[12px]">
            <thead>
              <tr>
                {block.header.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    className="border-b border-line bg-surface-2 px-3 py-2 font-medium whitespace-nowrap text-fg"
                  >
                    {renderInline(cell, docSlug)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="align-top">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-line/60 px-3 py-1.5 leading-5 text-fg-muted last:border-b-0"
                    >
                      {renderInline(cell, docSlug)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'hr':
      return <hr key={key} className="my-6 border-line" />
    default:
      return null
  }
}

//=====> Markdown Export <=====//

export function Markdown({ content, docSlug }: { content: string; docSlug: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content])
  return <div className="min-w-0">{blocks.map((block, index) => renderBlock(block, index, docSlug))}</div>
}
