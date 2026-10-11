import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { formatNumber } from '@/lib/matrix'
import type { Matrix } from '@/lib/types'

interface MatrixTableProps {
  title: string
  caption: string
  matrix: Matrix
}

export function MatrixTable({ title, caption, matrix }: MatrixTableProps) {
  const { t } = useTranslation()
  const rows = matrix.length
  const columns = matrix[0]?.length ?? 0

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">
            {title}{' '}
            <span className="text-muted-foreground font-normal">
              ({rows}x{columns})
            </span>
          </h3>
          <p className="text-muted-foreground text-xs">{caption}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('matrixTable.copyAria', { title })}
          onClick={() =>
            void navigator.clipboard?.writeText(JSON.stringify(matrix))
          }
        >
          {t('matrixTable.copyJson')}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableBody>
            {matrix.map((row, i) => (
              <TableRow key={i}>
                {row.map((value, j) => (
                  // The title holds the full-precision value; the cell shows it rounded.
                  <TableCell
                    key={j}
                    title={String(value)}
                    className="font-mono"
                  >
                    {formatNumber(value)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
