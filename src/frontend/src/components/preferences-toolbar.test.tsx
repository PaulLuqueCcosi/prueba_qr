import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher, ThemeToggle } from './preferences-toolbar'
import { ThemeProvider } from './theme-provider'

function Sample() {
  const { t } = useTranslation()
  return <p>{t('qr.compute')}</p>
}

describe('LanguageSwitcher', () => {
  it('switches the UI language, persists it and updates <html lang>', async () => {
    render(
      <>
        <LanguageSwitcher />
        <Sample />
      </>,
    )
    expect(screen.getByText('Compute QR')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Español' }))

    expect(screen.getByText('Calcular QR')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(document.documentElement.lang).toBe('es')
    expect(window.localStorage.getItem('language')).toBe('es')
  })
})

describe('ThemeProvider', () => {
  let systemDark = false
  let listener: (() => void) | undefined

  beforeEach(() => {
    systemDark = false
    listener = undefined
    window.matchMedia = ((query: string) => ({
      get matches() {
        return systemDark
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => (listener = cb),
      removeEventListener: () => (listener = undefined),
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => vi.restoreAllMocks())

  const setup = () =>
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )
  const isDark = () => document.documentElement.classList.contains('dark')

  it('defaults to system and follows OS changes live', () => {
    setup()
    expect(isDark()).toBe(false)
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    systemDark = true
    listener?.()
    expect(isDark()).toBe(true)
  })

  it('applies and persists an explicit choice', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(isDark()).toBe(true)
    expect(window.localStorage.getItem('theme')).toBe('dark')

    await userEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(isDark()).toBe(false)
    expect(window.localStorage.getItem('theme')).toBe('light')
  })

  it('restores the stored theme on mount', () => {
    window.localStorage.setItem('theme', 'dark')
    setup()
    expect(isDark()).toBe(true)
  })

  it('translates the toggle labels', async () => {
    render(
      <ThemeProvider>
        <LanguageSwitcher />
        <ThemeToggle />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Español' }))
    expect(screen.getByRole('button', { name: 'Oscuro' })).toBeInTheDocument()
  })
})
