# 16 — Frontend: login con Logto y corrección de los resultados

- **Fecha:** 2026-10-11
- **Fase:** 4 y 6
- **Commit:** `feat(frontend): reemplaza Auth0 por Logto y corrige la visualización de resultados`

## Qué hicimos
- **Login con Logto:** se reemplazó `@auth0/auth0-react` por `@logto/react`. El login es por redirección a la página de Logto y vuelta a `/callback`, donde `useHandleSignInCallback` cierra el flujo y limpia la URL. El SDK de Logto no ofrece popup, así que se quitó el que habíamos hecho con Auth0.
- **Pantalla de login nueva:** centrada, con el logo, una línea de descripción, botón principal y aviso de inicio de sesión seguro; con estados de redirección y de error con reintento.
- **Token hacia las APIs:** se envía el ID token de Logto (`getIdToken()`) como Bearer. Si está por vencer (margen de 30 s) se renueva antes de la llamada. Sin API resource ni scopes propios.
- **Configuración:** `VITE_LOGTO_ENDPOINT` y `VITE_LOGTO_APP_ID` en `.env.local` (plantilla en `.env.example`). La app "Matrix Frontend" del tenant `PruebaTecnica` se creó con el MCP de Logto; redirect URI `http://localhost:5173/callback`, cierre de sesión hacia `http://localhost:5173`.
- **Panel Developer:** muestra `aud`, `iss` y `exp` del ID token.
- **Perfil de usuario:** nombre y correo desde los claims del ID token, visibles en la barra lateral.
- **Corrección de un bug real:** al calcular, los resultados no aparecían aunque las APIs devolvían 200. Causa: `useLogto()` marca `isLoading` en cada llamada de token y `App` mostraba un skeleton mientras `isLoading` fuera verdadero, desmontando los paneles y perdiendo la respuesta. Ahora el skeleton solo se muestra en la carga inicial (bandera `ready` que no vuelve a falso).
- **Red de seguridad:** un error boundary (`results-boundary.tsx`) alrededor de los resultados muestra un mensaje traducido con reintento si el render falla, en vez de dejar la pantalla en blanco.
- **Tests:** reproducen el bug con el comportamiento real del SDK (`qr-results.test.tsx`), y cubren el login, el callback, el hook de la API y la configuración.

## Por qué
- Logto simplifica la integración y es la decisión del usuario.
- El plan Free de Logto no incluye API resources propios (RBAC es de pago desde 2026-10-01); por eso se autentica con el ID token y se pierden los scopes. Es un compromiso aceptado para esta prueba y está documentado.
- El bug se descubrió probando el flujo real con login; los tests anteriores no reproducían el comportamiento de `isLoading` del SDK.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Flujo de login | Popup; **redirección** | El SDK de Logto solo soporta redirección |
| Token enviado a las APIs | Access token con API resource; **ID token** | Free no permite API resources propios |
| Carga inicial | Skeleton mientras `isLoading`; **skeleton solo la primera vez** | `isLoading` cambia en cada llamada de token y desmontaba los paneles |
| Resiliencia | Confiar en el render; **error boundary** | Un fallo de render no debe dejar la pantalla en blanco |

## Cómo verificarlo
```
make check
cd src/frontend && npm run build
```
Con los tres servicios levantados (`make run-node`, `make run-go`, `make run-frontend`): abrir http://localhost:5173, iniciar sesión con Logto, calcular una matriz y comprobar que aparecen las estadísticas y las matrices Q y R. En el panel Developer se ve el ID token.

## Pendiente / siguiente
- En la consola de Logto: registro con email, verificación obligatoria por código y conector de correo (Resend por SMTP). No se pudo hacer con el MCP.
- Revisar el diseño a 360 px y en tema oscuro.
- Docker (`env_file:` por servicio) y Fase 5 (despliegue).
