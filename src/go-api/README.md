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

## Verificacion

```bash
gofmt -l .
go vet ./...
go build ./...
bash scripts/check_dependency_rule.sh
```
