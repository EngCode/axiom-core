import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { Status } from './types'
import { isEditableTarget } from './utils'

export interface IssueDialogConfig {
  issueId?: string | null
  status?: Status
  projectId?: string | null
}

interface IssueDialogState {
  open: boolean
  issueId: string | null
  status?: Status
  projectId?: string | null
}

interface UIContextValue {
  paletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
  issueDialog: IssueDialogState
  openIssueDialog: (config?: IssueDialogConfig) => void
  closeIssueDialog: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

const CLOSED_DIALOG: IssueDialogState = { open: false, issueId: null }

export function UIProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [issueDialog, setIssueDialog] = useState<IssueDialogState>(CLOSED_DIALOG)

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  const openIssueDialog = useCallback((config?: IssueDialogConfig) => {
    setIssueDialog({
      open: true,
      issueId: config?.issueId ?? null,
      status: config?.status,
      projectId: config?.projectId,
    })
  }, [])

  const closeIssueDialog = useCallback(() => setIssueDialog(CLOSED_DIALOG), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (modifier && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setIssueDialog((current) =>
          current.open ? current : { open: true, issueId: null },
        )
        return
      }
      if (event.key === 'c' && !modifier && !isEditableTarget(event.target)) {
        const target = event.target as HTMLElement | null
        if (target?.dataset?.shortcuts === 'off') return
        event.preventDefault()
        setIssueDialog((current) =>
          current.open ? current : { open: true, issueId: null },
        )
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const value = useMemo<UIContextValue>(
    () => ({
      paletteOpen,
      openPalette,
      closePalette,
      issueDialog,
      openIssueDialog,
      closeIssueDialog,
    }),
    [paletteOpen, openPalette, closePalette, issueDialog, openIssueDialog, closeIssueDialog],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI must be used inside <UIProvider>')
  return context
}
