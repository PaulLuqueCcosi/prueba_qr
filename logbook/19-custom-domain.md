# 19 — Dominio propio para el frontend y las APIs

- **Fecha:** 2026-10-11
- **Fase:** 5 y 6
- **Commit:** `feat(frontend): usa el dominio propio iampol.dev en el despliegue`

## Qué hicimos
Reemplazamos las URLs genéricas (`workers.dev` y `up.railway.app`) por subdominios de `iampol.dev`, que está en Cloudflare:

| Servicio | URL |
|---|---|
| frontend | https://qr-prueba.iampol.dev |
| go-api | https://api-go.iampol.dev |
| node-api | https://api-node.iampol.dev |

- `wrangler.jsonc`: ruta con `custom_domain: true`; Cloudflare crea el DNS y el certificado del frontend. Se quitó la línea `$schema` porque `wrangler` no está instalado como dependencia.
- Railway: Custom Domain en go-api (puerto 8080) y node-api (puerto 8081), con sus registros CNAME y TXT de verificación en Cloudflare.
- Frontend recompilado con `VITE_GO_API_URL` y `VITE_NODE_API_URL` apuntando a los dominios nuevos.
- Logto: Redirect URI y Post sign-out URI del dominio nuevo (se conservan los de localhost; se quitaron los de `workers.dev`).
- Railway: `CORS_ORIGINS=http://localhost:5173,https://qr-prueba.iampol.dev` en las dos APIs.
- `docs/deployment.md` actualizado.

## Por qué
- Un dominio propio es más fácil de recordar y de defender en la entrevista que una URL autogenerada.
- Con el frontend y las APIs bajo el mismo dominio base, la configuración de CORS y de Logto queda ordenada.

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Nombres | `qr-prueba`, `api-go`, `api-node` | Los eligió el dueño del dominio; indican el rol de cada servicio |
| Crear los dominios de Railway | CLI; **dashboard** | El CLI devolvió `Unauthorized` al crear dominios, aunque el login era válido |
| URL `workers.dev` | Mantenerla; **deshabilitarla** | Wrangler la desactiva al declarar una ruta; evita tener dos orígenes públicos |

## Cómo verificarlo
```
curl https://api-go.iampol.dev/health
curl https://api-node.iampol.dev/health
curl -i -X OPTIONS https://api-go.iampol.dev/api/v1/qr -H "Origin: https://qr-prueba.iampol.dev" -H "Access-Control-Request-Method: POST"   # 204 con access-control-allow-origin
```
Abrir https://qr-prueba.iampol.dev, iniciar sesión con Logto y calcular una matriz.

## Pendiente / siguiente
- Probar el flujo completo con login en el navegador.
- Evaluar un archivo `_headers` para las cabeceras de seguridad y la CSP en Cloudflare.
- Actualizar el estado de `CLAUDE.md` al cerrar la fase.
