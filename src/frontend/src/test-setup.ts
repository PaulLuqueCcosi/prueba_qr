import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import i18n from './i18n'

// Tests assert English text, so pin the language and clear persisted preferences.
beforeEach(async () => {
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
  await i18n.changeLanguage('en')
})
