# Frontend de pruebas (Matrix QR)

Aplicación pequeña (React + Vite + TypeScript + Tailwind + shadcn/ui) para probar de punta a punta las dos APIs con login de Auth0. Es un proyecto independiente: no comparte código con `go-api` ni `node-api`.

- Pestaña **QR + statistics (go-api)**: envía una matriz a `POST /api/v1/qr` y muestra `original`, `q`, `r` y las estadísticas.
- Pestaña **Statistics (node-api)**: llama directo a `POST /api/v1/statistics` (también exige token).
- Panel **Developer**: muestra los claims del access token (`aud`, `scope`, `exp`) y permite copiarlo.

## Variables de entorno

Copia `.env.example` a `.env.local` (ya ignorado por git). Todos los valores son públicos: la SPA es un cliente público (Authorization Code + PKCE) y no hay secretos.

| Variable               | Obligatoria | Por defecto             |
| ---------------------- | ----------- | ----------------------- |
| `VITE_AUTH0_DOMAIN`    | sí          | -                       |
| `VITE_AUTH0_CLIENT_ID` | sí          | -                       |
| `VITE_AUTH0_AUDIENCE`  | sí          | -                       |
| `VITE_GO_API_URL`      | no          | `http://localhost:8080` |
| `VITE_NODE_API_URL`    | no          | `http://localhost:8081` |

Si falta una variable obligatoria, la app muestra una pantalla de error de configuración.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173 (puerto fijo)
```

El puerto 5173 es fijo (`strictPort`) porque es el único callback, logout y web origin registrado en Auth0. Si está ocupado, el servidor falla en lugar de cambiar de puerto.

Otros scripts: `build`, `preview`, `lint`, `typecheck`, `format`, `test`.

## Login

1. Levanta `go-api` (8080) y `node-api` (8081) con la configuración de Auth0.
2. Abre `http://localhost:5173` y pulsa **Login** (Universal Login de Auth0).
3. Puedes entrar con un usuario existente o, si el sign-up está habilitado en el tenant, registrarte desde la propia pantalla de login: eso crea un usuario en la base de datos por defecto del tenant.

El token se guarda solo en memoria (`cacheLocation: 'memory'`): al recargar la página hay que iniciar sesión de nuevo.

## Token para Postman / Swagger

Con la sesión iniciada, abre el panel **Developer** y pulsa **Copy access token**. Pégalo como `Bearer <token>` en Postman o con **Authorize** en `http://localhost:8080/docs` y `http://localhost:8081/docs`. El panel también muestra `aud`, `scope` y el tiempo restante de expiración.

## CORS

Ambas APIs deben permitir el origen `http://localhost:5173` (`CORS_ORIGINS`, es el valor por defecto). Si no, el frontend mostrará "Cannot reach the API".

## Pruebas

`npm test` ejecuta Vitest (jsdom, sin red): validación de matrices, cliente de API (cabecera Bearer y mapeo de errores) y un test de componente con `useAuth0` simulado.
