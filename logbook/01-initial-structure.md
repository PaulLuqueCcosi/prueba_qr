# 01 — Estructura inicial del proyecto

- **Fecha:** 2026-10-10
- **Fase:** Preparación
- **Commit:** `docs: agrega análisis del enunciado y respuestas del MVP` (el primer commit incluye los pasos 01 a 03)

## Qué hicimos
Leímos el enunciado y definimos las reglas de trabajo. Creamos la estructura de carpetas (`src/go-api`, `src/node-api`, `docs/`, `logbook/`) y el `.gitignore`.

## Por qué
Al ser una prueba técnica se evalúa el proceso. Dejar reglas, estándar de nombres y decisiones registradas antes de escribir código permite explicar y defender cada paso.

## Decisiones
- **Comunicación por HTTP** entre las APIs: lo pide el enunciado y evita atarse a AWS (`lambda:Invoke`).
- **Despliegue en AWS Lambda con imágenes de contenedor** (Lambda Web Adapter): pago por uso y reutiliza los Dockerfiles.
- **Seguridad en capas:** cada servicio verifica el token por sí mismo (defensa en profundidad).
- **Desarrollo por fases**, desde una versión mínima funcional local.
- **Código, archivos y carpetas en inglés; commits y documentación en español; Node en TypeScript.**
- **Estándar de nombres:** carpetas y docs en `kebab-case`; Go en `snake_case`; TypeScript en `kebab-case` con sufijo de rol (`statistics.service.ts`).

## Cómo verificarlo
Revisar que existan las carpetas y archivos listados.

## Pendiente / siguiente
Definir el contrato de las APIs (`docs/api-contract.md`) y empezar la Fase 1.
