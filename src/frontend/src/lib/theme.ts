export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

/** Same key as the inline script in index.html, which applies the theme before first paint. */
export const THEME_STORAGE_KEY = 'theme'

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

export function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    // Storage blocked: use the default.
  }
  return 'system'
}

export function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The choice just will not survive a reload.
  }
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean) {
  return theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme
}

export function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  // Lets native controls (scrollbars, inputs) match the theme too.
  root.style.colorScheme = resolved
}
