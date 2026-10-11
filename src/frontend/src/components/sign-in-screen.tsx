import { Loader2, LogIn, Lock, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '@/components/app-logo'
import { Button } from '@/components/ui/button'
import { useSignIn } from '@/hooks/use-sign-in'

/** Landing shown to signed-out visitors: one obvious action, with calm waiting and error states. */
export function SignInScreen() {
  const { t } = useTranslation()
  const { pending, failed, start } = useSignIn()

  return (
    <section className="flex min-h-[calc(100svh-8.5rem)] items-center justify-center py-6">
      <div className="bg-card text-card-foreground w-full max-w-sm space-y-6 rounded-2xl border p-6 text-center shadow-sm sm:p-8">
        <div className="space-y-4">
          <AppLogo size={64} className="text-primary mx-auto" />
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t('app.name')}
            </h2>
            <p className="text-muted-foreground text-sm text-balance">
              {t('signIn.tagline')}
            </p>
          </div>
        </div>

        {failed && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex gap-2.5 rounded-lg border p-3 text-left text-sm"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-0.5">
              <p className="font-medium">{t('signIn.errorTitle')}</p>
              <p>{t('signIn.failed')}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            size="lg"
            className="h-11 w-full text-base"
            disabled={pending}
            onClick={start}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                {t('signIn.waitingShort')}
              </>
            ) : (
              <>
                <LogIn aria-hidden />
                {t('app.signIn')}
              </>
            )}
          </Button>

          {pending && (
            <p
              role="status"
              className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm"
            >
              {t('signIn.waiting')}
            </p>
          )}
        </div>

        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          {t('signIn.secureHint')}
        </p>
      </div>
    </section>
  )
}
