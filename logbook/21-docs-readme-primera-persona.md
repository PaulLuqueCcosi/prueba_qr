# 21 — README enfocado en decisiones, docs en primera persona y diagramas Mermaid

- **Fecha:** 2026-10-11
- **Fase:** 6
- **Commit:** `docs: reescribe el README en primera persona con diagramas Mermaid y agrega docs de pruebas y JWT`

## Qué hice
Reescribí la documentación pensando en que un revisor entienda cómo pensé la solución y pueda defender conmigo las decisiones técnicas. El punto de partida fue releer el enunciado (PDF) para alinear el README con lo que pide y lo que valora.

- **`README.md`**: lo reescribí de un resumen escueto a un documento puntual con (1) qué es, (2) tabla "qué pedía el reto y qué entregué" mapeando cada requisito del enunciado, (3) **tabla de decisiones técnicas** (decisión → por qué → alternativa descartada), (4) cómo ejecutarlo e (5) índice de la documentación de soporte. Sin mencionar ninguna empresa.
- **`docs/testing.md`** (nuevo): estrategia de pruebas transversal, qué cubro en cada capa (go-api, node-api, frontend), la regla de dependencias y la verificación de OpenAPI.
- **`docs/security-jwt.md`** (nuevo): flujo del token de punta a punta, qué valida cada API, configuración, cómo obtener un token para probar, por qué Logto y por qué el ID token (con su trade-off y camino de mejora).
- **Primera persona singular** en todas las partes narrativas de los docs (README, `architecture.md`, `api-contract.md`, `security-jwt.md`, `testing.md`, `docker.md`, `deployment.md`), dejando neutrales las tablas de referencia (endpoints, variables, errores, cobertura).
- **Diagramas en Mermaid** (se renderizan en GitHub) en lugar de ASCII: flujo cliente→go→node en el README, flujo y capas hexagonales en `architecture.md`, secuencia del contrato en `api-contract.md` y secuencia del token en `security-jwt.md`.
- **Limpieza:** quité `docs/enunciado.pdf` (duplicado idéntico del de `pdf/`); dejé de llamar "borrador" al contrato; reemplacé en `docker.md` la sección especulativa de AWS Lambda por "Preparadas para la nube", que apunta al despliegue real (Railway + Cloudflare).

## Por qué
- El enunciado dice explícitamente que se valora "comunicar y defender las decisiones técnicas"; el README debía girar en torno a eso, no solo listar comandos.
- La primera persona deja claro que las decisiones son mías y las puedo sustentar en la entrevista.
- Mermaid se ve mucho mejor que ASCII en GitHub y hace el flujo más fácil de leer.
- Separar pruebas y JWT en sus propios documentos evita que el README crezca y da un lugar claro al que llevar al revisor.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Foco del README | resumen técnico; **decisiones + mapeo al enunciado** | Es lo que el enunciado valora y lo que distingue la entrega |
| Tono | tercera persona; **primera persona singular** | Transmite autoría y facilita defender las decisiones |
| Diagramas | ASCII; **Mermaid** | Se renderizan en GitHub y se leen mejor |
| Docs nuevos | todo en el README; **docs separados (testing, security-jwt)** | README puntual + soporte profundo enlazado |

## Cómo verificarlo
Abrir el repo en GitHub y comprobar que los diagramas Mermaid del README y de `docs/` se renderizan, y que los enlaces entre documentos funcionan.

## Pendiente / siguiente
- Auditoría UX del frontend: explicar QR en lenguaje llano, tooltips para Q/R y "diagonal", estados vacíos y microcopy.
