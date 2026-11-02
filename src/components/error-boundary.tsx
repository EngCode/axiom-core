/**======> Reference By Comment <======
 * ===> 01 - Route Error Boundary
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Button, Card } from './ui'

interface Props {
  children: ReactNode
  title?: string
}

interface State {
  error: Error | null
}

/**
 * Keeps one broken page from blanking the whole shell. The Library pulls in big
 * scan payloads, so it gets its own boundary in the route table.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <Card className="mx-auto max-w-lg p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-danger/25 bg-danger/10 text-danger">
            <TriangleAlert className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-fg">
              {this.props.title ?? 'This page could not be displayed'}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-fg-muted">
              The rest of your workspace is unaffected. Reloading the window usually clears it.
            </p>
            <p className="mt-2 break-all rounded border border-line bg-surface-2 px-2 py-1 font-mono text-[10px] text-fg-subtle">
              {this.state.error.message}
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => window.location.reload()}>
              Reload window
            </Button>
          </div>
        </div>
      </Card>
    )
  }
}
