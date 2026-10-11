import { useMemo, useState } from 'react'
import { ErrorAlert } from '@/components/error-alert'
import { MatrixTable } from '@/components/matrix-table'
import { SectionCard } from '@/components/section-card'
import { StatisticsView } from '@/components/statistics-view'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useApi } from '@/hooks/use-api'
import { createApiClient } from '@/lib/api-client'
import type { AppConfig } from '@/lib/config'
import { MATRIX_EXAMPLES } from '@/lib/examples'
import { parseMatrix } from '@/lib/matrix'
import type { Matrix } from '@/lib/types'

export function QrPanel({ config }: { config: AppConfig }) {
  const client = useMemo(() => createApiClient(config), [config])
  const [text, setText] = useState(MATRIX_EXAMPLES[0].value)
  const { data, error, loading, run, fail } = useApi(
    (token: string, matrix: Matrix) => client.computeQr(token, matrix),
  )

  const submit = () => {
    const parsed = parseMatrix(text)
    if (!parsed.ok) return fail(parsed.message)
    void run(parsed.matrix)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        step={1}
        title="Input matrix"
        description={`Sent to ${config.goApiUrl}/api/v1/qr. Pick an example or type your own.`}
      >
        <div className="flex flex-wrap gap-2">
          {MATRIX_EXAMPLES.map((example) => (
            <Button
              key={example.label}
              variant="outline"
              size="sm"
              onClick={() => setText(example.value)}
            >
              {example.label}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="qr-matrix" className="text-sm font-medium">
            Matrix as JSON
          </label>
          <Textarea
            id="qr-matrix"
            aria-describedby="qr-matrix-hint"
            className="font-mono"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p id="qr-matrix-hint" className="text-muted-foreground text-xs">
            Array of rows, e.g. [[1,2],[3,4]]. Every row needs the same number
            of values.
          </p>
        </div>
        {error && <ErrorAlert error={error} />}
        <Button disabled={loading} onClick={submit}>
          {loading ? 'Computing...' : 'Compute QR'}
        </Button>
      </SectionCard>

      {loading && !data && <Skeleton className="h-48 w-full rounded-xl" />}
      {data && (
        <SectionCard
          step={2}
          title="Result"
          description="Statistics cover the original matrix, Q and R together."
        >
          <StatisticsView statistics={data.statistics} />
          <div className="grid gap-4 xl:grid-cols-3">
            <MatrixTable
              title="Original (A)"
              caption="The matrix you sent."
              matrix={data.original}
            />
            <MatrixTable
              title="Q"
              caption="Orthogonal: Qᵀ·Q = I."
              matrix={data.q}
            />
            <MatrixTable
              title="R"
              caption="Upper triangular, so A = Q·R."
              matrix={data.r}
            />
          </div>
        </SectionCard>
      )}
    </div>
  )
}
