# 20 — Tope de matriz a 100x100 y carga por JSON

- **Fecha:** 2026-10-11
- **Fase:** 6
- **Commit:** `feat(frontend): sube el tope de matriz a 100x100 y agrega carga por JSON`

## Qué hicimos
El frontend tenía un tope de 10x10 que solo vivía en la UI; las APIs no limitan filas ni columnas (solo el body de 1 MB). Lo subimos y lo aclaramos, y agregamos una entrada por JSON para matrices grandes.

- `src/lib/grid.ts`: `MAX_SIZE` pasa de 10 a 100, documentado como límite del frontend (no del sistema). Se agrega `sizeOverLimit(matrix)` que devuelve la forma si excede el tope o `null` si cabe.
- `src/components/matrix-input.tsx`: el texto de tamaño ya no dice "máx. 10x10"; muestra `filas x columnas` y un `title` que aclara que el máximo es del frontend, no de las APIs.
- `src/components/qr-panel.tsx`: botón "Pegar JSON" que abre un bloque con textarea. Usa `parseMatrix` para validar (matriz rectangular de números) y `sizeOverLimit` para rechazar lo que pase de 100x100 con un mensaje claro.
- `src/i18n/en.ts` y `es.ts`: claves nuevas (`grid.sizeHint`, `grid.pasteJson*`, `grid.loadJson`, `grid.cancel`) e issue `issues.tooLarge`.
- `src/lib/issue.ts`: `issues.tooLarge` agregado al tipo `Issue`.
- `src/lib/grid.test.ts`: el test de clamp ahora valida 100; tests nuevos para `sizeOverLimit`.

## Por qué
- El tope de 10x10 era una restricción artificial de la UI que no reflejaba lo que las APIs aceptan.
- Teclear una matriz grande celda por celda es tedioso; pegar un JSON es mucho más rápido para una demo.
- El mensaje de error del tope explica que es un límite del frontend y dónde subirlo, para que nadie lo confunda con un límite del sistema.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Tope del grid | quitarlo del todo; **subirlo a 100x100** | Evita que el navegador se cuelgue con una matriz enorme, sin estorbar en la práctica |
| Entrada por JSON | modal; **bloque colapsable en el Step 1** | Más directo, no esconde la acción y encaja con el flujo actual |
| Validación del JSON | nueva función; **reusar `parseMatrix`** | Ya valida matriz rectangular numérica con los mismos issues |

## Cómo verificarlo
```
cd src/frontend
npm run typecheck
npm test
npm run build
```
En la UI: "Pegar JSON" → pegar `[[1,2],[3,4]]` → "Cargar" llena el grid. Pegar una matriz de más de 100 filas/columnas muestra el aviso de límite del frontend.

## Pendiente / siguiente
- Auditoría UX: explicar QR en lenguaje llano, tooltips para Q/R y "diagonal", estados vacíos y microcopy.
