import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Cells of the 3x3 grid that belong to the upper triangle, i.e. the shape of R. */
const UPPER: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 1],
  [1, 2],
  [2, 2],
]
const LOWER: [number, number][] = [
  [1, 0],
  [2, 0],
  [2, 1],
]
const origin = (index: number) => 5 + index * 8

/**
 * Matrix QR mark: a rounded square with a 3x3 grid cut out of it. The six
 * upper-triangular cells are solid openings (R, the triangular factor) and the
 * three lower ones are faint dots (the zeros). It paints with `currentColor`
 * and the page shows through the cut-outs, so it works in any theme.
 */
export function AppLogo({
  size = 32,
  className,
}: {
  size?: number
  className?: string
}) {
  // useId returns ":r1:"; strip the colons so the id is safe inside url(#...).
  const maskId = `logo-mask-${useId().replace(/:/g, '')}`
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <mask id={maskId}>
        <rect width="32" height="32" fill="#fff" />
        {UPPER.map(([row, col]) => (
          <rect
            key={`u${row}${col}`}
            x={origin(col)}
            y={origin(row)}
            width="6"
            height="6"
            rx="1.5"
            fill="#000"
          />
        ))}
        {LOWER.map(([row, col]) => (
          <circle
            key={`l${row}${col}`}
            cx={origin(col) + 3}
            cy={origin(row) + 3}
            r="1.5"
            fill="#000"
            fillOpacity="0.5"
          />
        ))}
      </mask>
      <rect
        width="32"
        height="32"
        rx="8"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}
