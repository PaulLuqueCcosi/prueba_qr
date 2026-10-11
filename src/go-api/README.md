# go-api

API en Go que calcula la factorizacion QR de una matriz (Gonum), consulta las estadisticas a `node-api` y devuelve todo junto. Contrato: `docs/api-contract.md`.

Stack: Go 1.27, Fiber v3, Gonum v0.17.

## Estructura (arquitectura hexagonal)

```
cmd/server/                      composicion: unico lugar que une adaptadores con puertos
internal/domain/                 Matrix, Factorization, Statistics, errores (sin dependencias externas)
internal/application/            caso de uso FactorizeMatrix + puertos (interfaces)
internal/adapters/inbound/http/  Fiber: handlers, DTOs, errores -> HTTP, logging, recover
internal/adapters/outbound/
  gonumqr/                       MatrixFactorizer con Gonum
  nodeapi/                       StatisticsClient (HTTP a node-api, con timeout)
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

Requiere `node-api` corriendo (por defecto en `http://localhost:8081`).

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

Si alguna es invalida, el proceso registra el error y termina con codigo 1.

## Ejemplo

```bash
curl -X POST localhost:8080/api/v1/qr \
  -H 'Content-Type: application/json' \
  -d '{"matrix":[[12,-51,4],[6,167,-68],[-4,24,-41]]}'

curl localhost:8080/health
```

## Errores

Formato: `{ "error": { "code", "message" } }`.

| HTTP | Codigo | Cuando |
|---|---|---|
| 400 | `INVALID_JSON` | JSON mal formado |
| 422 | `INVALID_MATRIX` | vacia, irregular, valores no numericos o `matrix` ausente |
| 422 | `NON_FINITE_RESULT` | el resultado desborda (Inf/NaN) |
| 404 | `NOT_FOUND` | ruta desconocida |
| 413 | `PAYLOAD_TOO_LARGE` | cuerpo mayor a 1 MB |
| 502 | `UPSTREAM_UNAVAILABLE` | node-api inaccesible, timeout o respuesta no 2xx |
| 500 | `INTERNAL_ERROR` | error inesperado (incluye panics recuperados) |

## Pruebas

Solo libreria estandar (`testing`); no necesitan servidores externos ni puertos fijos: node-api se simula con `httptest.NewServer` (puerto efimero) y la capa HTTP se prueba en proceso con `app.Test`.

```bash
go test ./...                                   # todo
go test -race ./...                             # detector de carreras (requiere cgo/gcc)
go test -coverprofile=cover.out ./... && go tool cover -func=cover.out
go test -coverprofile=cover.out ./... && go tool cover -html=cover.out   # reporte visual
```

Desde la raiz del repo: `make test-go` (o `make test` para go-api y node-api, `make check` para lint + pruebas + regla de dependencias).

Convencion: cada `*_test.go` vive junto al codigo que prueba y usa paquete externo (`package x_test`), de modo que solo se ejercita la API publica. Los nombres describen comportamiento (`TestFactorize_WideMatrix_ReconstructsOriginal`).

| Paquete | Que cubre |
|---|---|
| `domain` | validacion de `Matrix` (vacia, fila vacia, irregular, NaN/Inf, 1x1, alta/ancha/cuadrada) y tipos de error |
| `adapters/outbound/gonumqr` | pruebas de propiedades, nunca signos exactos: Q m×m, R m×n triangular superior, Q·R = A y QᵀQ = I (tolerancia 1e-9) para cuadradas, altas, anchas, rango deficiente, ceros, matrices aleatorias con semilla fija y la clasica `[[12,-51,4],[6,167,-68],[-4,24,-41]]`; incluye la guarda de regresion de matrices anchas (`Qᵀ·A₂`) y desbordes con 1e308 |
| `application` | `FactorizeMatrix` con puertos falsos: camino feliz, matriz invalida sin llamar puertos, propagacion de errores, resultado no finito |
| `adapters/outbound/nodeapi` | `StatisticsClient` contra un node-api falso: forma del request, decodificacion, no 2xx, JSON malformado, timeout, conexion rechazada, sin fugas de detalles internos |
| `adapters/inbound/http` | integracion con el caso de uso real y gonumqr: todos los codigos del contrato (200, 400, 404, 413 con `Content-Length` y chunked, 422, 500 por panic, 502), `/health`, `/openapi.yaml`, `/docs`, forma `{error:{code,message}}` y un log JSON por peticion |
| `adapters/outbound/logging` | una linea JSON por entrada, claves base no sobrescribibles, escrituras concurrentes |
| `config` | valores por defecto, validos e invalidos (`PORT`, `NODE_API_URL`, `NODE_API_TIMEOUT_MS`) |

Nota: las pruebas de 413 abren un listener en `127.0.0.1:0` (puerto efimero) porque `app.Test` no reproduce cuerpos chunked ni el cierre con bytes sin leer.

## Verificacion

```bash
gofmt -l .
go vet ./...
go build ./...
bash scripts/check_dependency_rule.sh
```
