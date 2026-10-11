import { Minus, Plus } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAX_SIZE, MIN_SIZE, resizeGrid, type Grid } from '@/lib/grid'

interface MatrixInputProps {
  grid: Grid
  onChange: (grid: Grid) => void
  /** Cells flagged by validation, as [row, column]. */
  invalid: [number, number][]
}

function Stepper({
  label,
  addLabel,
  removeLabel,
  value,
  onChange,
}: {
  label: string
  addLabel: string
  removeLabel: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <span className="text-sm font-medium">{label}</span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={removeLabel}
        disabled={value <= MIN_SIZE}
        onClick={() => onChange(value - 1)}
      >
        <Minus aria-hidden />
      </Button>
      <output aria-label={label} className="w-6 text-center font-mono text-sm">
        {value}
      </output>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={addLabel}
        disabled={value >= MAX_SIZE}
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  )
}

/** Editable rows x columns grid. Rectangular by construction, so only cell values need validating. */
export function MatrixInput({ grid, onChange, invalid }: MatrixInputProps) {
  const { t } = useTranslation()
  const rows = grid.length
  const columns = grid[0]?.length ?? 0
  const container = useRef<HTMLDivElement>(null)

  const focusCell = (r: number, c: number) => {
    const el = container.current?.querySelector<HTMLInputElement>(
      `[data-cell="${r}-${c}"]`,
    )
    el?.focus()
    el?.select()
  }

  const setCell = (r: number, c: number, value: string) =>
    onChange(grid.map((row, i) => (i === r ? row.with(c, value) : row)))

  // Arrow keys move between cells; left/right only at the text edge so caret editing still works.
  const onKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number,
  ) => {
    const { selectionStart, selectionEnd, value } = e.currentTarget
    const atStart = selectionStart === 0 && selectionEnd === 0
    const atEnd =
      selectionStart === value.length && selectionEnd === value.length
    const move = (dr: number, dc: number) => {
      e.preventDefault()
      focusCell(r + dr, c + dc)
    }
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
      if (r < rows - 1) move(1, 0)
      else if (e.key === 'Enter') e.preventDefault()
    } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      if (r > 0) move(-1, 0)
    } else if (e.key === 'ArrowRight' && atEnd && c < columns - 1) move(0, 1)
    else if (e.key === 'ArrowLeft' && atStart && c > 0) move(0, -1)
  }

  const isInvalid = (r: number, c: number) =>
    invalid.some(([ir, ic]) => ir === r && ic === c)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stepper
          label={t('grid.rows')}
          addLabel={t('grid.addRow')}
          removeLabel={t('grid.removeRow')}
          value={rows}
          onChange={(n) => onChange(resizeGrid(grid, n, columns))}
        />
        <Stepper
          label={t('grid.columns')}
          addLabel={t('grid.addColumn')}
          removeLabel={t('grid.removeColumn')}
          value={columns}
          onChange={(n) => onChange(resizeGrid(grid, rows, n))}
        />
        <span className="text-muted-foreground text-xs">
          {t('grid.size', { rows, columns, max: MAX_SIZE })}
        </span>
      </div>
      {/* The grid scrolls inside this box so a wide matrix never scrolls the page. */}
      <div
        ref={container}
        role="group"
        aria-label={t('grid.matrixValues')}
        className="max-w-full overflow-x-auto rounded-md border p-2"
      >
        <div
          className="grid w-max gap-1.5"
          style={{ gridTemplateColumns: `repeat(${columns}, 4.5rem)` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <Input
                key={`${r}-${c}`}
                data-cell={`${r}-${c}`}
                inputMode="decimal"
                autoComplete="off"
                aria-label={t('grid.cell', { row: r + 1, column: c + 1 })}
                aria-invalid={isInvalid(r, c) || undefined}
                className="px-1.5 text-center font-mono"
                value={cell}
                onChange={(e) => setCell(r, c, e.target.value)}
                onKeyDown={(e) => onKeyDown(e, r, c)}
                onFocus={(e) => e.currentTarget.select()}
              />
            )),
          )}
        </div>
      </div>
    </div>
  )
}
