import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function ConfigError({ missing }: { missing: string[] }) {
  const { t } = useTranslation()
  return (
    <main className="mx-auto max-w-xl p-6">
      <Alert variant="destructive">
        <AlertTitle>{t('configError.title')}</AlertTitle>
        <AlertDescription>
          {t('configError.body')}{' '}
          <span className="font-mono">{missing.join(', ')}</span>
        </AlertDescription>
      </Alert>
    </main>
  )
}
