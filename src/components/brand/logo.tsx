import { cn } from "@/lib/cn";

/**
 * Marca Dlay: la tortuga, sacada del sistema de marca (dlay-sistema-de-marca.pdf).
 *
 * Es la D de antes acostada sobre su palo: la panza queda arriba como el
 * caparazón, y la cabeza estirada hacia adelante dice que avanza. Las formas
 * están en el espacio del isotipo original (114 × 76) para que se puedan
 * comparar con el PDF sin hacer cuentas.
 *
 * El ojo es un agujero en la cabeza y no un punto blanco: así deja ver el
 * fondo, sea el índigo de la teja, el hueso o el negro.
 */
function Formas({ ojo }: { ojo: boolean }) {
  return (
    <>
      <path d="M22 52.5V40a35.8 35.8 0 0 1 71.6 0v12.5a1.5 1.5 0 0 1-1.5 1.5H23.5a1.5 1.5 0 0 1-1.5-1.5Z" />
      <rect x="11.2" y="60" width="93.4" height="10" rx="5" />
      <rect x="28" y="66" width="14" height="14.3" rx="3" />
      <rect x="74.6" y="66" width="14" height="14.3" rx="3" />
      <path d="M99 64 110 49" fill="none" stroke="currentColor" strokeWidth={12} strokeLinecap="round" />
      <path
        fillRule="evenodd"
        d={
          ojo
            ? "M125 46a13 13 0 1 1-26 0 13 13 0 0 1 26 0Zm-5.5-3a3.3 3.3 0 1 0-6.6 0 3.3 3.3 0 0 0 6.6 0Z"
            : "M125 46a13 13 0 1 1-26 0 13 13 0 0 1 26 0Z"
        }
      />
    </>
  );
}

/**
 * La marca en su teja: tortuga blanca sobre índigo, como el ícono de la app.
 * Es la que va en la barra y en las pantallas sueltas.
 *
 * Sin ojo: a los tamaños a los que se ve (de 20 a 44 px) el ojo es ruido, y
 * el sistema de marca lo saca justamente por eso.
 *
 * Los colores van fijos y no por variables: la teja es la marca, y una marca
 * que cambia de color con el tema deja de ser una marca.
 */
export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="Dlay"
      className={cn("h-9 w-9", className)}
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="#3e3fe0" />
      <g transform="translate(3.3 9.7) scale(0.2456)" fill="#ffffff" color="#ffffff">
        <Formas ojo={false} />
      </g>
    </svg>
  );
}

/**
 * Imagotipo horizontal: la tortuga camina sobre el renglón de «dlay». Es el
 * de la web. El tamaño sale del tamaño de letra, así que se ajusta con
 * `text-[…]` como cualquier texto.
 */
export function Imagotipo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Dlay"
      className={cn(
        "inline-flex items-end gap-[0.3em] text-[22px] font-extrabold leading-none tracking-[-0.06em] text-ink",
        className,
      )}
      // La variable la pone next/font en el <body>; por eso va acá y no como
      // fuente del tema, que se resuelve en la raíz, donde todavía no existe.
      style={{ fontFamily: "var(--font-geist), ui-sans-serif, system-ui, sans-serif" }}
    >
      <Isotipo aria-hidden className="mb-[0.06em] h-[0.78em] w-auto text-accent" />
      <span aria-hidden>dlay</span>
    </span>
  );
}

/**
 * Sólo la tortuga, sin teja: el isotipo. Toma el color del texto, así que
 * se pinta con las clases de siempre (`text-accent`, `text-ink`).
 */
export function Isotipo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="11 4 114 76"
      role="img"
      aria-label="Dlay"
      fill="currentColor"
      className={cn("h-6 w-auto text-accent", className)}
      {...props}
    >
      <Formas ojo />
    </svg>
  );
}
