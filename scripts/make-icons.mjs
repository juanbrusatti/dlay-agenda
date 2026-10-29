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

// El calendario de Dlay Agenda, recortado del caparazón. Mismas medidas que
// en el componente.
const calendario = `
    <mask id="calendario" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="90">
      <rect width="140" height="90" fill="#fff"/>
      <g fill="none" stroke="#000" stroke-width="4.5">
        <rect x="44.5" y="19" width="26.6" height="24" rx="3.5"/>
        <path d="M44.5 27h26.6"/>
        <path d="M51 14.5v7M64.6 14.5v7" stroke-linecap="round"/>
      </g>
    </mask>`;

const tortuga = ({ ojo, glifo }) => `${glifo ? calendario : ""}
    <path${glifo ? ' mask="url(#calendario)"' : ""} d="M22 52.5V40a35.8 35.8 0 0 1 71.6 0v12.5a1.5 1.5 0 0 1-1.5 1.5H23.5a1.5 1.5 0 0 1-1.5-1.5Z"/>
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
 * @param {{ancho:number, radio:number, ojo:boolean, glifo:boolean}} o
 *   ancho: qué parte del cuadrado ocupa la tortuga; radio: esquinas (0 = lleno);
 *   glifo: el calendario en el caparazón.
 */
const teja = ({ ancho, radio, ojo, glifo }) => {
  const s = (512 * ancho) / 114;
  const x = (512 - 114 * s) / 2 - 11 * s;
  // Un poco más abajo del centro: el caparazón pesa arriba y, centrada a
  // regla, la tortuga parece flotar.
  const y = (512 - 76 * s) / 2 - 4 * s + 512 * 0.02;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radio}" fill="${INDIGO}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})" fill="${WHITE}">${tortuga({ ojo, glifo })}
  </g>
</svg>`;
};

await mkdir("public/icons", { recursive: true });

// Normal: la teja con esquinas redondeadas, como se ve en el sistema de marca.
const normal = teja({ ancho: 0.7, radio: 112, ojo: true, glifo: true });
// Maskable: el sistema la recorta a su forma y puede comerse hasta un 20% de
// cada borde, así que va llena y la tortuga entra en el 60% central.
const maskable = teja({ ancho: 0.56, radio: 0, ojo: true, glifo: true });
// iPhone redondea él mismo las esquinas; si ya vienen redondeadas, quedan
// esquinas transparentes que se ven negras.
const apple = teja({ ancho: 0.66, radio: 0, ojo: true, glifo: true });
// Favicon: sin ojo ni calendario. A 16 px son ruido; en la pestaña alcanza
// con la tortuga.
const favicon = teja({ ancho: 0.74, radio: 112, ojo: false, glifo: false });

await sharp(Buffer.from(normal)).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(normal)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/maskable-512.png");
// El de iPhone va sin transparencia y también en la raíz: Safari, además del
// <link>, prueba /apple-touch-icon.png y /apple-touch-icon-precomposed.png, y
// si alguno falla puede quedarse con una letra sobre fondo gris.
const iphone = sharp(Buffer.from(apple)).resize(180, 180).flatten({ background: INDIGO }).png();
await iphone.clone().toFile("public/icons/apple-touch-icon.png");
await iphone.clone().toFile("public/apple-touch-icon.png");
await iphone.clone().toFile("public/apple-touch-icon-precomposed.png");
await iphone.clone().toFile("src/app/apple-icon.png");
await writeFile("public/icons/icon.svg", normal);
await writeFile("src/app/icon.svg", favicon);

console.log("Iconos generados en public/icons/ y src/app/");
