# 08 — node-api: autenticación con JWT de Auth0 (Fase 4)

- **Fecha:** 2026-10-11
- **Fase:** 4
- **Commit:** `feat(node-api): valida JWT de Auth0 y protege las rutas`

## Qué hicimos
node-api ahora exige `Authorization: Bearer <access_token>` en `POST /api/v1/statistics` y valida el token por sí misma.

- **Validación:** firma RS256 con las claves públicas JWKS del tenant de Auth0, más `iss`, `aud` y `exp`/`nbf` (5 s de tolerancia).
- **Autorización:** la ruta exige el scope `statistics:read`.
- **Errores:** `401 UNAUTHORIZED` (token ausente o inválido) y `403 FORBIDDEN` (token válido sin el scope), con el mismo formato `{ "error": { "code", "message" } }` y el header `WWW-Authenticate`.
- **Rutas públicas:** `GET /health`, `GET /docs`, `GET /openapi.yaml` y los preflight `OPTIONS`.
- **CORS:** lista explícita de orígenes (`CORS_ORIGINS`, por defecto `http://localhost:5173`), sin comodín, para que el frontend pueda llamar desde el navegador.
- **Configuración:** `AUTH0_DOMAIN` y `AUTH0_AUDIENCE` son obligatorias. Si faltan o son inválidas, el servicio no arranca.
- **Contrato y Swagger:** `docs/api-contract.md` y el `openapi.yaml` documentan el esquema `bearerAuth`, los scopes y los nuevos códigos.

## Por qué
- Cada servicio valida el token por su cuenta (defensa en profundidad): si go-api se saltara la validación, node-api sigue rechazando peticiones sin token.
- Se usan las claves públicas (JWKS), así que las APIs no guardan ningún secreto.
- Fallar cerrado: sin configuración de Auth0 válida no se levanta un servicio sin protección.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Proveedor de identidad: **Auth0** | JWT propio en Go; Auth0; Cognito | Plan gratuito, estándar OIDC y no hay que custodiar claves ni emitir tokens |
| Arquitectura | Validar en un middleware suelto; **puerto `token-verifier` con adaptador** | Mantiene la regla de dependencias hexagonal y permite probar con un verificador falso |
| Scopes por ruta | Solo autenticación; **autenticación + scope** | Principio de mínimo privilegio y es fácil de explicar en entrevista |

## Cómo verificarlo
```
make test-node
```
Debe pasar la suite completa (146 pruebas), incluyendo `auth.http.test.ts`. A mano, sin token:
```
curl -i -X POST http://localhost:8081/api/v1/statistics -H "Content-Type: application/json" -d "{}"
```
Resultado esperado: `401` con `UNAUTHORIZED`.

## Pendiente / siguiente
go-api con la misma validación y reenvío del token del cliente a node-api (paso 09).
