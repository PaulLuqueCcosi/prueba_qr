# Pruebas

Escribí pruebas automatizadas en las tres piezas. Mi principio común: **las pruebas no necesitan servidores externos, internet ni puertos fijos**. Simulo en proceso todo lo externo (otra API, el JWKS de Logto, el navegador), así la suite es rápida y determinista.

## Cómo correrlo todo

Desde la raíz del repo:

```bash
make test     # pruebas: go-api + node-api + frontend
```

> Los targets de `make` están pensados para **Git Bash** (en Windows, no PowerShell/CMD). El lint se corre en cada servicio (ver abajo).

Por servicio:

```bash
make test-go        # go test ./...
make test-node      # vitest run
make test-frontend  # vitest run (jsdom)
```

## Qué estrategia seguí

Mis pruebas verifican **comportamiento, no implementación**: ejercito el núcleo de negocio a través de su API pública y pruebo los adaptadores doblando los puertos de la arquitectura hexagonal. Por eso, si cambio una librería (Gonum, Express) o un detalle interno, las pruebas no se rompen mientras el comportamiento se mantenga.

| Tipo | Dónde | Cómo se aísla |
|---|---|---|
| **Unitarias de dominio** | QR, estadísticas, validación de matriz, diagonal | Funciones puras, sin dependencias |
| **De aplicación** | Casos de uso (`FactorizeMatrix`, `CalculateStatistics`) | Puertos falsos (factorizador, cliente de estadísticas, logger) |
| **De adaptadores** | HTTP, cliente a node-api, verificador de JWT, logger | `httptest` / `supertest` en proceso, sin abrir puertos |
| **De integración HTTP** | Toda la ruta con el caso de uso real | `app.Test` (Go) / `createApp` (Node): peticiones en memoria |

## go-api (Go `testing`)

Solo librería estándar. node-api se simula con `httptest.NewServer` (puerto efímero), el JWKS con claves ECDSA P-384 generadas en la propia prueba, y la capa HTTP corre en proceso con `app.Test` inyectando un `TokenVerifier` falso.

Cobertura destacada:
- **QR como propiedades, nunca signos exactos:** `Q·R = A`, `Qᵀ·Q = I`, R triangular superior (tolerancia `1e-9`) para matrices cuadradas, altas, anchas, de rango deficiente, con ceros y aleatorias con semilla fija; incluye la guarda de regresión de matrices anchas (`Qᵀ·A₂`) y desbordes con `1e308`.
- **Autenticación:** token válido, `aud` string o lista, tolerancia de reloj, expirado, `nbf` futuro, `aud`/`iss` incorrectos, firma de otra clave, `alg: none`, HS256 firmado con la clave pública (confusión de algoritmo), algoritmo no permitido, `kid` desconocido (con límite de refrescos) y JWKS caído/timeout (falla cerrado).
- **Reenvío del token:** node-api recibe el **mismo** `Authorization` que envió el cliente; un 401/403 del upstream se traduce a 502 sin filtrar token ni cuerpo.
- **Todos los códigos del contrato** (200/400/401/404/413/422/500/502), un log JSON por petición y CORS (preflight antes de autenticar).

Comandos extra:

```bash
cd src/go-api
go test -race ./...                                       # detector de carreras (requiere cgo)
go test -coverprofile=cover.out ./... && go tool cover -html=cover.out
```

Detalle por paquete: [src/go-api/README.md](../src/go-api/README.md#pruebas).

## node-api (Vitest + supertest)

Las peticiones HTTP se hacen en proceso contra `createApp(config, overrides)`, sin abrir puertos. Se inyectan dobles (`logger`, `calculateStatistics`, `tokenVerifier`).

Cobertura destacada:
- **domain:** validador de matrices (vacía, filas desiguales, `NaN`/`Infinity`, 1x1, altas y anchas), diagonal con tolerancia (incluido el límite `|x| == tolerancia` y rectangulares) y estadísticas sobre las tres matrices juntas (negativos, decimales, suma compensada, 1e6 valores sin desbordar).
- **application:** `CalculateStatistics` con tolerancia inyectada y `anyDiagonal`.
- **adapters:** integración HTTP (200/422/400/404/413/500 sin filtrar el mensaje interno, `/health`, `/openapi.yaml`, `/docs`) y el logger JSON.

```bash
cd src/node-api
npm test                # una pasada
npm run test:coverage   # cobertura v8 (consola + HTML en coverage/)
```

Detalle: [src/node-api/README.md](../src/node-api/README.md#pruebas).

## frontend (Vitest + jsdom)

Sin red: validación y resize de la matriz, parseo/carga de JSON, cliente de API (cabecera Bearer y mapeo de errores), i18n, y pruebas de componente con `useLogto` simulado (navegación del sidebar, panel QR, resultados que sobreviven al flag de carga del SDK).

```bash
cd src/frontend
npm test
```

Detalle: [src/frontend/README.md](../src/frontend/README.md#pruebas).

## Lint y regla de dependencias

El lint se corre en cada servicio desde su carpeta:

```bash
cd src/go-api    && gofmt -l . && go vet ./...
cd src/node-api  && npm run lint
cd src/frontend  && npm run lint
```

Además verifico que la arquitectura hexagonal no se rompa:

- **node-api:** reglas `no-restricted-imports` de ESLint por carpeta (`npm run lint`).
- **go-api:** `scripts/check_dependency_rule.sh` inspecciona el grafo real de imports con `go list -deps` (`cd src/go-api && bash scripts/check_dependency_rule.sh`).

## OpenAPI

Cada API publica su spec (`GET /openapi.yaml`) y Swagger UI (`GET /docs`). Hay un script por API que comprueba que la spec parsea y que sus rutas existen en el servidor en marcha:

```bash
cd src/go-api && bash scripts/check_openapi.sh http://localhost:8080
cd src/node-api && npm run check:openapi
```
