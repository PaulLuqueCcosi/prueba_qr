# 09 — go-api: autenticación con JWT de Auth0 y reenvío del token (Fase 4)

- **Fecha:** 2026-10-11
- **Fase:** 4
- **Commit:** `feat(go-api): valida JWT de Auth0 y reenvía el token a node-api`

## Qué hicimos
go-api aplica la misma política que node-api (paso 08) y propaga la identidad del cliente hacia node-api.

- **Validación:** `POST /api/v1/qr` exige `Authorization: Bearer <access_token>`. Se verifica la firma RS256 con las claves JWKS de Auth0, más `iss`, `aud` y `exp`/`nbf`.
- **Autorización:** la ruta exige el scope `qr:write`.
- **Errores:** `401 UNAUTHORIZED` y `403 FORBIDDEN` con el formato de error del contrato y el header `WWW-Authenticate`.
- **Reenvío del token:** al llamar a node-api, go-api envía el mismo `Authorization: Bearer` que recibió del cliente.
- **Rutas públicas:** `GET /health`, `GET /docs`, `GET /openapi.yaml` y los preflight `OPTIONS`.
- **CORS:** orígenes explícitos por `CORS_ORIGINS`, sin comodín.
- **Configuración:** `AUTH0_DOMAIN` y `AUTH0_AUDIENCE` obligatorias; sin ellas el servicio no arranca.
- **Arquitectura:** el caso de uso de autenticación vive en `application/auth.go`, el verificador JWT es un adaptador de salida (`adapters/outbound/auth`) y el middleware es un adaptador HTTP de entrada. El script `check_dependency_rule.sh` sigue verificando la regla de dependencias.

## Por qué
- Reenviar el token del cliente (opción A) evita un segundo flujo de credenciales entre servicios y hace que node-api vea al usuario real.
- Cada servicio valida por su cuenta: la seguridad no depende de que el otro cumpla.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Autenticación entre servicios | **A: reenviar el token del cliente**; B: token de servicio M2M (client credentials) | A es más simple y suficiente para la prueba; B queda como evolución si hace falta aislar a los servicios del usuario |
| Scopes | `qr:write` en go-api, `statistics:read` en node-api | Cada ruta pide solo el permiso que necesita |

## Cómo verificarlo
```
make test-go
```
Todos los paquetes deben pasar, incluidos `adapters/outbound/auth` y `auth_http_test.go`. A mano, sin token:
```
curl -i -X POST http://localhost:8080/api/v1/qr -H "Content-Type: application/json" -d "{\"matrix\":[[1,2],[3,4]]}"
```
Resultado esperado: `401` con `UNAUTHORIZED`.

## Pendiente / siguiente
Frontend con login de Auth0 que consuma ambas APIs (paso 10).
