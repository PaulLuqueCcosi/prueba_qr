# 07 — Pruebas automatizadas (Fase 2)

- **Fecha:** 2026-10-11
- **Fase:** 2
- **Commit:** `test(node-api): agrega pruebas unitarias y de integración` y `test(go-api): agrega pruebas unitarias y de integración`

## Qué hicimos
Agregamos pruebas unitarias y de integración a las dos APIs, y un `Makefile` en la raíz que las ejecuta junto con los chequeos de calidad.

| API | Herramienta | Pruebas | Cobertura |
|---|---|---|---|
| node-api | Vitest + supertest | 97 en 7 archivos | 100% de sentencias, líneas y funciones; 98.5% de ramas |
| go-api | `testing` de la librería estándar | 63 pruebas (171 con subpruebas) | entre 93% y 100% por paquete; 99% en el adaptador HTTP |

- **Dominio y casos de uso:** se prueban con puertos falsos, sin levantar servidores ni librerías externas. Es la ventaja concreta de la arquitectura hexagonal.
- **Integración:** cada caso del contrato (`200`, `400`, `404`, `413`, `422`, `500`, `502`) se prueba contra la app real dentro del proceso, sin puertos fijos.
- **go-api → node-api:** el cliente HTTP se prueba contra un servidor falso, incluyendo timeout, respuestas no 2xx, JSON inválido y conexión rechazada.
- **Factorización QR por propiedades:** como los signos dependen de la convención de Gonum, se verifica Q·R = A, QᵀQ ≈ I y R triangular superior (tolerancia 1e-9) en matrices cuadradas, altas, anchas, 1×1, de rango deficiente y aleatorias con semilla fija. Las anchas son la guarda de regresión del enfoque del bloque izquierdo (paso 05).
- **Makefile:** `make test`, `make lint` y `make check` (lint, pruebas y la regla de dependencias), además de atajos para levantar las APIs.

## Por qué
- Las pruebas de propiedades no dependen de signos ni de redondeos exactos, así que no se rompen por detalles de la librería.
- Probar con servidores falsos y puertos efímeros hace las pruebas rápidas (~1 s en Node, ~4 s en Go), deterministas y ejecutables en cualquier máquina.
- Se comprobó que las pruebas detectan errores: se rompió a propósito la comparación de la diagonal en Node (una prueba falló) y el cálculo de matrices anchas y un código de estado en Go (fallaron 10 y 2 pruebas). Al restaurar, todo volvió a verde.

## Decisiones
- No se agregaron pruebas solo para llegar al 100% (por ejemplo, el valor por defecto de `overrides` en la composición de Node).
- En `/openapi.yaml` de go-api solo se verifica la cabecera y las claves principales; no se agregó una librería de YAML solo para las pruebas.
- Las pruebas del frontend quedan fuera de alcance (ver paso 06).

## Limitaciones conocidas
- **`go test -race` no se pudo ejecutar:** no hay `gcc` en esta máquina (cgo desactivado). Las pruebas se escribieron sin estado compartido, pero esa verificación queda pendiente.
- **Respuesta `413` en go-api:** cuando se rechaza un cuerpo mayor a 1 MB mientras el cliente aún está enviando, el sistema operativo puede reiniciar la conexión y el cliente ve "connection reset" en vez del `413`. Es un límite del streaming de cuerpos de Fiber/fasthttp. Las pruebas reintentan hasta 8 veces; cualquier respuesta que llegue debe ser `413`. En node-api no ocurre.
- El adaptador de Gonum no detecta desbordes (con valores cercanos a 1e308 devuelve Inf/NaN); lo rechaza el caso de uso con `NON_FINITE_RESULT`, como define el contrato.

## Cómo verificarlo
Desde la raíz del repositorio:
```
make check
```
Ejecuta `gofmt`, `go vet`, ESLint, las pruebas de ambas APIs y la regla de dependencias de go-api. Resultado esperado: todo en verde.

## Pendiente / siguiente
Fase 3: Docker (un `Dockerfile` por servicio y `docker-compose.yml`).
