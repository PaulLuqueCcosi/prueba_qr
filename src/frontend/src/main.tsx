import { LogtoProvider } from '@logto/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { ConfigError } from './components/config-error.tsx'
import { buildLogtoConfig, readConfig } from './lib/config.ts'

const result = readConfig(import.meta.env)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {'missing' in result ? (
        <ConfigError missing={result.missing} />
      ) : (
        // PKCE authorization-code flow; the SDK keeps tokens in browser storage.
        <LogtoProvider config={buildLogtoConfig(result.config)}>
          <App config={result.config} />
        </LogtoProvider>
      )}
    </ThemeProvider>
  </StrictMode>,
)
