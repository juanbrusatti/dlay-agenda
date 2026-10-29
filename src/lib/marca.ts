/**
 * Dónde están los íconos de la versión actual de la marca.
 *
 * Van en una carpeta por versión (los genera scripts/make-icons.mjs) porque
 * los navegadores y los teléfonos guardan los íconos por dirección: si el
 * archivo cambia pero la dirección no, siguen mostrando el viejo. Al cambiar
 * la marca se sube la versión acá y en el script.
 */
const BASE = "/marca/v2";

export const ICONOS = {
  favicon: `${BASE}/favicon.svg`,
  favicon32: `${BASE}/favicon-32.png`,
  apple: `${BASE}/apple-touch-icon.png`,
  icon192: `${BASE}/icon-192.png`,
  icon512: `${BASE}/icon-512.png`,
  maskable512: `${BASE}/maskable-512.png`,
} as const;
