# 15 — Frontend: logo, favicon y metadata

- **Fecha:** 2026-10-11
- **Fase:** 6
- **Commit:** `feat(frontend): agrega logo, favicon y metadata de la app`

## Qué hicimos
- **Logo original "Matrix QR":** un cuadrado redondeado con una grilla 3×3 recortada. Las seis celdas del triángulo superior forman la R de la factorización y las tres inferiores son puntos tenues (los ceros). Pinta con `currentColor`, así que sigue el tema claro/oscuro. Está como componente React (`app-logo.tsx`, con test) y como `public/logo.svg`.
- **Favicon y íconos:** `favicon.svg` cuyo fondo cambia según el esquema de color del navegador, y PNG para iOS y para instalar la app (`apple-touch-icon`, `icon-192`, `icon-512`).
- **Metadata en `index.html`:** título, descripción, `theme-color` para claro y oscuro, `color-scheme`, etiquetas Open Graph y Twitter card, y `manifest.webmanifest`.
- **Imagen de vista previa:** `og-image.png` (1200×630) para compartir el enlace.

## Por qué
Identidad propia y metadata completa: la pestaña, el enlace compartido y la app instalable se ven coherentes. El logo evoca la idea central de la prueba (QR = Q ortogonal por R triangular superior).

## Decisiones
| Decisión | Opciones | Motivo |
|---|---|---|
| Logo | Ícono genérico; logo de terceros; **marca original** | Evita marcas ajenas y comunica el dominio del problema |
| Colores del logo | Fijos; **`currentColor`** | Funciona en ambos temas sin duplicar archivos |
| PNG | Instalar una librería; **generarlos con la misma geometría con herramientas ya presentes** | Sin dependencias nuevas; los PNG son estáticos |

## Cómo verificarlo
```
cd src/frontend
npm run lint && npm test && npm run build
```
Abrir http://localhost:5173 y revisar el favicon en la pestaña (con Ctrl+F5 por el caché).

## Pendiente / siguiente
- `og:image` es una ruta relativa porque aún no hay dominio; hay que poner la URL absoluta al desplegar (Fase 5).
- Usar el logo en la barra lateral y en la pantalla de login (paso 16).
