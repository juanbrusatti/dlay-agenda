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
    <div className="mx-auto mt-3 w-full max-w-4xl px-4">
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card border-[1.5px] border-warn bg-warn-wash px-4 py-3 text-[13.5px] leading-relaxed text-ink"
      >
        <p className="min-w-0 flex-1">
          Tu WhatsApp se desconectó y los recordatorios no están saliendo.
          Volvé a escanear el código para que arranquen de nuevo.
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
