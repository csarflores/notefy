# Harold — Asset Pack v3

Este paquete usa como fuente exacta la imagen aprobada de la **opción 2**. No se redibujó el símbolo ni se alteró la relación entre lentes y puente. Solo se recortaron márgenes transparentes y se generaron tamaños y fondos de distribución.

## Archivos incluidos

- `harold-app-icon-1024.png` y `harold-app-icon-512.png` — íconos transparentes.
- `harold-app-icon-light-1024.png` — variante sobre Parchment `#F5F5F7`.
- `harold-app-icon-dark-1024.png` — variante sobre Ink `#1D1D1F`.
- `harold-pwa-192.png`, `harold-pwa-512.png` y `harold-pwa-maskable-512.png`.
- `harold-apple-touch-icon-180.png`.
- `harold-favicon-16.png`, `harold-favicon-32.png`, `harold-favicon-48.png` y `harold-favicon.ico`.
- `harold-icon-white-512.png` y `harold-icon-white-1024.png`.
- `harold-icon-master.svg` — SVG autocontenido que preserva exactamente el asset aprobado.
- `manifest.json`.

## HTML

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0066CC">
<link rel="icon" href="/harold-favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="48x48" href="/harold-favicon-48.png">
<link rel="icon" type="image/png" sizes="32x32" href="/harold-favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/harold-favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/harold-apple-touch-icon-180.png">
```

Copia los archivos a la carpeta pública de la aplicación o ajusta las rutas si usas otra estructura.

> Nota: el SVG conserva el diseño aprobado como imagen embebida para garantizar fidelidad visual. No es un trazado de paths editable; la vectorización manual debe hacerse como una etapa de producción separada para no cambiar la marca nuevamente.
