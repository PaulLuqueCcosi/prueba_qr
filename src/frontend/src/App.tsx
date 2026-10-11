import { useAuth0 } from '@auth0/auth0-react'
import { Grid2x2 } from 'lucide-react'
import { useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { DeveloperPanel } from '@/components/developer-panel'
import { QrPanel } from '@/components/qr-panel'
import { StatisticsPanel } from '@/components/statistics-panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { AppConfig } from '@/lib/config'
import { VIEWS, type ViewId } from '@/lib/views'

function SignedOutCard() {
  const { loginWithRedirect } = useAuth0()
  return (
    <Card className="mx-auto mt-12 w-full max-w-md text-center">
      <CardHeader className="items-center justify-items-center">
        <div className="bg-primary text-primary-foreground mb-2 flex size-10 items-center justify-center rounded-lg">
          <Grid2x2 aria-hidden />
        </div>
        <CardTitle className="text-lg">Matrix QR</CardTitle>
        <CardDescription>
          Compute the QR factorization of a matrix and the statistics of the
          result.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={() => void loginWithRedirect()}>
          Sign in
        </Button>
      </CardContent>
    </Card>
  )
}

export default function App({ config }: { config: AppConfig }) {
  const { isAuthenticated, isLoading, error } = useAuth0()
  const [view, setView] = useState<ViewId>('qr')
  const current = VIEWS.find((v) => v.id === view) ?? VIEWS[0]

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar current={view} onNavigate={setView} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="min-w-0">
              <h1 className="truncate text-sm leading-tight font-semibold">
                {isAuthenticated ? current.title : 'Matrix QR'}
              </h1>
              {isAuthenticated && (
                <p className="text-muted-foreground truncate text-xs">
                  {current.description}
                </p>
              )}
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Login error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
            {isLoading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : !isAuthenticated ? (
              <SignedOutCard />
            ) : view === 'qr' ? (
              <QrPanel config={config} />
            ) : view === 'statistics' ? (
              <StatisticsPanel config={config} />
            ) : (
              <DeveloperPanel />
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
