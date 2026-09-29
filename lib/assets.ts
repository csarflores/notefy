// Versión del pack de assets de marca en /public.
// Para actualizar (p. ej. harold-assets-v4): sube la carpeta nueva
// a /public y cambia solo este valor.
export const ASSET_PACK = 'harold-assets-v3';

export const assetPath = (file: string) => `/${ASSET_PACK}/${file}`;
