# 11 — Configuración por servicio y Makefile simplificado

- **Fecha:** 2026-10-11
- **Fase:** 4 y 6
- **Commit:** `chore: configura variables de entorno por servicio y ajusta el Makefile`

## Qué hicimos
Cada servicio tiene ahora su propia plantilla de variables, en lugar de un único `.env.example` compartido en la raíz (que se eliminó).

| Servicio | Plantilla | Archivo real (ignorado por git) |
|---|---|---|
| go-api | `src/go-api/.env.example` | `src/go-api/.env` |
| node-api | `src/node-api/.env.example` | `src/node-api/.env` |
| frontend | `src/frontend/.env.example` | `src/frontend/.env.local` |

- **Makefile:** se quitó el bloque de variables `AUTH0_*` con valores por defecto y el comentario de cabecera, porque duplicaban lo que dicen las plantillas.
  - `run-go` y `run-node` cargan el `.env` de su carpeta antes de arrancar; si falta, avisan con el comando exacto para crearlo.
  - Se agregaron `run-frontend`, `test-frontend` y `lint-frontend`; `make test` y `make lint` ahora incluyen el frontend.
- **`.gitignore`:** se ignora `.mcp.json` (configuración local del servidor MCP de Auth0, que no forma parte de la entrega).

## Por qué
- Cada servicio será una imagen Docker independiente. Con una plantilla por servicio, `docker-compose.yml` puede inyectar cada archivo con `env_file:` sin mezclar variables ajenas.
- El código de las APIs no cambió: siguen leyendo variables de entorno. Quien las carga (Makefile hoy, Docker mañana) es un detalle de despliegue.
- Una sola fuente de verdad por servicio evita que los valores por defecto del Makefile y las plantillas se desincronicen.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Plantilla de variables | Un `.env.example` en la raíz; **uno por servicio** | Coincide con una imagen y un `env_file` por servicio |
| Carga del `.env` | Librería dotenv en el código; **cargarlo desde el Makefile** | No agrega dependencias ni acopla el código a un archivo concreto |
| Valores en las plantillas | Dejar vacíos; **valores públicos de ejemplo** | Auth0 domain, audience y client id de una SPA son públicos y la API funciona al copiar el archivo |

## Cómo verificarlo
```
cp src/go-api/.env.example src/go-api/.env
cp src/node-api/.env.example src/node-api/.env
make check
make run-node   # en una terminal
make run-go     # en otra
make run-frontend
```
`make check` debe pasar completo (lint, pruebas de las tres aplicaciones y regla de dependencias). Sin los `.env`, `make run-go` y `make run-node` terminan con un mensaje que indica qué copiar.

## Pendiente / siguiente
- Probar el flujo completo en el navegador con un token real (login, go-api, node-api, resultado).
- Docker: un `Dockerfile` por servicio y `docker-compose.yml` con `env_file:`; ahí `NODE_API_URL` será `http://node-api:8081`.
- Despliegue en la nube (Fase 5) y actualizar `docs/`.
