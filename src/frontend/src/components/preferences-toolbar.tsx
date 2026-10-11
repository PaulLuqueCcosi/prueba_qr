import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { LANGUAGES, setLanguage } from '@/i18n'
import { THEMES, type Theme } from '@/lib/theme'

const THEME_ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  return (
    <div role="group" aria-label={t('language.label')} className="flex gap-0.5">
      {LANGUAGES.map((language) => (
        <Button
          key={language}
          size="sm"
          variant={i18n.language === language ? 'secondary' : 'ghost'}
          aria-pressed={i18n.language === language}
          aria-label={t(`language.${language}`)}
          title={t(`language.${language}`)}
          className="px-2 uppercase"
          onClick={() => void setLanguage(language)}
        >
          {language}
        </Button>
      ))}
    </div>
  )
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  return (
    <div role="group" aria-label={t('theme.label')} className="flex gap-0.5">
      {THEMES.map((option) => {
        const Icon = THEME_ICONS[option]
        return (
          <Button
            key={option}
            size="icon-sm"
            variant={theme === option ? 'secondary' : 'ghost'}
            aria-pressed={theme === option}
            aria-label={t(`theme.${option}`)}
            title={t(`theme.${option}`)}
            onClick={() => setTheme(option)}
          >
            <Icon aria-hidden />
          </Button>
        )
      })}
    </div>
  )
}
