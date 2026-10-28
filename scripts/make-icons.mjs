/**
 * Genera los iconos de la app desde la tortuga del sistema de marca.
 * Se corre a mano cuando cambia la marca: `node scripts/make-icons.mjs`.
 *
 * Las formas son las mismas de src/components/brand/logo.tsx, en el espacio
 * del isotipo original (114 × 76, empezando en 11,4).
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const INDIGO = "#3e3fe0";
const WHITE = "#ffffff";

const tortuga = ({ ojo }) => `
    <path d="M22 52.5V40a35.8 35.8 0 0 1 71.6 0v12.5a1.5 1.5 0 0 1-1.5 1.5H23.5a1.5 1.5 0 0 1-1.5-1.5Z"/>
    <rect x="11.2" y="60" width="93.4" height="10" rx="5"/>
    <rect x="28" y="66" width="14" height="14.3" rx="3"/>
    <rect x="74.6" y="66" width="14" height="14.3" rx="3"/>
    <path d="M99 64 110 49" fill="none" stroke="${WHITE}" stroke-width="12" stroke-linecap="round"/>
    <path fill-rule="evenodd" d="${
      ojo
        ? "M125 46a13 13 0 1 1-26 0 13 13 0 0 1 26 0Zm-5.5-3a3.3 3.3 0 1 0-6.6 0 3.3 3.3 0 0 0 6.6 0Z"
        : "M125 46a13 13 0 1 1-26 0 13 13 0 0 1 26 0Z"
    }"/>`;

/**
 * Tortuga blanca sobre índigo, en un cuadrado de 512.
 * @param {{ancho:number, radio:number, ojo:boolean}} o
 *   ancho: qué parte del cuadrado ocupa la tortuga; radio: esquinas (0 = lleno).
 */
const teja = ({ ancho, radio, ojo }) => {
  const s = (512 * ancho) / 114;
  const x = (512 - 114 * s) / 2 - 11 * s;
  // Un poco más abajo del centro: el caparazón pesa arriba y, centrada a
  // regla, la tortuga parece flotar.
  const y = (512 - 76 * s) / 2 - 4 * s + 512 * 0.02;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radio}" fill="${INDIGO}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})" fill="${WHITE}">${tortuga({ ojo })}
  </g>
</svg>`;
};

await mkdir("public/icons", { recursive: true });

// Normal: la teja con esquinas redondeadas, como se ve en el sistema de marca.
const normal = teja({ ancho: 0.7, radio: 112, ojo: true });
// Maskable: el sistema la recorta a su forma y puede comerse hasta un 20% de
// cada borde, así que va llena y la tortuga entra en el 60% central.
const maskable = teja({ ancho: 0.56, radio: 0, ojo: true });
// iPhone redondea él mismo las esquinas; si ya vienen redondeadas, quedan
// esquinas transparentes que se ven negras.
const apple = teja({ ancho: 0.66, radio: 0, ojo: true });
// Favicon: sin ojo. A 16 px el ojo es ruido.
const favicon = teja({ ancho: 0.74, radio: 112, ojo: false });

await sharp(Buffer.from(normal)).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(normal)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/maskable-512.png");
await sharp(Buffer.from(apple)).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(apple)).resize(180, 180).png().toFile("src/app/apple-icon.png");
await writeFile("public/icons/icon.svg", normal);
await writeFile("src/app/icon.svg", favicon);

console.log("Iconos generados en public/icons/ y src/app/");
