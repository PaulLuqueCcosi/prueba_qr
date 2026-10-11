# Frontend de pruebas (Matrix QR)

Aplicación pequeña (React + Vite + TypeScript + Tailwind + shadcn/ui) para probar de punta a punta las dos APIs con login con Logto. Es un proyecto independiente: no comparte código con `go-api` ni `node-api`.

- Pestaña **QR + statistics (go-api)**: envía una matriz a `POST /api/v1/qr` y muestra `original`, `q`, `r` y las estadísticas.
- Pestaña **Statistics (node-api)**: llama directo a `POST /api/v1/statistics` (también exige token).
- Panel **Developer**: muestra los claims del ID token (`aud`, `iss`, `exp`) y permite copiarlo.

## Variables de entorno

Copia `.env.example` a `.env.local` (ya ignorado por git). Todos los valores son públicos: la SPA es un cliente público (Authorization Code + PKCE) y no hay secretos.

| Variable                  | Obligatoria | Por defecto             |
| ------------------------- | ----------- | ----------------------- |
| `VITE_LOGTO_ENDPOINT`     | sí          | -                       |
| `VITE_LOGTO_APP_ID`       | sí          | -                       |
| `VITE_GO_API_URL`         | no          | `http://localhost:8080` |
| `VITE_NODE_API_URL`       | no          | `http://localhost:8081` |

Si falta una variable obligatoria, la app muestra una pantalla de error de configuración.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173 (puerto fijo)
```

El puerto 5173 es fijo (`strictPort`) porque es el único origen registrado en la app de Logto (redirect URI `http://localhost:5173/callback` y post sign-out `http://localhost:5173`). Si está ocupado, el servidor falla en lugar de cambiar de puerto.

Otros scripts: `build`, `preview`, `lint`, `typecheck`, `format`, `test`.

## Login

1. Levanta `go-api` (8080) y `node-api` (8081) con la configuración de Logto (`LOGTO_ENDPOINT` y `LOGTO_APP_ID`).
2. Abre `http://localhost:5173` y pulsa **Sign in**: te redirige a la página de inicio de sesión de Logto y vuelve a `/callback` (el SDK de Logto no ofrece login en ventana emergente).
3. Puedes entrar con un usuario existente o, si el registro está habilitado en el tenant de Logto, crear la cuenta desde la propia pantalla de inicio de sesión.

Los tokens los gestiona el SDK de Logto en el almacenamiento del navegador (flujo Authorization Code + PKCE, el ID token se renueva con el refresh token cuando caduca); al cerrar sesión se borran.

## Token para Postman / Swagger

Con la sesión iniciada, abre el panel **Developer** y pulsa **Copy ID token**. Pégalo como `Bearer <token>` en Postman o con **Authorize** en `http://localhost:8080/docs` y `http://localhost:8081/docs`. El panel también muestra `aud`, `iss` y el tiempo restante de expiración.

## CORS

Ambas APIs deben permitir el origen `http://localhost:5173` (`CORS_ORIGINS`, es el valor por defecto). Si no, el frontend mostrará "Cannot reach the API".

## Pruebas

`npm test` ejecuta Vitest (jsdom, sin red): validación de matrices, cliente de API (cabecera Bearer y mapeo de errores) y un test de componente con `useLogto` simulado.
