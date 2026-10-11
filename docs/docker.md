# Docker

Cada servicio tiene su propia imagen (multi-stage, mínima, sin root) y `docker-compose.yml` levanta los tres para probar todo en local.

| Servicio | Contexto | Imagen final | Puerto en el contenedor | Puerto en el host |
|---|---|---|---|---|
| go-api | `src/go-api` | `gcr.io/distroless/static-debian12:nonroot` (~19 MB) | 8080 (`PORT`) | 8080 |
| node-api | `src/node-api` | `node:24-alpine` (~186 MB) | 8081 (`PORT`) | 8081 |
| frontend | `src/frontend` | `nginxinc/nginx-unprivileged:1.29-alpine` (~55 MB) | 8080 | 5173 |

El frontend se publica en el host en el **5173** porque es el origen registrado en Logto (`http://localhost:5173/callback`). El navegador llama directo a go-api (8080) y a node-api (8081), por eso ambos puertos se publican.

## Cómo ejecutarlo

```bash
make docker-up      # construye y levanta (docker compose --env-file src/frontend/.env.local up -d --build)
make docker-logs    # sigue los logs
make docker-down    # detiene y elimina contenedores y red (las imágenes se conservan)
make docker-build   # solo construye
```

Requisitos: Docker con Compose v2, y los archivos locales `src/go-api/.env`, `src/node-api/.env` y `src/frontend/.env.local` (copia cada `.env.example`). Los puertos 8080, 8081 y 5173 deben estar libres (para el entorno de desarrollo, `make run-*`, hay que detenerlo antes).

## Configuración y secretos

- **go-api y node-api** leen su configuración **en tiempo de ejecución**, de variables de entorno. Compose las carga con `env_file` desde el `.env` de cada servicio (valores públicos, ignorados por git) y solo sobreescribe lo que cambia dentro de Docker: `PORT` y, en go-api, `NODE_API_URL=http://node-api:8081` (dentro de la red de Docker nunca es `localhost`).
- **frontend**: Vite incrusta las variables `VITE_*` **al compilar**, no al arrancar. Por eso son `ARG` del Dockerfile y Compose las toma de `src/frontend/.env.local`. Compose solo lee automáticamente el `.env` de la raíz, así que los targets del Makefile pasan `--env-file src/frontend/.env.local`. **Cambiar esos valores exige reconstruir la imagen** (`make docker-build`). En `docker-compose.yml` no hay valores fijos.
- Ninguna imagen contiene archivos `.env` ni secretos: cada `.dockerignore` los excluye del contexto y la verificación de imágenes no encontró ninguno. Todos los valores son públicos (cliente OIDC público, claves públicas JWKS).

## Decisiones por imagen y trade-offs

### go-api
- Builder `golang:1.27-alpine` (misma versión menor que `go.mod`), `CGO_ENABLED=0`, `-trimpath -ldflags="-s -w"` y caches de módulos y de compilación (`--mount=type=cache`). Se copia primero `go.mod`/`go.sum` para reutilizar la capa de dependencias.
- Imagen final **distroless `static` (nonroot)**: ~19 MB, sin shell ni gestor de paquetes, usuario `65532` numérico. **Trade-off:** no hay `wget`/`curl` para el healthcheck, así que se añadió un binario mínimo `cmd/healthcheck` (GET a `127.0.0.1:$PORT/health`, timeout de 2 s, exit 0/1) compilado en la misma etapa. Alpine permitiría `wget`, pero la superficie de ataque y el tamaño son mayores. La regla de dependencias (`scripts/check_dependency_rule.sh`) sigue pasando: `cmd/` es la capa de composición.
- `ENTRYPOINT` en forma exec: el proceso Go es PID 1 y recibe `SIGTERM` (ya tenía apagado ordenado).

### node-api
- Tres etapas: dependencias de producción (`npm ci --omit=dev`), compilación (`npm ci` + `tsc`) y runtime `node:24-alpine` (LTS) con `USER node` y `NODE_ENV=production`. Solo se copian `dist`, `node_modules` de producción, `package.json` y `openapi/` (la spec que sirve `/docs`).
- `CMD ["node", "dist/main/server.js"]` directo (sin `npm start`) y `init: true` en Compose. Se añadió apagado ordenado a `server.ts` (`SIGTERM`/`SIGINT` cierran el servidor y salen; forzado a los 10 s) porque node no lo hacía.
- Healthcheck con `wget` de busybox (viene en alpine).

### frontend
- Etapa de build con `npm ci` y `npm run build`; falla pronto si faltan `VITE_LOGTO_ENDPOINT`/`VITE_LOGTO_APP_ID`.
- Runtime **nginx-unprivileged** (usuario `101`, puerto 8080, pid y temporales en `/tmp`), por lo que funciona con sistema de archivos de solo lectura y `tmpfs` en `/tmp`. **Trade-off:** configuración en tiempo de compilación en lugar de un `config.js` en runtime; es más simple y es lo que hace Vite por defecto, a costa de una imagen por entorno.
- `nginx.conf`: fallback SPA (`try_files … /index.html`), `server_tokens off`, gzip, caché inmutable de 1 año para `/assets/` (nombres con hash) y `no-cache` para `index.html`, dotfiles denegados (404), `/health` que responde 200, y un 404 real para assets inexistentes.
- Cabeceras: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` y una CSP (`default-src 'self'`, `connect-src` con el endpoint de Logto y los dos orígenes de las APIs, `frame-ancestors 'none'`, `object-src 'none'`). La CSP se genera al compilar con los mismos valores `VITE_*`, así siempre coincide con lo que la app llama. El login es una redirección de página completa a Logto, que la CSP no restringe. `style-src 'unsafe-inline'` hace falta por los estilos en línea de los componentes y `img-src https:` por la foto de perfil de Logto. Cada `location` incluye el mismo snippet de cabeceras porque `add_header` no se hereda cuando un `location` define el suyo.

## Endurecimiento (Compose)

Todos los servicios: `read_only: true` (+ `tmpfs: /tmp`), `cap_drop: [ALL]`, `no-new-privileges`, usuario no root, `init: true`, `pids_limit`, límites de memoria y CPU, `restart: unless-stopped`, red propia (`matrix`) y healthchecks con `interval`/`timeout`/`retries`/`start_period`. `depends_on` con `condition: service_healthy`: frontend → go-api → node-api.

## Notas para la fase 5 (AWS Lambda con imágenes de contenedor)

- Los servidores ya son sin estado, toman el puerto de `PORT`, escriben logs JSON a stdout y tienen `GET /health`: es lo que necesita **Lambda Web Adapter**. El adaptador **todavía no está añadido**; en la fase 5 se copia como extensión (`COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter … /lambda-adapter /opt/extensions/`) y se ajusta `AWS_LWA_PORT`/`AWS_LWA_READINESS_CHECK_PATH=/health`.
- Lambda no usa el `HEALTHCHECK` de Docker ni `restart`; esas partes son solo para Compose.
- El sistema de archivos de Lambda es de solo lectura salvo `/tmp`: las imágenes ya funcionan así.
- El frontend no tiene por qué ir en Lambda (S3 + CloudFront es lo habitual); la imagen nginx es para el entorno local.
- Como los `VITE_*` se incrustan al compilar, en la nube hay que compilar el frontend con las URLs públicas de las APIs y registrar su origen en Logto.
- Imágenes de arquitectura: construir para la arquitectura de Lambda (`--platform linux/arm64` o `linux/amd64`).
