# node-api

API que calcula estadísticas (máximo, mínimo, promedio, suma y si es diagonal) sobre las matrices `original`, `q` y `r`. Contrato: `docs/api-contract.md`.

## Ejecución

Requiere Node 22.

```bash
npm install
npm run dev        # desarrollo con recarga
npm run build && npm start   # producción
```

Otros scripts: `npm run lint`, `npm run format`, `npm run typecheck`, `npm test` (ver [Pruebas](#pruebas)).

## Pruebas

Vitest + supertest. Las pruebas no necesitan ningún servidor en marcha: las peticiones HTTP se hacen en proceso contra `createApp(config, overrides)`, sin abrir puertos.

```bash
npm test               # una pasada (vitest run)
npm run test:watch     # modo watch
npm run test:coverage  # cobertura v8 (tabla en consola e informe HTML en coverage/)
```

Qué se cubre (comportamiento, no implementación):

- **domain**: validador de matrices (vacía, filas vacías o desiguales, valores no numéricos, `NaN`/`Infinity`, 1x1, altas y anchas), diagonal con tolerancia (ceros exactos, ruido, límite `|x| == tolerancia`, rectangulares) y estadísticas (las tres matrices juntas, negativos, decimales, suma compensada, 1e6 valores sin desbordar la pila).
- **application**: el caso de uso `CalculateStatistics` (camino feliz, `InvalidMatrixError` con el nombre de la matriz, tolerancia inyectada, `anyDiagonal`).
- **adapters**: integración HTTP con supertest (200, 422, 400, 404, 413, 500 sin filtrar el mensaje interno, `/health`, `/openapi.yaml`, `/docs`, forma `{error:{code,message}}`, una línea de log por petición con un logger falso) y el logger JSON.
- **config**: `PORT` y `DIAGONAL_TOLERANCE` (valores por defecto, inválidos, cero, negativos, `Infinity`).

Convención de ubicación: cada prueba va junto al código que prueba, con el mismo nombre en kebab-case y sufijo `.test.ts` (por ejemplo `statistics.service.ts` -> `statistics.service.test.ts`). Los títulos están en inglés y describen el comportamiento ("returns 422 when a row has a different length"). `tsconfig.build.json` excluye `*.test.ts`, así que no llegan a `dist/`. ESLint también revisa las pruebas; solo ellas pueden importar entre capas (por ejemplo, la prueba HTTP usa `createApp` de `main`).

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

| Variable             | Por defecto             | Descripción                                                                                                                             |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`               | `8081`                  | Puerto HTTP                                                                                                                             |
| `LOGTO_ENDPOINT`     | obligatoria             | Endpoint del tenant de Logto (solo origen, ej. `https://<tenant>.logto.app`). Issuer = `<endpoint>/oidc`, JWKS = `<endpoint>/oidc/jwks` |
| `LOGTO_APP_ID`       | obligatoria             | Application ID de la SPA en Logto: el `aud` de los ID tokens que se aceptan                                                             |
| `CORS_ORIGINS`       | `http://localhost:5173` | Orígenes permitidos, separados por comas. No admite `*`                                                                                 |
| `DIAGONAL_TOLERANCE` | `1e-9`                  | Un elemento fuera de la diagonal cuenta como cero si `\|x\| <= tolerancia`. Debe ser un número positivo                                 |

## Seguridad (JWT)

`POST /api/v1/statistics` exige `Authorization: Bearer <token>` con el **ID token** de Logto del usuario (no hay scopes ni API resource: el plan Free de Logto no los incluye; cualquier usuario autenticado está autorizado). La API valida el token ella misma (defensa en profundidad):

- Firma con las claves públicas del tenant (`<endpoint>/oidc/jwks`, en caché con timeout de 5 s y cooldown de 30 s). No hay ningún secreto en la API.
- Solo algoritmos asimétricos `ES384` (el que usa Logto por defecto), `ES256` y `RS256` (bloquea `alg: none` y la confusión de algoritmos), `iss`, `aud` (= `LOGTO_APP_ID`), `exp` obligatorio y `nbf`, con 5 s de tolerancia.
- `401 UNAUTHORIZED` si falta o es inválido el token; El cuerpo nunca revela la causa ni el token; los logs solo llevan un código de motivo.
- Públicos: `/health`, `/docs`, `/openapi.yaml` y los preflight `OPTIONS`.
- Sin `LOGTO_ENDPOINT`/`LOGTO_APP_ID` válidos el proceso termina con código 1.

Hexagonal: el puerto `TokenVerifierPort` (`application/ports/outbound`) lo implementa `JoseTokenVerifier` (`adapters/outbound/auth`, librería `jose`); los middleware `authenticate` y `cors` viven en `adapters/inbound/http/middleware`. Los tests inyectan un verificador falso con `createApp(config, { tokenVerifier })`, y el adaptador real se prueba con claves ES384 generadas en local (sin red).

## Ejemplo

```bash
curl -X POST http://localhost:8081/api/v1/statistics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"matrices":{"original":[[1,2],[3,4]],"q":[[1,0],[0,1]],"r":[[5,6],[0,7]]}}'

curl http://localhost:8081/health
```

Errores: `401 UNAUTHORIZED`, `400 INVALID_JSON`, `404 NOT_FOUND`, `413 PAYLOAD_TOO_LARGE` (cuerpo mayor a 1 MB), `422 INVALID_MATRIX`, `500 INTERNAL_ERROR`.
