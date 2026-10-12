# go-api

API en Go que calcula la factorizacion QR de una matriz (Gonum), consulta las estadisticas a `node-api` y devuelve todo junto. Contrato: `docs/api-contract.md`.

Stack: Go 1.27, Fiber v3, Gonum v0.17, golang-jwt v5 + keyfunc v3 (validacion de JWT de Logto).

## Estructura (arquitectura hexagonal)

```
cmd/server/                      composicion: unico lugar que une adaptadores con puertos
internal/domain/                 Matrix, Factorization, Statistics, errores (sin dependencias externas)
internal/application/            caso de uso FactorizeMatrix + puertos (interfaces)
internal/adapters/inbound/http/  Fiber: handlers, DTOs, errores -> HTTP, logging, recover, CORS, authenticate
internal/adapters/outbound/
  auth/                          TokenVerifier: JWT ES384 de Logto con JWKS remoto en cache
  gonumqr/                       MatrixFactorizer con Gonum
  nodeapi/                       StatisticsClient (HTTP a node-api, con timeout, reenvia el token)
  logging/                       logs JSON de una linea a stdout
internal/config/                 variables de entorno validadas al arrancar
scripts/check_dependency_rule.sh verifica la regla de dependencias
```

```
cmd ──▶ adapters ──▶ application ──▶ domain
          (inbound/outbound)
```

Las flechas indican "importa a". `domain` no importa nada del proyecto; `application` solo importa `domain`; los adaptadores no se importan entre si.

## Ejecucion

```bash
go run ./cmd/server
# o
go build -o go-api ./cmd/server && ./go-api
```

Requiere `node-api` corriendo (por defecto en `http://localhost:8081`) y las variables `LOGTO_ENDPOINT` y `LOGTO_APP_ID` (ver abajo); sin ellas el proceso no arranca.

## Documentacion interactiva (Swagger)

Con el servidor en marcha (puerto por defecto `8080`):

- `GET http://localhost:8080/docs`: Swagger UI. Carga los assets desde jsDelivr (`swagger-ui-dist@5.17.14`), por lo que la pagina necesita internet; la spec en si no.
- `GET http://localhost:8080/openapi.yaml`: especificacion OpenAPI 3.0.3 cruda.

La fuente unica es `internal/adapters/inbound/http/openapi/openapi.yaml` (escrita a mano), embebida con `go:embed` en el adaptador HTTP de entrada. Para comprobar que sus rutas existen en un servidor en marcha: `bash scripts/check_openapi.sh [url-base]`.

## Variables de entorno

| Variable | Por defecto | Descripcion |
|---|---|---|
| `PORT` | `8080` | Puerto de escucha (1-65535) |
| `NODE_API_URL` | `http://localhost:8081` | URL base de node-api (http/https) |
| `NODE_API_TIMEOUT_MS` | `5000` | Timeout de la llamada a node-api, en ms |
| `LOGTO_ENDPOINT` | (obligatoria) | Endpoint del tenant de Logto: solo el origen, sin ruta (p. ej. `https://<tenant>.logto.app`). El issuer esperado es `<endpoint>/oidc` (sin barra final) y las claves se leen de `<endpoint>/oidc/jwks` |
| `LOGTO_APP_ID` | (obligatoria) | Application ID de la SPA en Logto: el `aud` de los ID tokens que se aceptan |
| `CORS_ORIGINS` | `http://localhost:5173` | Origenes permitidos separados por comas; sin comodin ni rutas |

Si alguna es invalida o falta una obligatoria, el proceso registra el error y termina con codigo 1. No hay ningun secreto: solo se usan claves publicas (JWKS).

## Autenticacion (JWT de Logto)

`POST /api/v1/qr` exige `Authorization: Bearer <id_token>`: el **ID token** de Logto del usuario (el plan Free de Logto no permite API resources ni scopes). Cualquier usuario autenticado esta autorizado. go-api valida el token por si mismo (no confia en que otro componente lo haya hecho):

