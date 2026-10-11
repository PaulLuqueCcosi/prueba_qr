import { useEffect, useState } from 'react'
import { useAccessToken } from '@/hooks/use-api'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { decodeJwtClaims, type TokenClaims } from '@/lib/token'

function formatRemaining(exp: number | undefined, now: number): string {
  if (!exp) return 'unknown'
  const seconds = Math.floor(exp - now / 1000)
  return seconds > 0 ? `${seconds}s left` : 'expired'
}

/** Helper for testing with Postman/Swagger: shows the token claims and copies the token on demand. */
export function DeveloperPanel() {
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
      setMessage('Could not get an access token.')
    }
  }

  const copyToken = async () => {
    try {
      const token = await getToken()
      await navigator.clipboard.writeText(token)
      setClaims(decodeJwtClaims(token))
      setMessage('Access token copied to the clipboard.')
    } catch {
      setMessage('Could not copy the access token.')
    }
  }

  return (
    <SectionCard
      step={1}
      title="Access token"
      description="Copy a fresh token to call the APIs from Postman or Swagger. The token itself is never displayed."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyToken}>
          Copy access token
        </Button>
        <Button variant="outline" size="sm" onClick={loadClaims}>
          Show claims
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
          <dd>{formatRemaining(claims.exp, now)}</dd>
        </dl>
      )}
    </SectionCard>
  )
}
