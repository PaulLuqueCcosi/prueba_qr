# 17 — Docker: una imagen por servicio y docker-compose

- **Fecha:** 2026-10-11
- **Fase:** 3
- **Commit:** `feat: dockeriza las tres aplicaciones y agrega docker-compose`

## Qué hicimos
Cada aplicación tiene su propio `Dockerfile` multi-stage, con usuario no root y sin secretos dentro de la imagen. `docker-compose.yml` levanta las tres para probar el flujo completo en local.

| Servicio | Imagen base final | Usuario | Tamaño | Notas |
|---|---|---|---|---|
| go-api | `distroless/static-debian12:nonroot` | 65532 | 18,7 MB | Binario estático (`CGO_ENABLED=0`) y un mini binario `healthcheck` propio, porque distroless no trae shell ni `wget` |
| node-api | `node:24-alpine` | `node` | 186 MB | `npm ci` + compilación en una etapa y `npm ci --omit=dev` en la final; `healthcheck` con `wget` de busybox |
| frontend | `nginx-unprivileged:1.29-alpine` | 101 | 54,8 MB | Puerto 8080, fallback de SPA, cabeceras de seguridad y CSP generada al construir |

- **Compose:** `env_file` por servicio (los `.env` locales, ignorados por git); dentro de Docker solo se sobrescribe `NODE_API_URL=http://node-api:8081`. `depends_on` con `condition: service_healthy` (frontend → go-api → node-api). Contenedores endurecidos: `read_only` con `tmpfs`, `cap_drop: [ALL]`, `no-new-privileges`, `init: true`.
- **Puertos:** frontend `5173→8080` (el callback de Logto sigue siendo `http://localhost:5173/callback`), go-api `8080` y node-api `8081`, porque el navegador llama a ambas APIs directamente.
- **Makefile:** `docker-build`, `docker-up`, `docker-down` y `docker-logs`, que pasan `src/frontend/.env.local` con `--env-file` para las variables de construcción del front.
- **node-api:** apagado ordenado ante `SIGTERM` y `SIGINT` (con salida forzada a los 10 s), para que el contenedor se detenga limpio.
- **Documentación:** `docs/docker.md` y un `README.md` raíz que lo enlaza.

## Por qué
- Imagen mínima, usuario no root y sistema de archivos de solo lectura reducen la superficie de ataque y son lo que se espera de un contenedor listo para producción.
- Un contenedor por servicio permite desplegarlos de forma independiente en la nube (Fase 5) y reutiliza los mismos Dockerfiles.
- Las APIs son sin estado y toman puerto y URLs por variables de entorno, lo que facilita el despliegue en AWS Lambda con imágenes de contenedor.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Imagen de go-api | Alpine con `wget`; **distroless + binario `healthcheck` propio** | Menor tamaño y sin shell; el costo es un binario más |
| Variables del front | Config en runtime (`config.js` / `envsubst`); **variables `VITE_*` en la construcción** | Más simple y permite generar la CSP al construir con `read_only`; son valores públicos. Cambiarlas requiere reconstruir la imagen |
| Servidor del front | nginx estándar; **`nginx-unprivileged`** | Corre sin root en el puerto 8080 |
| Versiones base | Por digest; **por versión (tag)** | Más legible; el digest queda como mejora |
| `.env` en imágenes | Copiarlos; **excluirlos con `.dockerignore`** | Ningún secreto en las imágenes; se inyectan con `env_file` |

## Cómo verificarlo
```
make docker-build
make docker-up
docker compose --env-file src/frontend/.env.local ps   # los tres en "healthy"
curl localhost:8080/health && curl localhost:8081/health
curl -i -X POST localhost:8080/api/v1/qr -H 'content-type: application/json' -d '{"matrix":[[1,2],[3,4]]}'   # 401 sin token
```
Abrir http://localhost:5173, iniciar sesión con Logto y calcular una matriz. `make docker-down` detiene todo. Antes de levantar Docker hay que parar los servidores de desarrollo, porque comparten los puertos.

## Pendiente / siguiente
- En la consola de Logto: registro con email, verificación obligatoria por código y conector de correo.
- Fase 5: despliegue en la nube (AWS Lambda con imágenes de contenedor y Lambda Web Adapter) y documentarlo en `docs/deployment.md`.
- Opcional: fijar las imágenes base por digest.
