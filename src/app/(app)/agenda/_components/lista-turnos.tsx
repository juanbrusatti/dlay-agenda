import Link from "next/link";
import { linkAgendar } from "@/lib/agendar";
import { aHora, type Tramo } from "@/lib/huecos";
import { formatPrice } from "@/lib/money";
import { timeIn } from "@/lib/tz";
import {
  STATUS_LABELS,
  type AgendaBlock,
  type AppointmentStatus,
  type AppointmentWithDetail,
} from "@/lib/data/agenda";

/**
 * El color dice de un vistazo quién va a venir.
 *
 * «Sin confirmar» es neutro a propósito: todavía no pasó nada, no es una
 * alerta. El ámbar queda libre para el turno que se movió, que sí es algo que
 * conviene mirar antes de empezar el día.
 */
const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending: "bg-surface-2 text-muted",
  confirmed: "bg-ok-wash text-ok",
  attended: "bg-surface-2 text-muted",
  no_show: "bg-danger-wash text-danger",
  cancelled: "bg-surface-2 text-faint",
};

export function ListaTurnos({
  appointments,
  blocks,
  libres = [],
  dia,
  timeZone,
}: {
  appointments: AppointmentWithDetail[];
  blocks: AgendaBlock[];
  /** Free gaps of the day, in minutes; each one books straight into it. */
  libres?: Tramo[];
  dia: string;
  timeZone: string;
}) {
  // Los turnos que se pisan comparten hora de inicio: se agrupan para que se
  // lea "a las 09:00 hay tres" en vez de tres filas sueltas repitiendo la hora.
  const porHora = new Map<string, AppointmentWithDetail[]>();
  for (const a of appointments) {
    const hora = timeIn(a.starts_at, timeZone);
    porHora.set(hora, [...(porHora.get(hora) ?? []), a]);
  }

  return (
    <div className="grid gap-3">
      {blocks.map((b) => (
        <div
          key={b.id}
          className="rounded-card border-[1.5px] border-dashed border-line bg-surface-2 px-4 py-3"
        >
          <p className="text-[13px] font-semibold tabular-nums text-muted">
            {timeIn(b.starts_at, timeZone)} – {timeIn(b.ends_at, timeZone)}
          </p>
          <p className="text-[13.5px] text-muted">
            Agenda bloqueada{b.reason ? `: ${b.reason}` : ""}
          </p>
        </div>
      ))}

      {[
        ...[...porHora.entries()].map(([hora, turnos]) => ({ hora, turnos })),
        ...libres.map((l) => ({ hora: aHora(l.desde), libre: l })),
      ]
        // "HH:MM" sorts as text. A gap can share its start with a group of
        // cancelled appointments only; then the group goes first.
        .sort((x, y) =>
          x.hora === y.hora
            ? Number("libre" in x) - Number("libre" in y)
            : x.hora < y.hora
              ? -1
              : 1,
        )
        .map((fila) =>
          "libre" in fila ? (
            <Hueco key={`libre-${fila.hora}`} dia={dia} tramo={fila.libre} />
          ) : (
            <Grupo
              key={fila.hora}
              hora={fila.hora}
              turnos={fila.turnos}
              timeZone={timeZone}
            />
          ),
        )}
    </div>
  );
}

/** A free gap: tapping it opens «Agendar turno» on that day and time. */
function Hueco({ dia, tramo }: { dia: string; tramo: Tramo }) {
  const desde = aHora(tramo.desde);
  return (
    <section className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[52px_minmax(0,1fr)] sm:gap-3">
      <p className="pt-2.5 text-[14px] font-semibold tabular-nums text-faint">
        {desde}
      </p>
      <Link
        href={linkAgendar({ dia, hora: desde })}
        className="flex items-center justify-between gap-3 rounded-card border-[1.5px] border-dashed border-line px-4 py-2.5 text-[13.5px] text-muted hover:border-accent hover:text-ink"
      >
        <span>
          Libre hasta las{" "}
          <span className="tabular-nums">{aHora(tramo.hasta)}</span>
        </span>
        <span className="shrink-0 font-medium text-accent-text">
          + Agendar acá
        </span>
      </Link>
    </section>
  );
}

/** The appointments that start at the same time. */
function Grupo({
  hora,
  turnos,
  timeZone,
}: {
  hora: string;
  turnos: AppointmentWithDetail[];
  timeZone: string;
}) {
  return (
    <section
      className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[52px_minmax(0,1fr)] sm:gap-3"
    >
      <p className="pt-3.5 text-[14px] font-semibold tabular-nums text-muted">
        {hora}
      </p>

      {/* Una sola columna que puede achicarse: sin esto la columna mide
              lo que el nombre más largo, y en el teléfono la tarjeta se sale
              de la pantalla en vez de cortar el texto. */}
      <ul className="grid min-w-0 grid-cols-1 gap-2">
        {turnos.map((a) => {
          const cliente = a.client;
          const nombre = cliente
            ? [cliente.first_name, cliente.last_name].filter(Boolean).join(" ")
            : "Sin cliente";
          const cancelado = a.status === "cancelled";

          return (
            <li key={a.id}>
              <Link
                href={`/agenda/${a.id}`}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border-[1.5px] border-line bg-surface px-4 py-3 hover:border-accent ${
                  cancelado ? "opacity-55" : ""
                }`}
              >
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-[15px] font-semibold">
                      {nombre}
                    </p>
                    {cliente?.alert && (
                      <span className="rounded-pill bg-warn-wash px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-warn">
                        Atención
                      </span>
                    )}
                    {/* Un turno que ya se movió es el que más chances
                            tiene de volver a moverse. El equipo lo usa para
                            saber a quién conviene llamar. */}
                    {a.rescheduled_count > 0 && !cancelado && (
                      <span className="rounded-pill bg-warn-wash px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-warn">
                        Cambiado
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-muted">
                    {a.services.map((s) => s.service?.name).join(" + ")} ·{" "}
                    {timeIn(a.starts_at, timeZone)}–
                    {timeIn(a.ends_at, timeZone)}
                  </p>
                </div>

                {/* Si no entra al lado del nombre, baja abajo en un renglón: en el
                        teléfono el nombre necesita el ancho más que el precio. */}
                <div className="flex shrink-0 items-center gap-2 sm:grid sm:justify-items-end sm:gap-1">
                  <div className="flex items-center gap-1">
                    {a.moved_count > 0 && (
                      <span
                        title="Este turno se movió de horario"
                        className="rounded-pill bg-warn-wash px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-warn"
                      >
                        Movido
                      </span>
                    )}
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${STATUS_STYLE[a.status]}`}
                    >
                      {STATUS_LABELS[a.status]}
                    </span>
                  </div>
                  {a.price_cents > 0 && (
                    <span className="text-[13px] tabular-nums text-muted">
                      {formatPrice(a.price_cents)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
