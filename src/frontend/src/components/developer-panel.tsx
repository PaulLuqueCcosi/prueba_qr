import type { TFunction } from 'i18next'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccessToken } from '@/hooks/use-api'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { decodeJwtClaims, type TokenClaims } from '@/lib/token'

function formatRemaining(
  t: TFunction,
  exp: number | undefined,
  now: number,
): string {
  if (!exp) return t('developer.unknown')
  const seconds = Math.floor(exp - now / 1000)
  return seconds > 0
    ? t('developer.secondsLeft', { seconds })
    : t('developer.expired')
}

/** Helper for testing with Postman/Swagger: shows the token claims and copies the token on demand. */
export function DeveloperPanel() {
  const { t } = useTranslation()
  const getToken = useAccessToken()
  const [claims, setClaims] = useState<TokenClaims | null>(null)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // The token is read, used and dropped; only the decoded claims are kept for display.
  const loadClaims = async () => {
    try {
      const token = await getToken()
      setClaims(decodeJwtClaims(token))
      setMessage('')
    } catch {
      setMessage(t('developer.couldNotGet'))
    }
  }

  const copyToken = async () => {
    try {
      const token = await getToken()
      await navigator.clipboard.writeText(token)
      setClaims(decodeJwtClaims(token))
      setMessage(t('developer.copied'))
    } catch {
      setMessage(t('developer.couldNotCopy'))
    }
  }

  return (
    <SectionCard
      step={1}
      title={t('developer.title')}
      description={t('developer.description')}
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyToken}>
          {t('developer.copy')}
        </Button>
        <Button variant="outline" size="sm" onClick={loadClaims}>
          {t('developer.showClaims')}
        </Button>
      </div>
      <p role="status" className="text-muted-foreground min-h-5 text-sm">
        {message}
      </p>
      {claims && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs break-all">
          <dt className="text-muted-foreground">aud</dt>
          <dd>{[claims.aud].flat().join(', ')}</dd>
          <dt className="text-muted-foreground">scope</dt>
          <dd>{claims.scope}</dd>
          <dt className="text-muted-foreground">exp</dt>
          <dd>{formatRemaining(t, claims.exp, now)}</dd>
        </dl>
      )}
    </SectionCard>
  )
}
