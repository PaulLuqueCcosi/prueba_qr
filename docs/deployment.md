# Despliegue

| Componente | Plataforma | URL |
|---|---|---|
| go-api | Railway (imagen `pol19/matrix-qr-go-api`) | https://go-api-production-7f99.up.railway.app |
| node-api | Railway | https://node-api-production-52fd.up.railway.app |
| frontend | Cloudflare Workers (Static Assets) | https://matrix-frontend.paul-luque-19.workers.dev |

## Frontend en Cloudflare

Configuración en `src/frontend/wrangler.jsonc`. Las variables `VITE_*` se incrustan al compilar, por eso hay que definirlas antes de `npm run build`:

```
cd src/frontend
VITE_GO_API_URL=https://go-api-production-7f99.up.railway.app \
VITE_NODE_API_URL=https://node-api-production-52fd.up.railway.app \
npm run build
npx wrangler deploy
```

Requiere haber iniciado sesión (`npx wrangler login`).

## Configuración que depende del dominio del frontend

- **Logto** (app *Matrix Frontend*): Redirect URI `https://<dominio>/callback` y Post sign-out redirect URI `https://<dominio>`.
- **Railway** (go-api y node-api): `CORS_ORIGINS` con el origen del frontend, separado por comas de los demás (sin comodín ni rutas).

Si el dominio cambia (por ejemplo, uno propio), hay que actualizar ambos y volver a compilar solo si cambiaron las URLs de las APIs.

## Limitaciones conocidas

- Cloudflare Workers no ejecuta go-api (Fiber/fasthttp), por eso las APIs siguen en Railway.
- Las cabeceras de seguridad y la CSP que genera nginx en Docker no se aplican en Cloudflare todavía.
