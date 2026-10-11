# node-api

API que calcula estadísticas (máximo, mínimo, promedio, suma y si es diagonal) sobre las matrices `original`, `q` y `r`. Contrato: `docs/api-contract.md`.

## Ejecución

Requiere Node 22.

```bash
npm install
npm run dev        # desarrollo con recarga
npm run build && npm start   # producción
```

Otros scripts: `npm run lint`, `npm run format`, `npm run typecheck`.

## Arquitectura

Hexagonal (puertos y adaptadores). La regla de dependencia apunta siempre hacia adentro:

```
main  ──►  adapters  ──►  application  ──►  domain
(wiring)   (HTTP, log)    (casos de uso,    (reglas puras)
                           puertos)
```

```
src/
├── domain/                      reglas puras: tipos, validación, diagonal, estadísticas, errores
├── application/
│   ├── ports/inbound/           qué puede pedirle el exterior a la app (calculate-statistics.port.ts)
│   ├── ports/outbound/          qué necesita la app del exterior (logger.port.ts)
│   └── use-cases/               implementaciones de los puertos de entrada
├── adapters/
│   ├── inbound/http/            Express: controladores, rutas, middleware, mapeo error -> HTTP
│   └── outbound/logging/        logger JSON que implementa LoggerPort
├── config/                      lectura y validación de variables de entorno
└── main/
    ├── composition-root.ts      único lugar donde se conectan adaptadores y puertos (`createApp`)
    └── server.ts                arranque: carga config y escucha el puerto
```

- `createApp(config, overrides)` no abre puerto; los tests pueden inyectar dobles (`logger`, `calculateStatistics`).
- Los controladores solo llaman al puerto de entrada; la traducción `InvalidMatrixError` -> 422 vive en el middleware HTTP.
- La regla se verifica con `no-restricted-imports` por carpeta en `eslint.config.js` (`npm run lint`).

## Documentación interactiva (Swagger)

Con el servidor en marcha (puerto por defecto `8081`):

- `GET http://localhost:8081/docs`: Swagger UI (assets incluidos en el paquete `swagger-ui-express`, funciona sin internet).
- `GET http://localhost:8081/openapi.yaml`: especificación OpenAPI 3.0.3 cruda.

La fuente única es `openapi/openapi.yaml` (escrita a mano). Se sirve desde el adaptador de entrada (`src/adapters/inbound/http/docs/`), el dominio y la aplicación no la conocen. Para comprobar que la spec parsea y que sus rutas existen en la app: `npm run check:openapi`.

## Variables de entorno

| Variable             | Por defecto | Descripción                                                                                             |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `PORT`               | `8081`      | Puerto HTTP                                                                                             |
| `DIAGONAL_TOLERANCE` | `1e-9`      | Un elemento fuera de la diagonal cuenta como cero si `\|x\| <= tolerancia`. Debe ser un número positivo |

## Ejemplo

```bash
curl -X POST http://localhost:8081/api/v1/statistics \
  -H "Content-Type: application/json" \
  -d '{"matrices":{"original":[[1,2],[3,4]],"q":[[1,0],[0,1]],"r":[[5,6],[0,7]]}}'

curl http://localhost:8081/health
```

Errores: `400 INVALID_JSON`, `404 NOT_FOUND`, `413 PAYLOAD_TOO_LARGE` (cuerpo mayor a 1 MB), `422 INVALID_MATRIX`, `500 INTERNAL_ERROR`.
