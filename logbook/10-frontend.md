# 10 — Frontend con login de Auth0 y sidebar (Fase 6)

- **Fecha:** 2026-10-11
- **Fase:** 6
- **Commit:** `feat(frontend): agrega la interfaz con login Auth0 y sidebar`

## Qué hicimos
Creamos `src/frontend`, una SPA que inicia sesión con Auth0, envía una matriz a go-api y muestra el resultado. Cumple el alcance acordado en el paso 06: simple, sin ser el foco de la prueba.

- **Stack:** React 19, Vite, TypeScript, Tailwind 4 y shadcn/ui (sobre `@base-ui/react`).
- **Login:** `@auth0/auth0-react` con Authorization Code + PKCE. Es un cliente público, así que no hay ningún secreto.
- **Layout:** sidebar de shadcn (`inset`, colapsable a iconos, Ctrl+B) con dos herramientas y una sección para desarrolladores. El pie del sidebar muestra al usuario y el botón de logout.
  - *QR factorization:* llama a go-api (`POST /api/v1/qr`).
  - *Statistics:* llama directamente a node-api (`POST /api/v1/statistics`).
  - *API & token:* información para depurar; el token nunca se muestra.
- **Claridad de la interfaz:** cada página se organiza en tarjetas numeradas ("1. Input matrix" y "2. Result"). El resultado muestra max, min, average y sum, insignias de matriz diagonal y las matrices Original (A), Q y R, cada una con una línea que explica qué es.
- **Entrada:** ejemplos precargados, pista del formato JSON y validación en el cliente antes de enviar.
- **Errores:** mensajes legibles según el código del contrato (`401`, `403`, `422`, `502`, etc.).
- **Configuración:** variables `VITE_*` validadas al arrancar; si falta alguna se muestra una pantalla de error de configuración en vez de fallar en silencio. Plantilla en `src/frontend/.env.example`; el valor real va en `.env.local`, que git ignora.
- **Pruebas:** 22 pruebas con Vitest y Testing Library (cliente HTTP, parser de matrices, panel QR y navegación del sidebar).

## Por qué
- Auth0 con PKCE es la forma recomendada para SPA y no deja secretos en el navegador.
- El sidebar separa las dos APIs y deja claro qué servicio responde cada herramienta, que es lo que el entrevistador quiere ver.
- Poner los resultados en tarjetas y explicar cada matriz reduce la carga de quien no conoce la factorización QR.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Navegación | `useState` simple; React Router | Son pocas vistas y no necesitan URL propia, así que no se agrega una dependencia |
| Componentes | Hechos a mano; **shadcn/ui** | Accesibles por defecto y consistentes con tema claro y oscuro |
| Token | Guardarlo en el estado de la app; **pedirlo a Auth0 en cada llamada** | El SDK lo gestiona y renueva; la app no lo almacena |

## Cómo verificarlo
```
make test-frontend
cd src/frontend && npm run build
```
Para probar el flujo completo: levantar go-api (`:8080`), node-api (`:8081`) y `make run-frontend`, abrir `http://localhost:5173`, iniciar sesión y calcular una matriz.

## Limitaciones conocidas
- No se revisó visualmente el diseño en 360 px ni el tema oscuro; queda como verificación manual.
- El bundle supera los 500 kB (aviso de Vite). No se dividió en chunks porque no es prioridad.
- El lint muestra warnings de `only-export-components` y `set-state-in-effect` en archivos generados por shadcn; no se modificaron.

## Pendiente / siguiente
Dejar la configuración por servicio y simplificar el `Makefile` (paso 11). Después: Docker, despliegue y probar el flujo completo con un token real.