- Firma asimetrica (**ES384**, el algoritmo por defecto de Logto; tambien `ES256` y `RS256`) con las claves publicas del tenant (JWKS en cache). Se rechazan `alg: none`, HS* y cualquier otro algoritmo (evita el ataque de confusion de algoritmo).
- `iss` y `aud` exactos, `exp` obligatorio, `nbf` si existe, con 5 s de tolerancia de reloj, y `sub` obligatorio.
- Sin scopes: no hay comprobacion de permisos, solo identidad valida (`aud` = `LOGTO_APP_ID`).
- Publicas: `GET /health`, `GET /docs`, `GET /openapi.yaml` y los preflight CORS (`OPTIONS`).

La autenticacion corre **antes** de leer el cuerpo: una peticion sin token valido recibe 401 aunque su JSON sea invalido (no se parsea). El limite de 1 MB se sigue aplicando a las peticiones autenticadas.

**JWKS:** se descarga al arrancar y se refresca cada 10 min; cada descarga tiene timeout de 5 s. Un `kid` desconocido fuerza como maximo un refresco cada 30 s, para que tokens basura no saturen al proveedor. Si el JWKS no esta disponible el servidor arranca igual, pero rechaza los tokens cuya clave no tenga en cache (falla cerrado). Esa causa se registra como `key_unavailable` y, por paridad con node-api, responde 401 (no 503): el cliente no distingue una caida del proveedor de un token invalido.

**Reenvio del token (opcion A):** el middleware deja el token verificado en el `context` (`application.WithAccessToken`); el cliente de node-api lo lee y envia `Authorization: Bearer <mismo token>`. node-api lo valida otra vez (defensa en profundidad). Si node-api responde 401/403, go-api devuelve 502 `UPSTREAM_UNAVAILABLE` sin exponer el estado ni el cuerpo del upstream. El token nunca se escribe en logs ni en mensajes de error; en los logs solo aparece un codigo corto (`missing_or_malformed_header`, `expired`, `invalid_signature`, `insufficient_scope`, ...).

**CORS:** lista blanca de origenes (`CORS_ORIGINS`), metodos `GET,POST,OPTIONS` y cabeceras `Content-Type, Authorization`. El preflight se responde (204) antes de autenticar; los origenes no permitidos no reciben cabeceras CORS.

## Ejemplo

```bash
curl -X POST localhost:8080/api/v1/qr \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"matrix":[[12,-51,4],[6,167,-68],[-4,24,-41]]}'

curl localhost:8080/health
```

## Errores

Formato: `{ "error": { "code", "message" } }`.

| HTTP | Codigo | Cuando |
|---|---|---|
| 401 | `UNAUTHORIZED` | falta el header, token mal formado, firma/`iss`/`aud` invalidos o expirado. `WWW-Authenticate: Bearer` (con `error="invalid_token"` si se envio token) |
| 400 | `INVALID_JSON` | JSON mal formado |
| 422 | `INVALID_MATRIX` | vacia, irregular, valores no numericos o `matrix` ausente |
| 422 | `NON_FINITE_RESULT` | el resultado desborda (Inf/NaN) |
| 404 | `NOT_FOUND` | ruta desconocida |
| 413 | `PAYLOAD_TOO_LARGE` | cuerpo mayor a 1 MB |
| 502 | `UPSTREAM_UNAVAILABLE` | node-api inaccesible, timeout o respuesta no 2xx (incluye 401/403 al reenviar el token) |
| 500 | `INTERNAL_ERROR` | error inesperado (incluye panics recuperados) |

## Pruebas

Solo libreria estandar (`testing`); no necesitan servidores externos, internet ni puertos fijos: node-api se simula con `httptest.NewServer` (puerto efimero), el JWKS tambien (claves ECDSA P-384 generadas en la prueba con `crypto/ecdsa`) y la capa HTTP se prueba en proceso con `app.Test`, inyectando un `TokenVerifier` falso.

```bash
go test ./...                                   # todo
go test -race ./...                             # detector de carreras (requiere cgo/gcc)
go test -coverprofile=cover.out ./... && go tool cover -func=cover.out
go test -coverprofile=cover.out ./... && go tool cover -html=cover.out   # reporte visual
```

