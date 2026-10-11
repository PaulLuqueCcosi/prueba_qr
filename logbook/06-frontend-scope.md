# 06 — Alcance del frontend

- **Fecha:** 2026-10-11
- **Fase:** 2 (decisión que aplica a la Fase 6)
- **Commit:** `docs: registra el alcance del frontend`

## Qué decidimos
El frontend es opcional en el enunciado y **no es el foco de la prueba**. La intención es no complicarnos con él: se construye al final (Fase 6), con un stack simple y solo lo necesario para probar las APIs.

## Stack
- **React** con **Vite** y TypeScript.
- **shadcn/ui** (sobre Tailwind) como librería de componentes, para no diseñar componentes a mano.

## Ubicación: proyecto independiente
El frontend vive en su propia carpeta, `src/frontend/`, como un proyecto separado dentro del mismo repositorio: con su `package.json`, sus dependencias, su build y, más adelante, su `Dockerfile`. No comparte código con `go-api` ni con `node-api`; solo los consume por HTTP, como cualquier otro cliente.

Así no se mezclan responsabilidades y encaja con lo que viene: cada pieza (go-api, node-api y frontend) se contenerizará por separado (Fase 3), se protegerá con autenticación (Fase 4) y se desplegará de forma independiente (Fase 5).

## Alcance mínimo
Lo justo para probar el sistema de punta a punta:
- Ingresar una matriz (por ejemplo, un cuadro de texto con JSON o una cuadrícula simple) y algunos ejemplos precargados.
- Enviar la matriz a `go-api` y mostrar `original`, `q`, `r` y las estadísticas.
- Mostrar los errores de la API de forma legible.
- URL de la API configurable y, cuando llegue la Fase 4, un campo para el token JWT.

Queda **fuera de alcance**: diseño elaborado, manejo de estado complejo, internacionalización y pruebas del frontend.

## Por qué
- El enunciado evalúa las dos APIs; el frontend solo suma si ayuda a demostrarlas.
- Un stack conocido y con componentes ya hechos reduce el tiempo y el riesgo.
- Las APIs ya se pueden probar con Swagger y Postman, así que el frontend no es un requisito para validar el trabajo.

## Cómo verificarlo
No aplica todavía: no hay código del frontend. Esta decisión se aplicará en la Fase 6.

## Pendiente / siguiente
Fase 2 en curso: pruebas unitarias y de integración de `node-api` y luego de `go-api`.
