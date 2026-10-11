# 05 — go-api: versión mínima funcional

- **Fecha:** 2026-10-11
- **Fase:** 1
- **Commit:** `feat: agrega go-api con factorización QR y soporte de matrices anchas`

## Qué hicimos
Implementamos `go-api` (Go 1.27, Fiber v3, Gonum v0.17) con la misma arquitectura de puertos y adaptadores que `node-api`, y la conectamos con ella.

- `POST /api/v1/qr`: valida la matriz, calcula la factorización QR, llama a `node-api` y devuelve `original`, `q`, `r` y `statistics`.
- `GET /health`.
- Errores: `400` JSON mal formado, `422` matriz inválida o resultado no finito, `413` cuerpo mayor a 1 MB, `404`, `502` si `node-api` no responde y `500` error interno (con recuperación de pánicos).
- Configuración por variables de entorno (`PORT`, `NODE_API_URL`, `NODE_API_TIMEOUT_MS`) y logs JSON.
- `postman/go-api.postman_collection.json`: 25 casos de punta a punta (go-api → node-api), 126 aserciones.
- Documentación interactiva: `GET /docs` (Swagger UI) y `GET /openapi.yaml`. La especificación se embebe con `go:embed` en el adaptador HTTP de entrada y se valida con `scripts/check_openapi.sh`. La página `/docs` carga Swagger UI desde una CDN con versión fija (embeberlo pesa ~1.5 MB); la especificación no necesita internet.
- Documentación de la arquitectura en `docs/architecture.md`.

## Arquitectura
```
domain  <-  application  <-  adapters  <-  cmd
```
- `internal/domain`: matriz, resultado de la factorización y errores. Solo usa la librería estándar.
- `internal/application`: caso de uso `FactorizeMatrix` y sus puertos: `MatrixFactorizer`, `StatisticsClient` y `Logger`.
- `internal/adapters/inbound/http`: Fiber. `adapters/outbound/gonumqr`: QR con Gonum. `adapters/outbound/nodeapi`: cliente HTTP con timeout explícito.
- `cmd/server/main.go`: composición.
- `scripts/check_dependency_rule.sh` revisa el grafo real de imports con `go list -deps`.

## Decisión: matrices anchas (filas < columnas)
**Problema:** Gonum solo factoriza matrices con filas ≥ columnas; con una ancha entra en pánico. El enunciado pide "matriz rectangular", así que una ancha es una entrada válida.

**Opciones consideradas:**
1. Householder propio solo para las anchas — dos caminos de código y signos que pueden diferir.
2. Householder propio para todo — un camino, pero se descarta Gonum y hay ~60 líneas numéricas que probar y defender.
3. Rechazar con `422` y documentarlo — rápido, pero rechaza una entrada válida.
4. **Gonum sobre el bloque izquierdo cuadrado (elegida).**

**Decisión:** para A de m×n con m < n, se factoriza con Gonum solo el bloque izquierdo m×m, lo que da Q (m×m) y R₁. El resto de R se calcula como Qᵀ·A₂ y R = [R₁ | Qᵀ·A₂].

**Motivo:** como Q es ortogonal, A = Q·(QᵀA), y QᵀA es triangular superior, que es lo que debe ser R. Un solo criterio de signos, ~10 líneas y sin algoritmo propio que defender. R₁ se toma directo de Gonum para que lo que está debajo de la diagonal sean ceros exactos. Se comprobó en 5 casos (incluido un bloque izquierdo singular): |QR−A| ≤ 3e-15 y |QᵀQ−I| ≤ 4e-16.

**Salvedad:** la parte derecha de R sale de una multiplicación, así que puede tener errores de redondeo del orden de 1e-15.

## Otras decisiones
- Q es m×m y R es m×n para cualquier forma rectangular.
- Gonum deja la diagonal de R negativa (convención de Householder). Por eso las pruebas verifican propiedades (Q·R = A, QᵀQ ≈ I, R triangular superior) y no signos exactos.
- Se agregó el código `NON_FINITE_RESULT` (`422`) al contrato: con valores cercanos a 1e308 el resultado no es finito y no puede serializarse como JSON.
- **Cuerpos grandes:** el servidor reseteaba la conexión en vez de responder `413`. Se activó `StreamRequestBody` y un middleware que aplica el límite de 1 MB. Un cuerpo enorme (~30 MB) aún corta la conexión; se aceptó.
- La respuesta de `node-api` se decodifica a campos tipados del contrato; campos extra se descartan.
- No probado: el camino de timeout hacia `node-api` (el cliente tiene timeout explícito, 5000 ms por defecto).

## Cómo verificarlo
Con `node-api` en el puerto 8081:
```
cd src/go-api
gofmt -l . && go vet ./... && go build ./... && bash scripts/check_dependency_rule.sh
PORT=8080 go run ./cmd/server
```
Desde la raíz:
```
npx newman run postman/go-api.postman_collection.json -e postman/local.postman_environment.json
```
Resultado esperado: 25 requests, 126 aserciones, 0 fallos.

## Pendiente / siguiente
Fase 2: pruebas unitarias y de integración en ambas APIs. Después Docker (Fase 3).
