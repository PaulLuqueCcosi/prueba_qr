import { useHandleSignInCallback } from '@logto/react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/** Back to the app root without a reload, so the URL no longer carries the one-time code. */
function goHome() {
  window.history.replaceState(null, '', '/')
}

/**
 * Handles Logto's redirect back to /callback: exchanges the authorization code
 * for tokens, then clears the URL. There is no router in this app, so the
 * caller decides when to render this (pathname === '/callback').
 */
export function SignInCallback({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const { error } = useHandleSignInCallback(() => {
    goHome()
    onDone()
  })

  if (error) {
    return (
      <section className="flex min-h-[calc(100svh-8.5rem)] items-center justify-center py-6">
        <div
          role="alert"
          className="bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 text-center"
        >
          <TriangleAlert
            className="text-destructive mx-auto size-8"
            aria-hidden
          />
          <p className="font-medium">{t('callback.failedTitle')}</p>
          <p className="text-muted-foreground text-sm">
            {t('callback.failed')}
          </p>
          <Button
            className="w-full"
            onClick={() => {
              goHome()
              onDone()
            }}
          >
            {t('callback.back')}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      className="flex min-h-[calc(100svh-8.5rem)] flex-col items-center justify-center gap-3 py-6"
      aria-busy="true"
    >
      <Loader2
        className="text-muted-foreground size-8 animate-spin"
        aria-hidden
      />
      <p role="status" className="text-muted-foreground text-sm">
        {t('callback.completing')}
      </p>
    </section>
  )
}
