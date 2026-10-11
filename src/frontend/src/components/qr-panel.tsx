import { Dices, Eraser } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorAlert } from '@/components/error-alert'
import { MatrixInput } from '@/components/matrix-input'
import { MatrixTable } from '@/components/matrix-table'
import { SectionCard } from '@/components/section-card'
import { StatisticsView } from '@/components/statistics-view'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/use-api'
import { createApiClient } from '@/lib/api-client'
import type { AppConfig } from '@/lib/config'
import { MATRIX_EXAMPLES } from '@/lib/examples'
import {
  createGrid,
  gridToMatrix,
  jsonToGrid,
  randomGrid,
  type Grid,
} from '@/lib/grid'
import { translateIssue } from '@/lib/issue'
import type { Matrix } from '@/lib/types'

export function QrPanel({ config }: { config: AppConfig }) {
  const { t } = useTranslation()
  const client = useMemo(() => createApiClient(config), [config])
  const [grid, setGrid] = useState<Grid>(() =>
    jsonToGrid(MATRIX_EXAMPLES[0].value),
  )
  const [invalid, setInvalid] = useState<[number, number][]>([])
  const { data, error, loading, run, fail } = useApi(
    (token: string, matrix: Matrix) => client.computeQr(token, matrix),
  )

  // Any edit makes the previous cell flags stale, so they are cleared with it.
  const update = (next: Grid) => {
    setGrid(next)
    setInvalid([])
  }

  const submit = () => {
    const parsed = gridToMatrix(grid)
    if (!parsed.ok) {
      setInvalid(parsed.invalid)
      return fail(translateIssue(t, parsed.issue))
    }
    setInvalid([])
    void run(parsed.matrix)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        step={1}
        title={t('qr.inputTitle')}
        description={t('qr.inputDescription', { url: config.goApiUrl })}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <MatrixInput grid={grid} onChange={update} invalid={invalid} />
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  update(randomGrid(grid.length, grid[0]?.length ?? 1))
                }
              >
                <Dices aria-hidden />
                {t('qr.random')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update(createGrid(grid.length, grid[0]?.length ?? 1))
                }
              >
                <Eraser aria-hidden />
                {t('qr.clear')}
              </Button>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t('qr.examples')}</p>
              <div className="flex flex-wrap gap-2">
                {MATRIX_EXAMPLES.map((example) => (
                  <Button
                    key={example.id}
                    variant="outline"
                    size="sm"
                    onClick={() => update(jsonToGrid(example.value))}
                  >
                    {t(`examples.${example.id}`)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {error && <ErrorAlert error={error} />}
        <Button disabled={loading} onClick={submit}>
          {loading ? t('qr.computing') : t('qr.compute')}
        </Button>
      </SectionCard>

      {loading && !data && <Skeleton className="h-48 w-full rounded-xl" />}
      {data && (
        <>
          <SectionCard
            step={2}
            title={t('qr.statisticsTitle')}
            description={t('qr.statisticsDescription')}
          >
            <StatisticsView statistics={data.statistics} />
          </SectionCard>
          <SectionCard
            step={3}
            title={t('qr.matricesTitle')}
            description={t('qr.matricesDescription')}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MatrixTable
                title="Q"
                caption={t('qr.qCaption')}
                matrix={data.q}
              />
              <MatrixTable
                title="R"
                caption={t('qr.rCaption')}
                matrix={data.r}
              />
              <MatrixTable
                title={t('qr.originalTitle')}
                caption={t('qr.originalCaption')}
                matrix={data.original}
              />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
