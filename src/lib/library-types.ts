export type MediaFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi'
  | 'boolean'
  | 'url'

export interface MediaField {
  key: string
  label: string
  type: MediaFieldType
  options?: string[]
  required?: boolean
  showInList?: boolean
}

export type ProgressUnit = 'none' | 'episode' | 'hour' | 'page'

export type MediaStatus =
  | 'wishlist'
  | 'downloading'
  | 'acquired'
  | 'in_progress'
  | 'completed'
  | 'dropped'

export type VolumeKind = 'internal' | 'external' | 'network'

export interface MediaKind {
  id: string
  key: string
  name: string
  icon: string
  color: string
  sortOrder: number
  hidden: boolean
  progressUnit: ProgressUnit
  fields: MediaField[]
}

export interface MediaItem {
  id: string
  kindId: string
  title: string
  sortTitle: string | null
  originalTitle: string | null
  year: number | null
  status: MediaStatus
  rating: number | null
  notes: string
  attributes: Record<string, unknown>
  coverPath: string | null
  providerIds: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Volume {
  id: string
  label: string
  volumeGuid: string | null
  serial: string | null
  capacityBytes: number | null
  mountPath: string | null
  type: VolumeKind
  lastSeenAt: string | null
}

export interface MediaCopy {
  id: string
  itemId: string
  volumeId: string
  /** Path relative to the volume root — never an absolute drive letter. */
  relPath: string
  sizeBytes: number | null
  quality: string | null
  source: string | null
  hash: string | null
  firstSeenAt: string
  lastSeenAt: string | null
  missingAt: string | null
}

export interface MediaProgress {
  itemId: string
  unit: ProgressUnit
  position: number
  total: number | null
  updatedAt: string
}

export interface LibrarySnapshot {
  kinds: MediaKind[]
  items: MediaItem[]
  copies: MediaCopy[]
  volumes: Volume[]
  progress: MediaProgress[]
}
