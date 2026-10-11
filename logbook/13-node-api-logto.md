# 13 — node-api: validación del ID token de Logto

- **Fecha:** 2026-10-11
- **Fase:** 4
- **Commit:** `feat(node-api): valida el ID token de Logto en lugar del JWT de Auth0`

## Qué hicimos
Cambiamos el proveedor de identidad de Auth0 a Logto (tenant `PruebaTecnica`) y adaptamos la validación del token en node-api.

- **Variables:** `LOGTO_ENDPOINT` (solo el origen, p. ej. `https://00rojz.logto.app`) y `LOGTO_APP_ID`. El issuer se deriva como `<endpoint>/oidc` y el JWKS como `<endpoint>/oidc/jwks`.
- **Validación:** firma con el JWKS, issuer, expiración (`exp`/`nbf`) y audiencia (`aud` debe ser el `LOGTO_APP_ID`). Algoritmos permitidos: `ES384`, `ES256` y `RS256`; `none` y `HS256` se rechazan. Logto firma con `ES384` (curva P-384), no con `RS256` como Auth0.
- **Sin scopes:** se eliminó el middleware `require-scope`. Cualquier usuario autenticado puede usar la ruta; token ausente o inválido responde `401`.
- **Contrato:** OpenAPI, README y `docs/api-contract.md` describen el Bearer como "ID token de Logto".

## Por qué
- La integración con Logto es más simple para el front (SDK React con callback) y el usuario decidió cambiar de proveedor.
- Logto Free no incluye API resources propios con permisos (RBAC es de pago desde el 2026-10-01). Sin API resource no hay access token JWT con scopes propios, así que el front envía el ID token, que sí es un JWT verificable con el JWKS del tenant.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Proveedor | Seguir con Auth0; Amazon Cognito; **Logto** | Integración más simple; decisión del usuario |
| Token que valida la API | Access token con API resource; recurso de gestión de Logto; **ID token** | Free no permite API resources propios; el recurso de gestión es la API de administración de Logto y no debe aceptarse como credencial de esta API |
| Autorización | Scopes `qr:write` / `statistics:read`; **solo autenticación** | Sin RBAC no hay scopes; queda como mejora (Logto Pro + API resource) |
| Algoritmos | Solo `RS256`; **`ES384`, `ES256`, `RS256`** | Lo que firma Logto (verificado en su JWKS) sin aceptar `none` ni `HS256` |

El ID token está pensado para el cliente, no para una API; es un compromiso aceptado para esta prueba y está documentado.

## Cómo verificarlo
```
cd src/node-api
npm run lint && npm test
```
Sin token, `POST /api/v1/statistics` responde `401`. Un token con `aud` distinto al `LOGTO_APP_ID` también responde `401` (hay un test).

## Pendiente / siguiente
- Mismo cambio en go-api (paso 14).
- Frontend con Logto (paso 16).
