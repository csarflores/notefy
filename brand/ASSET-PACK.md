# Harold — Asset Pack

## Archivos

### Maestros vectoriales
- `harold-icon-master.svg` — fuente vectorial editable recomendada.
- `harold-icon-master.ai` — archivo Illustrator-compatible basado en EPS/legacy PostScript; Illustrator puede abrirlo y editarlo.
- `harold-icon-master.eps` — respaldo vectorial para impresión e Illustrator.

### PNG
- `harold-app-icon-1024.png` — símbolo transparente, fuente para app stores.
- `harold-app-icon-light-1024.png` — ícono sobre `Parchment #F5F5F7`.
- `harold-app-icon-dark-1024.png` — ícono sobre `Ink #1D1D1F`.
- `harold-app-icon-512.png` — ícono de aplicación.
- `harold-pwa-512.png` / `harold-pwa-192.png` — manifest PWA.
- `harold-pwa-maskable-512.png` — icono PWA maskable con zona segura.
- `harold-apple-touch-icon-180.png` — Apple Touch Icon.
- `harold-favicon-48.png`, `harold-favicon-32.png`, `harold-favicon-16.png` — favicon.
- `harold-icon-white-512.png` / `harold-icon-white-1024.png` — versión clara para fondos oscuros.

### Otros
- `harold-favicon.ico` — favicon multi-tamaño para compatibilidad legacy.

## Uso recomendado

```html
<link rel="icon" type="image/png" sizes="32x32" href="/harold-favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/harold-favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/harold-apple-touch-icon-180.png">
```

Para PWA:

```json
{
  "icons": [
    { "src": "/harold-pwa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/harold-pwa-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/harold-pwa-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Nota sobre `.ai`

El archivo `.ai` incluido es un archivo Illustrator-compatible con contenido EPS/legacy PostScript, apropiado para abrir y editar en Adobe Illustrator. El SVG es la fuente vectorial más transparente y portable para el desarrollo web.
