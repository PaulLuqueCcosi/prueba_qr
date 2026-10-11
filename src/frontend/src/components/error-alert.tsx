import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { ApiError } from '@/lib/api-client'

const TITLES: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  413: 'Payload too large',
  422: 'Invalid matrix',
  502: 'Upstream unavailable',
}

function titleFor(error: ApiError): string {
  if (error.code === 'CLIENT_VALIDATION') return 'Invalid input'
  if (error.status === 0) return 'Cannot reach the API'
  return `${error.status} ${TITLES[error.status] ?? 'Error'}`
}

export function ErrorAlert({ error }: { error: ApiError }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{titleFor(error)}</AlertTitle>
      <AlertDescription>
        {error.message}
        {error.code !== 'CLIENT_VALIDATION' && (
          <span className="ml-1 font-mono text-xs">[{error.code}]</span>
        )}
      </AlertDescription>
    </Alert>
  )
}
