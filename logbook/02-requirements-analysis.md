# 02 — Análisis del enunciado

- **Fecha:** 2026-10-10
- **Fase:** Análisis (antes de la Fase 1)
- **Commit:** `docs: agrega análisis del enunciado y respuestas del MVP` (el primer commit incluye los pasos 01 a 03)

## Objetivo de este paso
Entender bien el enunciado e identificar las preguntas y huecos que debemos completar nosotros antes de escribir código. Aquí no se implementa nada: se analiza.

## Qué entendimos del enunciado
- Dos APIs REST que se comunican por HTTP:
  - **Go (Fiber):** recibe una matriz rectangular (array de arrays de números), calcula su factorización QR y envía el resultado a la segunda API.
  - **Node.js (Express):** recibe las matrices resultantes y calcula máximo, mínimo, promedio, suma total y si alguna matriz es diagonal.
- Obligatorio: Docker, comunicación HTTP, servicios en la nube, código documentado.
- Opcional: frontend, JWT, pruebas unitarias y de integración.
- Se valora eficiencia, elegancia y poder defender las decisiones en entrevista. Si hay dudas, se espera tomar decisiones informadas y sustentarlas.

## Inconsistencias y huecos detectados
Estado: **abierta** (sin resolver) o **resuelta**. La propuesta es el punto de partida, no una decisión.

| # | Pregunta o hueco | Por qué importa | Propuesta | Estado |
|---|---|---|---|---|
| Q1 | La arquitectura dice que Go "realizará la **rotación** de la matriz", pero la funcionalidad pide la **factorización QR**. ¿Cuál es? | Define el núcleo de la API de Go | Solo QR; rotación como endpoint extra si se pide | abierta |
| Q2 | ¿Quién llama a quién? Go envía los datos a Node, pero el enunciado no dice quién responde al cliente. | Define el contrato público y los errores | El cliente llama a Go; Go llama a Node y devuelve Q, R y estadísticas juntos | abierta |
| Q3 | "Las matrices devueltas" está en plural: ¿Node recibe solo Q y R o también la matriz original? | Define qué datos entran a las estadísticas | Solo Q y R | abierta |
| Q4 | Estadísticas: ¿se calculan sobre todos los valores de Q y R juntos o por matriz? | Cambia el resultado del máximo, mínimo, promedio y suma | Sobre todos los valores juntos, más el diagonal por matriz | abierta |
| Q5 | "Matriz diagonal": ¿con qué tolerancia numérica y qué pasa con matrices no cuadradas (R suele ser m×n)? | Los flotantes casi nunca dan ceros exactos | Epsilon configurable (ej. 1e-9); diagonal si todo fuera de la diagonal principal es ≈ 0, también en matrices rectangulares | abierta |
| Q6 | QR: ¿librería (Gonum) o implementación propia? ¿Completa o reducida si m ≠ n? | Eficiencia y defensa en entrevista | Gonum primero; convención de QR documentada | abierta |
| Q7 | Validación de entrada: vacía, no rectangular, valores no numéricos, tamaño máximo, NaN/Infinito. | Robustez y seguridad | Rechazar con `422` y mensaje claro; definir tamaño máximo | abierta |
| Q8 | Nube: el enunciado no indica proveedor. | Define el despliegue | AWS Lambda con imágenes de contenedor | resuelta (ver paso 01) |
| Q9 | JWT (opcional): ¿quién emite el token y cómo se autentica Go ante Node? | Define la fase de seguridad | JWT propio primero; Go usa token de servicio | abierta |
| Q10 | Frontend (opcional): ¿qué tecnología y alcance? | Esfuerzo y tiempo | Pendiente de definir tras la Fase 1 | abierta |
| Q11 | Entregables: ¿repo, README, URL pública desplegada? El enunciado no lo especifica. | Qué debe estar listo para la entrevista | Repo con README, bitácora y URL pública | abierta |
| Q12 | Rendimiento: ¿tamaño esperado de las matrices? | Determina si "eficiente" exige algo más que un algoritmo correcto | Definir un límite razonable y documentarlo | abierta |
| Q13 | Matrices con rango deficiente o QR con signos distintos según la convención. | Las pruebas no deben depender de signos exactos | Probar Q·R = A y la ortogonalidad de Q, no valores exactos | abierta |

## Decisiones
Ninguna nueva en este paso. Las preguntas abiertas se irán resolviendo una a una con el humano y quedarán registradas en pasos posteriores.

## Cómo verificarlo
Revisar que cada pregunta de la tabla tenga una propuesta y un estado.

## Pendiente / siguiente
Resolver Q1 (rotación vs QR), Q2, Q3 y Q6, y con eso redactar `docs/api-contract.md`.
