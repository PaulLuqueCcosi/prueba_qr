# 14 — go-api: validación del ID token de Logto y reenvío a node-api

- **Fecha:** 2026-10-11
- **Fase:** 4
- **Commit:** `feat(go-api): valida el ID token de Logto y reenvía el token a node-api`

## Qué hicimos
Mismo cambio de proveedor que en node-api (paso 13), aplicado a go-api respetando la arquitectura hexagonal.

- **Variables:** `LOGTO_ENDPOINT` y `LOGTO_APP_ID`; el issuer (`<endpoint>/oidc`) y el JWKS (`<endpoint>/oidc/jwks`) se derivan de la primera. Si faltan o el endpoint no es un origen `http(s)`, el servicio no arranca (falla cerrado).
- **Verificador (adaptador de salida):** firma con el JWKS, issuer, `exp`/`nbf` y `aud` igual al `LOGTO_APP_ID`. Algoritmos permitidos: `ES384`, `ES256` y `RS256`.
- **Sin scopes:** se eliminó el middleware `require_scope.go`, el método `HasScope` y el mapeo a `403`. Token ausente o inválido responde `401`.
- **Reenvío:** go-api sigue reenviando a node-api el mismo token del cliente.
- **Contrato:** OpenAPI y README describen el Bearer como "ID token de Logto".

## Por qué
Ver el paso 13: el plan Free de Logto no permite API resources propios, así que se autentica con el ID token del usuario. La regla de dependencias se mantiene: el dominio y la aplicación no conocen Logto, solo el puerto del verificador y su adaptador.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Validación | Librería nueva; **la misma librería JWT/JWKS ya usada** | No agrega dependencias; solo cambia issuer, audiencia y algoritmos |
| Errores de autenticación | Distinguir `401` y `403`; **solo `401`** | Sin scopes no hay un caso de `403` |
| Reenvío del token | Token de servicio propio; **el del cliente** | Mismo criterio que en Auth0: node-api valida por su cuenta (defensa en profundidad) |

## Cómo verificarlo
```
cd src/go-api
go vet ./... && go test ./...
bash scripts/check_dependency_rule.sh
```
Sin token, `POST /api/v1/qr` responde `401`; con un token cuyo `aud` no es el de la app, también.

## Pendiente / siguiente
- Frontend con Logto: login por redirección, callback y envío del ID token (paso 16).
