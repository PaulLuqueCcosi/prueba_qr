# 18 — Frontend desplegado en Cloudflare

- **Fecha:** 2026-10-11
- **Fase:** 5 y 6
- **Commit:** `feat(frontend): agrega configuración de despliegue en Cloudflare`

## Qué hicimos
Las dos APIs ya estaban desplegadas en Railway (imágenes de Docker Hub). Desplegamos el frontend como sitio estático en Cloudflare Workers (Static Assets) con `wrangler`: https://matrix-frontend.paul-luque-19.workers.dev

- `src/frontend/wrangler.jsonc`: sirve `dist/` y responde `index.html` a las rutas desconocidas (`not_found_handling: single-page-application`), necesario para `/callback` de Logto.
- Build con las URLs públicas de las APIs: `VITE_GO_API_URL` y `VITE_NODE_API_URL` se pasan por entorno al compilar.
- Logto: se agregaron el Redirect URI `/callback` y el Post sign-out URI del dominio de Cloudflare, conservando los de localhost.
- Railway: `CORS_ORIGINS` de go-api y node-api ahora incluye `http://localhost:5173` y el dominio de Cloudflare.
- Detalle y comandos en `docs/deployment.md`.

## Por qué
- Un sitio estático no necesita servidor: Cloudflare lo sirve desde su red y el costo es nulo en el plan gratuito.
- Las APIs son procesos Go y Node con Docker; Workers no ejecuta Fiber, por eso se quedan en Railway.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Dónde alojar el frontend | Nginx en Railway; **Cloudflare Workers (assets)**; Cloudflare Pages | Estático y gratuito; Workers Static Assets es el camino que Cloudflare recomienda hoy frente a Pages |
| Variables `VITE_*` | Config en runtime; **variables en el build** | Igual que en Docker (paso 17): son públicas y cambiarlas requiere reconstruir |
| APIs en Cloudflare | Containers; **mantener Railway** | Fiber no corre en Workers y las APIs ya funcionan |

## Cómo verificarlo
```
cd src/frontend
VITE_GO_API_URL=<url go-api> VITE_NODE_API_URL=<url node-api> npm run build
npx wrangler deploy
```
Abrir la URL de Cloudflare, iniciar sesión con Logto y calcular una matriz. Un preflight `OPTIONS` a las APIs con `Origin` del dominio de Cloudflare devuelve `204` con `access-control-allow-origin`.

## Pendiente / siguiente
- Probar el flujo completo con login en el navegador.
- Las CSP y cabeceras de seguridad que genera nginx en Docker no se aplican en Cloudflare; evaluar un archivo `_headers`.
- Decidir si se mantiene el plan de AWS Lambda o se deja Railway como despliegue final.
