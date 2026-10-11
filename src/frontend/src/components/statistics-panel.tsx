import { useMemo, useState } from 'react'
import { ErrorAlert } from '@/components/error-alert'
import { SectionCard } from '@/components/section-card'
import { StatisticsView } from '@/components/statistics-view'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useApi } from '@/hooks/use-api'
import { createApiClient } from '@/lib/api-client'
import type { AppConfig } from '@/lib/config'
import { STATISTICS_EXAMPLE } from '@/lib/examples'
import { parseMatrices } from '@/lib/matrix'
import type { Matrices } from '@/lib/types'

/** Calls node-api directly (not through go-api) to show it also requires its own token. */
export function StatisticsPanel({ config }: { config: AppConfig }) {
  const client = useMemo(() => createApiClient(config), [config])
  const [text, setText] = useState(STATISTICS_EXAMPLE)
  const { data, error, loading, run, fail } = useApi(
    (token: string, matrices: Matrices) =>
      client.computeStatistics(token, matrices),
  )

  const submit = () => {
    const parsed = parseMatrices(text)
    if (!parsed.ok) return fail(parsed.message)
    void run(parsed.matrices)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        step={1}
        title="Input matrices"
        description={`Sent straight to ${config.nodeApiUrl}/api/v1/statistics, without going through go-api.`}
      >
        <div className="space-y-1.5">
          <label htmlFor="statistics-matrices" className="text-sm font-medium">
            Matrices as JSON
          </label>
          <Textarea
            id="statistics-matrices"
            aria-describedby="statistics-matrices-hint"
            className="font-mono"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p
            id="statistics-matrices-hint"
            className="text-muted-foreground text-xs"
          >
            Object with original, q and r. The API does not check that Q·R
            equals the original.
          </p>
        </div>
        {error && <ErrorAlert error={error} />}
        <Button disabled={loading} onClick={submit}>
          {loading ? 'Computing...' : 'Compute statistics'}
        </Button>
      </SectionCard>

      {loading && !data && <Skeleton className="h-40 w-full rounded-xl" />}
      {data && (
        <SectionCard
          step={2}
          title="Result"
          description="Computed over the three matrices together."
        >
          <StatisticsView statistics={data} />
        </SectionCard>
      )}
    </div>
  )
}
