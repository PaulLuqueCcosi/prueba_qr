import { useLogto } from '@logto/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSidebar } from '@/components/app-sidebar'
import { LanguageSwitcher, ThemeToggle } from '@/components/preferences-toolbar'
import { SignInCallback } from '@/components/sign-in-callback'
import { SignInScreen } from '@/components/sign-in-screen'
import { HealthPanel } from '@/components/health-panel'
import { DeveloperPanel } from '@/components/developer-panel'
import { QrPanel } from '@/components/qr-panel'
import { StatisticsPanel } from '@/components/statistics-panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CALLBACK_PATH, type AppConfig } from '@/lib/config'
import { VIEWS, type ViewId } from '@/lib/views'

export default function App({ config }: { config: AppConfig }) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, error } = useLogto()
  // No router in this app: /callback is the only route, handled until the code exchange ends.
  const [onCallback, setOnCallback] = useState(
    () => window.location.pathname === CALLBACK_PATH,
  )
  // Logto's useLogto() flips `isLoading` on for every token call (getIdToken,
  // getIdTokenClaims...). Treating that as "app loading" would unmount the panels
  // mid-request and throw away their results, so the skeleton is only for the
  // initial load: once loading has finished once, it never comes back.
  const [ready, setReady] = useState(false)
  if (!ready && !isLoading) setReady(true)
  const [view, setView] = useState<ViewId>('qr')
  const current = (VIEWS.find((v) => v.id === view) ?? VIEWS[0]).id

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar current={view} onNavigate={setView} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger aria-label={t('app.toggleSidebar')} />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm leading-tight font-semibold">
                {isAuthenticated ? t(`views.${current}.title`) : t('app.name')}
              </h1>
              {isAuthenticated && (
                <p className="text-muted-foreground truncate text-xs">
                  {t(`views.${current}.description`)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <LanguageSwitcher />
              <Separator orientation="vertical" className="h-4" />
              <ThemeToggle />
            </div>
          </header>
          <main className="w-full min-w-0 space-y-6 p-4 md:p-6">
            {error && !onCallback && (
              <Alert variant="destructive">
                <AlertTitle>{t('app.loginError')}</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
            {onCallback ? (
              <SignInCallback onDone={() => setOnCallback(false)} />
            ) : !ready ? (
              <div
                className="space-y-4"
                aria-busy="true"
                aria-label={t('app.loading')}
              >
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : !isAuthenticated ? (
              <SignInScreen />
            ) : view === 'qr' ? (
              <QrPanel config={config} />
            ) : view === 'statistics' ? (
              <StatisticsPanel config={config} />
            ) : view === 'health' ? (
              <HealthPanel config={config} />
            ) : (
              <DeveloperPanel />
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
