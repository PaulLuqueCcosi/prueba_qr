# Despliegue

Expliqué el empaquetado en contenedores en [docker](docker.md); aquí cuento cómo lo desplegué en la nube.

| Componente | Plataforma | URL |
|---|---|---|
| go-api | Railway (imagen `pol19/matrix-qr-go-api`) | https://api-go.iampol.dev |
| node-api | Railway | https://api-node.iampol.dev |
| frontend | Cloudflare Workers (Static Assets) | https://qr-prueba.iampol.dev |

El dominio `iampol.dev` está en Cloudflare. Las URLs de Railway (`*.up.railway.app`) siguen activas, pero ya no se usan.

## Frontend en Cloudflare

Configuración en `src/frontend/wrangler.jsonc`: sirve `dist/`, responde `index.html` a las rutas desconocidas (necesario para `/callback` de Logto) y asigna el Custom Domain `qr-prueba.iampol.dev` (Cloudflare crea el DNS y el certificado). Al declarar la ruta, la URL `workers.dev` queda deshabilitada.

Las variables `VITE_*` se incrustan al compilar, por eso hay que definirlas antes de `npm run build`:

```
cd src/frontend
VITE_GO_API_URL=https://api-go.iampol.dev \
VITE_NODE_API_URL=https://api-node.iampol.dev \
npm run build
npx wrangler deploy
```

Requiere haber iniciado sesión (`npx wrangler login`).

## APIs en Railway

Cada servicio tiene su Custom Domain (Settings → Networking) con el puerto del servicio: go-api `8080`, node-api `8081`. Railway pide un registro CNAME y un TXT de verificación (`_railway-verify`) que se crean en el DNS de Cloudflare.

## Configuración que depende del dominio del frontend

- **Logto** (app *Matrix Frontend*): Redirect URI `https://qr-prueba.iampol.dev/callback` y Post sign-out redirect URI `https://qr-prueba.iampol.dev`. Se conservan los de localhost.
- **Railway** (go-api y node-api): `CORS_ORIGINS=http://localhost:5173,https://qr-prueba.iampol.dev` (orígenes separados por comas, sin comodín ni rutas).

Si el dominio cambia, hay que actualizar ambos.

## Limitaciones conocidas

- Cloudflare Workers no ejecuta go-api (Fiber/fasthttp), por eso las APIs siguen en Railway.
- Las cabeceras de seguridad y la CSP que genera nginx en Docker no se aplican en Cloudflare todavía.
