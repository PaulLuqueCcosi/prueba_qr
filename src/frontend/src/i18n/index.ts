import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { es } from './es'

export const LANGUAGES = ['en', 'es'] as const
export type Language = (typeof LANGUAGES)[number]

const STORAGE_KEY = 'language'

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/** Stored choice > browser language > English. Storage can throw (private mode), so it is guarded. */
export function detectLanguage(
  storage: Pick<Storage, 'getItem'> | undefined = safeStorage(),
  browserLanguages: readonly string[] = navigator.languages?.length
    ? navigator.languages
    : [navigator.language],
): Language {
  try {
    const stored = storage?.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // fall through to the browser language
  }
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLanguage(base)) return base
  }
  return 'en'
}

/** Changes the UI language, persists the choice and (via the listener below) updates <html lang>. */
export async function setLanguage(language: Language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // The choice just will not survive a reload.
  }
  await i18n.changeLanguage(language)
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: detectLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false }, // React already escapes
  initAsync: false,
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
