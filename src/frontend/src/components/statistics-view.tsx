import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/matrix'
import type { Statistics } from '@/lib/types'

export function StatisticsView({ statistics }: { statistics: Statistics }) {
  const values: [string, number][] = [
    ['Max', statistics.max],
    ['Min', statistics.min],
    ['Average', statistics.average],
    ['Sum', statistics.sum],
  ]
  const diagonal: [string, boolean][] = [
    ['Original', statistics.isDiagonal.original],
    ['Q', statistics.isDiagonal.q],
    ['R', statistics.isDiagonal.r],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {values.map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-normal">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span
                className="block truncate font-mono text-xl font-semibold"
                title={String(value)}
              >
                {formatNumber(value)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Diagonal matrix:</span>
        {diagonal.map(([name, isDiagonal]) => (
          <Badge key={name} variant={isDiagonal ? 'default' : 'outline'}>
            {name}: {isDiagonal ? 'yes' : 'no'}
          </Badge>
        ))}
        <Badge variant={statistics.anyDiagonal ? 'default' : 'secondary'}>
          Any: {statistics.anyDiagonal ? 'yes' : 'no'}
        </Badge>
      </div>
    </div>
  )
}
