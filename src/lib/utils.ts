/**======> Reference By Comment <======
 * ===> 01 - Class Merging
 * ===> 02 - Date Helpers
 * ===> 03 - Formatting Helpers
 * ===> 04 - Identity Helpers
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const MS_PER_DAY = 86_400_000

/** Local calendar date as YYYY-MM-DD (never UTC-shifted). */
export function localISODate(date = new Date()): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** A YYYY-MM-DD string expressed as a UTC timestamp, so day math ignores DST. */
function dayStamp(value: string): number {
  const [y, m, d] = value.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Local-midnight Date for a YYYY-MM-DD string (safe for display formatting). */
export function localDateFromISO(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysISO(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  return localISODate(date)
}

export function daysFromToday(value: string): number {
  return Math.round((dayStamp(value) - dayStamp(localISODate())) / MS_PER_DAY)
}

export function isDueThisWeek(value: string | null): boolean {
  if (!value) return false
  const diff = daysFromToday(value)
  return diff >= 0 && diff <= 7
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later'

export function describeDue(value: string): { label: string; tone: DueTone } {
  const diff = daysFromToday(value)
  if (diff < 0) {
    return { label: diff === -1 ? '1d overdue' : `${Math.abs(diff)}d overdue`, tone: 'overdue' }
  }
  if (diff === 0) return { label: 'Today', tone: 'today' }
  if (diff === 1) return { label: 'Tomorrow', tone: 'soon' }
  if (diff <= 6) {
    return {
      label: localDateFromISO(value).toLocaleDateString(undefined, { weekday: 'short' }),
      tone: 'soon',
    }
  }
  return {
    label: localDateFromISO(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    tone: 'later',
  }
}

export function formatDate(value: string | null, style: 'short' | 'long' = 'short'): string {
  if (!value) return '—'
  const date = value.length === 10 ? localDateFromISO(value) : new Date(value)
  if (style === 'long') {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatRelative(value: string): string {
  const then = new Date(value).getTime()
  const diff = Date.now() - then
  if (Number.isNaN(then)) return ''
  if (diff < 45_000) return 'just now'
  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(new Date(then).toISOString(), 'short')
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return 'Working late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function truncate(text: string, length: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > length ? `${clean.slice(0, length).trimEnd()}…` : clean
}

export function projectKeyFromName(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'PROJ'
  if (words.length === 1) return words[0].slice(0, 4)
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}
