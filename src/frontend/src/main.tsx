import { Auth0Provider } from '@auth0/auth0-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { ConfigError } from './components/config-error.tsx'
import { readConfig, SCOPES } from './lib/config.ts'

const result = readConfig(import.meta.env)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {'missing' in result ? (
        <ConfigError missing={result.missing} />
      ) : (
        <Auth0Provider
          domain={result.config.auth0Domain}
          clientId={result.config.auth0ClientId}
          // Memory cache: no tokens in localStorage (lost on refresh, which is fine for a test tool).
          cacheLocation="memory"
          authorizationParams={{
            redirect_uri: window.location.origin,
            audience: result.config.auth0Audience,
            scope: SCOPES,
          }}
        >
          <App config={result.config} />
        </Auth0Provider>
      )}
    </ThemeProvider>
  </StrictMode>,
)
