import Link from "next/link";

/**
 * El WhatsApp del negocio se desconectó y los recordatorios no están saliendo.
 *
 * Va arriba de todas las pantallas hasta que se vuelva a escanear: es lo más
 * importante que puede estar pasando sin que nadie lo vea, porque cada turno
 * de esos días se queda sin aviso.
 */
export function AvisoWhatsappCaido() {
  return (
    <div className="mx-auto mt-2 w-full max-w-4xl px-4 sm:mt-3">
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card border-[1.5px] border-warn bg-warn-wash px-3.5 py-2.5 text-[13px] leading-snug sm:px-4 sm:py-3 sm:text-[13.5px] sm:leading-relaxed text-ink"
      >
        <p className="min-w-0 flex-1">
          Tu WhatsApp se desconectó y los recordatorios no están saliendo.
          {/* En el teléfono alcanza con el botón: el renglón de más empujaba
              la pantalla para abajo en cada sección. */}
          <span className="hidden sm:inline">
            {" "}Volvé a escanear el código para que arranquen de nuevo.
          </span>
        </p>
        <Link
          href="/configuracion/whatsapp"
          className="shrink-0 font-semibold text-accent-text hover:underline"
        >
          Reconectar
        </Link>
      </div>
    </div>
  );
}
