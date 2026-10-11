import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/matrix'
import type { Statistics } from '@/lib/types'

export function StatisticsView({ statistics }: { statistics: Statistics }) {
  const { t } = useTranslation()
  const values: [string, number][] = [
    [t('stats.max'), statistics.max],
    [t('stats.min'), statistics.min],
    [t('stats.average'), statistics.average],
    [t('stats.sum'), statistics.sum],
  ]
  const diagonal: [string, boolean][] = [
    [t('stats.original'), statistics.isDiagonal.original],
    ['Q', statistics.isDiagonal.q],
    ['R', statistics.isDiagonal.r],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {values.map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-normal">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span
                className="block truncate font-mono text-2xl font-semibold"
                title={String(value)}
              >
                {formatNumber(value)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {t('stats.diagonalQuestion')}
        </span>
        {diagonal.map(([name, isDiagonal]) => (
          <Badge key={name} variant={isDiagonal ? 'default' : 'outline'}>
            {t('stats.badge', {
              name,
              answer: isDiagonal ? t('stats.yes') : t('stats.no'),
            })}
          </Badge>
        ))}
        <Badge variant={statistics.anyDiagonal ? 'default' : 'secondary'}>
          {t('stats.badge', {
            name: t('stats.any'),
            answer: statistics.anyDiagonal ? t('stats.yes') : t('stats.no'),
          })}
        </Badge>
      </div>
    </div>
  )
}
