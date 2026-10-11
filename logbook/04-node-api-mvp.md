# 04 — node-api: versión mínima funcional

- **Fecha:** 2026-10-11
- **Fase:** 1
- **Commit:** `feat: agrega node-api con arquitectura hexagonal y pruebas Postman`

## Qué hicimos
Implementamos `node-api` (Node.js 22, TypeScript, Express) según `docs/api-contract.md`, con arquitectura de **puertos y adaptadores**, y una colección de Postman para probarla de punta a punta.

- `POST /api/v1/statistics`: recibe `original`, `q` y `r`; devuelve máximo, mínimo, promedio, suma total y si cada matriz es diagonal.
- `GET /health`.
- Errores con un formato único: `400` JSON mal formado, `422` matriz inválida, `404` ruta desconocida, `413` cuerpo demasiado grande, `500` error interno.
- Configuración por variables de entorno (`PORT`, `DIAGONAL_TOLERANCE`) y logs JSON a stdout.
- `postman/node-api.postman_collection.json`: 23 casos, 69 aserciones, ejecutables con `newman`.
- Documentación interactiva: `GET /docs` (Swagger UI) y `GET /openapi.yaml`. La especificación OpenAPI 3.0.3 está escrita a mano (`openapi/openapi.yaml`), se valida con `npm run check:openapi` y vive solo en el adaptador HTTP de entrada.

## Arquitectura
```
domain  <-  application  <-  adapters  <-  main
```
- `domain/`: reglas puras (validación, diagonal, estadísticas). No importa Express ni nada de Node.
- `application/`: caso de uso `CalculateStatistics` y sus puertos (entrada: el caso de uso; salida: `LoggerPort`).
- `adapters/inbound/http`: controladores, rutas y middleware de Express. `adapters/outbound/logging`: logger JSON.
- `main/composition-root.ts`: único lugar donde se conectan adaptadores con puertos. `createApp()` no levanta el servidor, así que las pruebas pueden construir la app con dobles.
- La dirección de las dependencias se hace cumplir con reglas de ESLint (`no-restricted-imports`). Se comprobó que el lint falla si el dominio importa un adaptador.

## Por qué
- **Puertos y adaptadores:** las reglas de negocio no dependen del framework; se pueden probar solas y cambiar Express por otro sin tocar el dominio. Además la regla de dependencias es verificable, no solo una convención.
- **Diagonal con tolerancia:** con decimales casi nunca hay ceros exactos; la tolerancia (`1e-9`) es configurable y está documentada en el código.
- **Máximo y mínimo con bucles simples:** `Math.max(...array)` desborda la pila con matrices grandes.
- **Suma compensada (Neumaier):** reduce el error de redondeo al sumar muchos decimales.
- **Postman + newman:** prueban el contrato HTTP sin depender del código y sirven igual en CI.

## Decisiones
- ESM con `module: NodeNext` (los imports relativos llevan sufijo `.js`).
- Se agregó el código `PAYLOAD_TOO_LARGE` (`413`) al contrato.
- Un cuerpo sin el objeto `matrices` responde `422 INVALID_MATRIX`.
- Solo existe el puerto de salida que tiene consumidor real (`LoggerPort`); no se inventaron puertos sin uso.
- Limitación conocida: si la suma de valores finitos supera ~1.8e308, `sum` sería `Infinity` y JSON lo serializa como `null`. Se resolverá con un límite de tamaño de entrada.

## Cómo verificarlo
Desde `src/node-api`:
```
npm install
npm run typecheck && npm run lint && npm run build
PORT=8081 node dist/main/server.js
```
Y desde la raíz del repo:
```
npx newman run postman/node-api.postman_collection.json -e postman/local.postman_environment.json
```
Resultado esperado: 23 requests, 69 aserciones, 0 fallos.

## Pendiente / siguiente
Implementar `go-api` (QR con Gonum y llamada a node-api). Las pruebas unitarias son de la Fase 2.
