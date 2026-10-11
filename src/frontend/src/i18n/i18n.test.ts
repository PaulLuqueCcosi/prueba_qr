import { describe, expect, it } from 'vitest'
import { en } from './en'
import { es } from './es'
import { detectLanguage } from './index'

function flatten(obj: object, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, String(v)] as [string, string]],
  )
}

describe('locales', () => {
  it('have the same key set', () => {
    const keys = (o: object) =>
      flatten(o)
        .map(([k]) => k)
        .sort()
    expect(keys(es)).toEqual(keys(en))
  })

  it('use the same interpolation placeholders', () => {
    const placeholders = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort()
    const esMap = new Map(flatten(es))
    for (const [key, value] of flatten(en)) {
      expect(placeholders(esMap.get(key)!), key).toEqual(placeholders(value))
    }
  })
})

describe('detectLanguage', () => {
  const store = (value: string | null) => ({ getItem: () => value })

  it('prefers the stored choice', () => {
    expect(detectLanguage(store('es'), ['en-US'])).toBe('es')
  })

  it('falls back to the browser language, ignoring region', () => {
    expect(detectLanguage(store(null), ['fr-FR', 'es-PE'])).toBe('es')
  })

  it('defaults to English for unsupported languages or unusable storage', () => {
    expect(detectLanguage(store('xx'), ['fr'])).toBe('en')
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(detectLanguage(broken, [])).toBe('en')
  })
})
