import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppLogo } from './app-logo'

describe('AppLogo', () => {
  it('renders a decorative svg with the requested size and class', () => {
    const { container } = render(<AppLogo size={56} className="text-primary" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('width', '56')
    expect(svg).toHaveClass('text-primary')
  })

  it('draws six upper cells and three lower dots, with a unique mask per instance', () => {
    const { container } = render(
      <>
        <AppLogo />
        <AppLogo />
      </>,
    )
    const first = container.querySelectorAll('svg')[0]
    expect(first.querySelectorAll('mask rect[rx="1.5"]')).toHaveLength(6)
    expect(first.querySelectorAll('mask circle')).toHaveLength(3)
    const ids = [...container.querySelectorAll('mask')].map((m) => m.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids[0]).not.toContain(':')
  })
})
