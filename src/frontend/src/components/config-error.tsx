import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function ConfigError({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <Alert variant="destructive">
        <AlertTitle>Missing configuration</AlertTitle>
        <AlertDescription>
          Set these variables in <code>.env.local</code> (see{' '}
          <code>.env.example</code>) and restart the dev server:{' '}
          <span className="font-mono">{missing.join(', ')}</span>
        </AlertDescription>
      </Alert>
    </main>
  )
}
