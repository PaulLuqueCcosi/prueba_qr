import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { ApiError } from '@/lib/api-client'

/** Codes produced by this app, not the backend: their message is only a default and is always replaced. */
const CLIENT_CODES = new Set(['NETWORK_ERROR', 'TOKEN_ERROR', 'HTTP_ERROR'])

export function ErrorAlert({ error }: { error: ApiError }) {
  const { t, i18n } = useTranslation()
  // Dynamic keys (status/code come from the response), so look them up untyped.
  const lookup = t as unknown as (key: string, options?: object) => string
  const translate = (key: string, options?: object) =>
    i18n.exists(key) ? lookup(key, options) : undefined

  const isClient = error.code === 'CLIENT_VALIDATION'
  const title = isClient
    ? t('errors.clientValidation')
    : error.status === 0
      ? t('errors.titles.0')
      : `${error.status} ${translate(`errors.titles.${error.status}`) ?? t('errors.titles.default')}`

  // Known codes get translated text; the backend's own message is kept alongside it as received.
  const translated = isClient
    ? undefined
    : (translate(`errors.codes.${error.code}`) ??
      (error.code === 'HTTP_ERROR'
        ? (translate(`errors.fallback.${error.status}`) ??
          lookup('errors.fallback.default', { status: error.status }))
        : undefined))
  const showServerMessage =
    translated !== undefined &&
    !CLIENT_CODES.has(error.code) &&
    error.message !== translated

  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {translated ?? error.message}
        {!isClient && (
          <span className="ml-1 font-mono text-xs">[{error.code}]</span>
        )}
        {showServerMessage && (
          <span className="mt-1 block text-xs opacity-80">
            {t('errors.serverMessage')}: {error.message}
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}
