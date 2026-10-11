# 03 — Respuestas del MVP

- **Fecha:** 2026-10-11
- **Fase:** Análisis (antes de la Fase 1)
- **Commit:** `docs: agrega análisis del enunciado y respuestas del MVP`

## Qué hicimos
Resolvimos las preguntas esenciales del análisis (Q1–Q7) con el cuestionario `docs/mvp-questions.md`. Solo se cubre lo necesario para que la solución funcione; JWT, frontend, despliegue y rendimiento quedan para después de la Fase 1.

## Decisiones
| # | Decisión | Motivo |
|---|---|---|
| Q1 | **Solo factorización QR.** | La funcionalidad requerida pide QR. La "rotación" del enunciado se interpreta como uno de los métodos para obtenerla (rotaciones de Givens), y no hay rotaciones en el listado de funciones. |
| Q2 | **El cliente llama a Go y Go llama a Node.** Cada API también puede llamarse por separado. | Para la demo basta ese flujo; más adelante ambas estarán protegidas con JWT. |
| Q3 | **Node recibe tres matrices: la original, Q y R.** | Las estadísticas se calculan sobre las tres. |
| Q4 | **Estadísticas sobre las tres matrices juntas** (máximo, mínimo, promedio y suma total). El diagonal se evalúa por matriz. | El enunciado habla de "los valores de las matrices", en plural. |
| Q5 | **Diagonal si todo lo que está fuera de la diagonal principal es ≈ 0, con tolerancia documentada (1e-9), también en matrices rectangulares.** | Con decimales casi nunca hay ceros exactos; la tolerancia debe ser clara y estar documentada. |
| Q6 | **Gonum** para la QR, con **Q completa (m×m) y R (m×n)**. | Menos código y librería probada. |
| Q7 | **Validaciones mínimas:** matriz vacía, filas de distinto largo y valores no numéricos (`422`); JSON mal formado (`400`). | Cubren los casos esenciales de entrada. |

## Cambio respecto a la propuesta inicial
En Q3 elegimos que Node reciba también la matriz original (la propuesta era solo Q y R). Esto cambia el contrato: Node recibe `original`, `q` y `r`.

## Cómo verificarlo
Revisar `docs/mvp-questions.md`: cada pregunta tiene su opción marcada y su respuesta.

## Pendiente / siguiente
Redactar `docs/api-contract.md` con estas decisiones, pedir confirmación y arrancar la Fase 1.