Desde la raiz del repo: `make test-go` (o `make test` para las tres piezas). Los targets de `make` corren en Git Bash. El lint y la regla de dependencias se corren en esta carpeta (ver la seccion Verificacion mas abajo).

Convencion: cada `*_test.go` vive junto al codigo que prueba y usa paquete externo (`package x_test`), de modo que solo se ejercita la API publica. Los nombres describen comportamiento (`TestFactorize_WideMatrix_ReconstructsOriginal`).

| Paquete | Que cubre |
|---|---|
| `domain` | validacion de `Matrix` (vacia, fila vacia, irregular, NaN/Inf, 1x1, alta/ancha/cuadrada) y tipos de error |
| `adapters/outbound/gonumqr` | pruebas de propiedades, nunca signos exactos: Q m×m, R m×n triangular superior, Q·R = A y QᵀQ = I (tolerancia 1e-9) para cuadradas, altas, anchas, rango deficiente, ceros, matrices aleatorias con semilla fija y la clasica `[[12,-51,4],[6,167,-68],[-4,24,-41]]`; incluye la guarda de regresion de matrices anchas (`Qᵀ·A₂`) y desbordes con 1e308 |
| `application` | `FactorizeMatrix` con puertos falsos (camino feliz, matriz invalida sin llamar puertos, propagacion de errores, resultado no finito); token en el `context`, `Claims.HasScope`, `TokenError` |
| `adapters/outbound/auth` | el verificador real con claves ECDSA P-384 locales y un JWKS en `httptest`: token valido, `aud` string o lista, tolerancia de reloj, expirado, `nbf` futuro, `aud`/`iss` incorrectos, sin `sub`/`exp`, firma de otra clave, `alg: none`, HS256 firmado con la clave publica (confusion de algoritmo), un algoritmo no permitido (ES512), basura, `kid` desconocido (con limite de refrescos), JWKS caido / 500 / colgado (`key_unavailable`, con timeout) y claves en cache que sobreviven a una caida |
| `adapters/outbound/nodeapi` | `StatisticsClient` contra un node-api falso: forma del request, decodificacion, no 2xx, JSON malformado, timeout, conexion rechazada, sin fugas de detalles internos; reenvio de `Authorization: Bearer` desde el `context` y 401/403 sin filtrar token ni cuerpo |
| `adapters/inbound/http` | integracion con el caso de uso real y gonumqr: todos los codigos del contrato (200, 400, 401, 404, 413 con `Content-Length` y chunked, 422, 500 por panic, 502), `/health`, `/openapi.yaml`, `/docs`, forma `{error:{code,message}}` y un log JSON por peticion. Autenticacion: sin header / header mal formado / token invalido / token valido, `WWW-Authenticate`, rutas publicas sin token, cuerpo sin parsear si no hay token (JSON roto sin token -> 401, no 400), el token nunca aparece en logs ni respuestas, node-api **recibe el mismo `Authorization`** que envio el cliente, node-api 401/403 -> 502 sin fugas, y CORS (preflight permitido/no permitido, antes de auth) |
| `adapters/outbound/logging` | una linea JSON por entrada, claves base no sobrescribibles, escrituras concurrentes |
| `config` | valores por defecto, validos e invalidos (`PORT`, `NODE_API_URL`, `NODE_API_TIMEOUT_MS`), `LOGTO_*` obligatorias y validadas (issuer `<endpoint>/oidc`), `CORS_ORIGINS` (defecto, normalizacion, rechazo de `*` y valores que no son origenes) |

Nota: las pruebas de 413 abren un listener en `127.0.0.1:0` (puerto efimero) porque `app.Test` no reproduce cuerpos chunked ni el cierre con bytes sin leer.

## Verificacion

```bash
gofmt -l .
go vet ./...
go build ./...
bash scripts/check_dependency_rule.sh
bash scripts/check_openapi.sh http://localhost:8080   # con el servidor en marcha
```
