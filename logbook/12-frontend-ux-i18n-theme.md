# 12 — Frontend: grilla de matriz, resultados, health, i18n y tema

- **Fecha:** 2026-10-11
- **Fase:** 6
- **Commit:** `feat(frontend): agrega grilla de matriz, salud de las APIs, i18n y tema claro/oscuro`

## Qué hicimos
- **Entrada como tabla:** la matriz se edita en una grilla de celdas numéricas con controles +/- de filas y columnas (1 a 10), navegación con flechas y Enter, y celdas inválidas marcadas con un mensaje que nombra la primera.
- **Aleatorio y limpiar:** `Random` llena la grilla con enteros de -9 a 9; `Clear` la vacía. Los ejemplos existentes se cargan en la grilla.
- **Resultados debajo del formulario:** primero las estadísticas que pide el enunciado (máximo, mínimo, promedio, suma total y si cada matriz es diagonal, con badges Sí/No) y luego las matrices Q, R y original en tablas.
- **Salud de las APIs:** nueva vista "API health" en el grupo Developer. Consulta `GET /health` de go-api y node-api al abrirla, muestra OK / Down / Checking con la latencia, y tiene "Check again". Timeout de 3 s con `AbortController`; no necesita token.
- **Ancho completo y responsive:** se quitó el contenedor angosto. En pantallas anchas la entrada va en dos columnas y las matrices en tres; en móvil todo se apila en una columna.
- **i18n EN/ES:** todos los textos están en `src/i18n/en.ts` y `es.ts`. Idioma: elección guardada, luego idioma del navegador, luego inglés. Selector EN | ES en la cabecera. Los códigos de error conocidos del backend se traducen; el mensaje original del servidor se sigue mostrando.
- **Tema claro / oscuro / sistema:** `ThemeProvider` con persistencia y seguimiento del tema del sistema; un script en `index.html` lo aplica antes del primer pintado para evitar parpadeo.

## Por qué
- La grilla elimina los errores de sintaxis del textarea y garantiza que la matriz sea rectangular desde la interfaz.
- Las estadísticas van en primer plano porque son lo que evalúa el enunciado.
- La vista de salud permite comprobar de un vistazo que las dos APIs responden antes de depurar un fallo.
- Los mensajes de validación pasaron de texto a claves (`issue: {key, params}`) para poder traducirlos sin duplicar la lógica.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Librería de traducción | Diccionario propio; **`i18next` + `react-i18next`** | Estándar de la industria, interpolación y plurales resueltos; dos dependencias pequeñas |
| Detección de idioma | Plugin `i18next-browser-languagedetector`; **detección manual** | La regla (guardado > navegador > `en`) cabe en pocas líneas y evita otra dependencia |
| Mensajes de validación | Texto en inglés en la lógica; **claves con parámetros** | La lógica no depende del idioma y se prueba sin traducir |
| Tema | Solo seguir el sistema; **claro / oscuro / sistema** | El usuario puede forzar el tema; las variables `.dark` ya existían |

## Cómo verificarlo
```
cd src/frontend
npm run lint && npm test && npm run build
```
Con las dos APIs y el frontend levantados (`make run-node`, `make run-go`, `make run-frontend`), abrir http://localhost:5173 y comprobar: grilla editable, `Random`, resultados bajo el formulario, vista "API health" en verde, cambio EN/ES y cambio de tema.

## Pendiente / siguiente
- Probar en el navegador el login real con Auth0 y el flujo completo.
- Revisar el diseño a 360 px y en tema oscuro (no se verificó visualmente).
- Docker (`env_file:` por servicio) y Fase 5 (despliegue).
