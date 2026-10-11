import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/section-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppConfig } from '@/lib/config'
import { checkHealth, type HealthDetail, type HealthResult } from '@/lib/health'

type Entry = HealthResult | 'checking'

/** /health is public, so no token is requested here. */
export function HealthPanel({ config }: { config: AppConfig }) {
  const { t } = useTranslation()
  const describe = (detail: HealthDetail) =>
    detail.kind === 'http'
      ? t('health.http', { status: detail.status })
      : detail.kind === 'timeout'
        ? t('health.timeout', { ms: detail.ms })
        : `${t('health.unreachable')}${detail.reason ? ` (${detail.reason})` : ''}`
  const services = [
    { name: 'go-api', url: config.goApiUrl },
    { name: 'node-api', url: config.nodeApiUrl },
  ]
  const [results, setResults] = useState<Record<string, Entry>>({})

  const { goApiUrl, nodeApiUrl } = config
  const check = useCallback(() => {
    const targets = [
      ['go-api', goApiUrl],
      ['node-api', nodeApiUrl],
    ] as const
    setResults({ 'go-api': 'checking', 'node-api': 'checking' })
    for (const [name, url] of targets) {
      void checkHealth(url).then((result) =>
        setResults((prev) => ({ ...prev, [name]: result })),
      )
    }
  }, [goApiUrl, nodeApiUrl])

  // Auto-check on mount; each API reports as soon as it answers.
  useEffect(() => {
    check()
  }, [check])

  const checking = Object.values(results).some((r) => r === 'checking')

  return (
    <SectionCard
      step={1}
      title={t('health.title')}
      description={t('health.description')}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {services.map(({ name, url }) => {
          const entry = results[name] ?? 'checking'
          return (
            <Card key={name} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  {name}
                  {entry === 'checking' ? (
                    <Badge variant="secondary">{t('health.checking')}</Badge>
                  ) : entry.status === 'ok' ? (
                    <Badge>{t('health.ok')}</Badge>
                  ) : (
                    <Badge variant="destructive">{t('health.down')}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground truncate font-mono text-xs">
                  {url}/health
                </p>
                {entry !== 'checking' && (
                  <p>
                    {t('health.latency', { ms: entry.latencyMs })}
                    {entry.detail && (
                      <span className="text-muted-foreground">
                        {' '}
                        - {describe(entry.detail)}
                      </span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Button variant="outline" disabled={checking} onClick={check}>
        <RefreshCw aria-hidden />
        {t('health.checkAgain')}
      </Button>
    </SectionCard>
  )
}
