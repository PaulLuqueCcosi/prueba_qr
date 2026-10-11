# Pruebas automatizadas con Postman

Colecciones que prueban las APIs de punta a punta por HTTP, sin depender del código. Se ejecutan con [newman](https://github.com/postmanlabs/newman), el runner de línea de comandos de Postman, así que sirven igual en la terminal y en CI.

| Archivo | Contenido |
|---|---|
| `node-api.postman_collection.json` | 23 casos de node-api (estadísticas, diagonal, validaciones, errores, tamaño) |
| `go-api.postman_collection.json` | 25 casos de go-api de punta a punta (go-api → node-api): QR de matrices cuadradas, altas y anchas, validaciones y errores |
| `local.postman_environment.json` | Variables `nodeApiUrl` (por defecto `http://localhost:8081`) y `goApiUrl` (por defecto `http://localhost:8080`) |

## Cómo ejecutarlas
1. Levantar node-api:
   ```
   cd src/node-api
   npm install && npm run build
   PORT=8081 node dist/main/server.js
   ```
2. Para la colección de go-api, levantar también go-api (necesita node-api corriendo):
   ```
   cd src/go-api
   PORT=8080 go run ./cmd/server
   ```
3. En otra terminal, desde la raíz del repo:
   ```
   npx newman run postman/node-api.postman_collection.json -e postman/local.postman_environment.json
   npx newman run postman/go-api.postman_collection.json -e postman/local.postman_environment.json
   ```

La colección de node-api solo necesita node-api. La de go-api necesita **ambos** servicios, porque cada petición pasa por go-api y luego por node-api.

También se puede importar la colección y el entorno en la aplicación de Postman.

## Qué cubre
- Cálculo correcto de máximo, mínimo, promedio y suma sobre las tres matrices.
- Matrices cuadradas y rectangulares, negativos, decimales y 1×1.
- Diagonal: todas, ninguna y los dos lados de la tolerancia (`1e-12` dentro, `1e-6` fuera).
- Validaciones `422` (vacía, fila vacía, no rectangular, texto, `null`, estructura inválida), `400` JSON mal formado, `404` y `413`.

### go-api
- Como los signos y el redondeo de la factorización pueden variar, los tests verifican propiedades y no valores fijos: `q` es m×m, `r` es m×n y triangular superior, `Q·R` reconstruye `original`, `QᵀQ ≈ I`, `original` replica la entrada y las estadísticas coinciden con las calculadas sobre `original`, `q` y `r` (tolerancia `1e-9`).
- Casos: 3×3 clásico (con `|diag(r)|` = 14, 175, 35), alta 3×2, anchas 2×3, 1×3 y 2×4, 1×1, columna 3×1, rango deficiente, ceros, negativos y decimales.
- Errores: `INVALID_MATRIX` (vacía, fila vacía, irregular, texto, `null`, `matrix` no es arreglo, ausente, cuerpo arreglo), `INVALID_JSON` (mal formado y cuerpo vacío), `NON_FINITE_RESULT` (valores cercanos a `1e308`), `PAYLOAD_TOO_LARGE` (cuerpo de ~1,2 MB), `NOT_FOUND` y `GET /health`.
