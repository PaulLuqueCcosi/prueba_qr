# Contrato de las APIs

Borrador para la Fase 1, basado en las respuestas del MVP (`docs/mvp-questions.md`). Los nombres de campos van en inglés y son los mismos en ambas APIs.

## Flujo
```
cliente ──POST /api/v1/qr──▶ go-api ──POST /api/v1/statistics──▶ node-api
        ◀── original, q, r, statistics ──┘◀──── statistics ──────┘
```
Cada API también puede llamarse por separado.

## go-api

### `POST /api/v1/qr`
Recibe una matriz rectangular, calcula su factorización QR (Gonum; Q completa m×m y R m×n), llama a node-api y devuelve todo junto.

Request:
```json
{ "matrix": [[12, -51, 4], [6, 167, -68], [-4, 24, -41]] }
```

Response `200`:
```json
{
  "original": [[...]],
  "q": [[...]],
  "r": [[...]],
  "statistics": {
    "max": 0,
    "min": 0,
    "average": 0,
    "sum": 0,
    "isDiagonal": { "original": false, "q": false, "r": false },
    "anyDiagonal": false
  }
}
```

Para cualquier forma rectangular, `q` es m×m y `r` es m×n. Las matrices anchas (filas < columnas) se resuelven factorizando el bloque inicial m×m con Gonum y calculando el resto de `r` como `Qᵀ·A₂`.

### `GET /health`
Response `200`: `{ "status": "ok" }`

## node-api

### `POST /api/v1/statistics`
Recibe las tres matrices y calcula las estadísticas sobre **todos sus valores juntos**. El diagonal se evalúa por matriz.

Request:
```json
{ "matrices": { "original": [[...]], "q": [[...]], "r": [[...]] } }
```

Response `200`: el objeto `statistics` de arriba.

### `GET /health`
Response `200`: `{ "status": "ok" }`

## Documentación interactiva (Swagger)
Cada API publica su especificación OpenAPI 3.0.3 en `GET /openapi.yaml` y una interfaz Swagger UI en `GET /docs` (go-api: `http://localhost:8080/docs`, node-api: `http://localhost:8081/docs`). Las specs son la versión ejecutable de este contrato y deben mantenerse alineadas con él.

## Matriz diagonal
Una matriz es diagonal si todo elemento fuera de la diagonal principal cumple `|x| ≤ tolerance`, también en matrices rectangulares. Tolerancia por defecto `1e-9`, configurable con `DIAGONAL_TOLERANCE` en node-api.

## Errores (ambas APIs)
```json
{ "error": { "code": "INVALID_MATRIX", "message": "Matrix must be rectangular and non-empty" } }
```

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `INVALID_JSON` | JSON mal formado |
| 422 | `INVALID_MATRIX` | Matriz vacía, filas de distinto largo o valores no numéricos |
| 422 | `NON_FINITE_RESULT` | (go-api) El resultado de la factorización QR no es finito, p. ej. valores cercanos a 1e308 |
| 404 | `NOT_FOUND` | Ruta desconocida |
| 413 | `PAYLOAD_TOO_LARGE` | Cuerpo de la petición mayor al límite (1 MB) |
| 502 | `UPSTREAM_UNAVAILABLE` | go-api no pudo comunicarse con node-api |
| 500 | `INTERNAL_ERROR` | Error inesperado |

## Configuración (variables de entorno)
| Variable | Servicio | Por defecto |
|---|---|---|
| `PORT` | ambos | go-api `8080`, node-api `8081` |
| `NODE_API_URL` | go-api | `http://localhost:8081` |
| `DIAGONAL_TOLERANCE` | node-api | `1e-9` |
