import { TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface BoundaryProps {
  fallback: (reset: () => void) => ReactNode
  /** When this changes (e.g. a new response), a previous render error is forgotten. */
  resetKey?: unknown
  children: ReactNode
}

class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the cause visible in the console for debugging; the UI stays friendly.
    console.error('Results failed to render', error, info.componentStack)
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    return this.state.failed
      ? this.props.fallback(() => this.setState({ failed: false }))
      : this.props.children
  }
}

/** Shows a translated error instead of a blank screen if rendering the results throws. */
export function ResultsBoundary({
  resetKey,
  children,
}: {
  resetKey?: unknown
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Boundary
      resetKey={resetKey}
      fallback={(reset) => (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex gap-3 rounded-xl border p-4 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-2">
            <p className="font-medium">{t('errors.renderTitle')}</p>
            <p>{t('errors.renderBody')}</p>
            <Button variant="outline" size="sm" onClick={reset}>
              {t('errors.renderRetry')}
            </Button>
          </div>
        </div>
      )}
    >
      {children}
    </Boundary>
  )
}
