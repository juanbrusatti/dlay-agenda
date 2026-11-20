import { timeIn } from "@/lib/tz";

/**
 * The free gaps of a day in the agenda, to book straight into one.
 *
 * Everything is in minutes since midnight, in the business's time zone: the
 * opening hours come that way, and the agenda turns its appointments and
 * blocks into the same scale before calling this. Pure on purpose, so it is
 * tested without a database or a clock.
 *
 * A gap is time inside the opening hours with nothing booked and nothing
 * blocked. It is conservative on purpose: a service that takes two people at
 * once may still fit next to a busy slot, but that slot is not shown as free,
 * so a gap never promises room that is not there.
 */

export type Tramo = { desde: number; hasta: number };

/** Gaps shorter than this are not worth offering. */
export const MINIMO_MINUTOS = 30;

/**
 * Free gaps inside `abierto`, without `ocupado`, starting no earlier than
 * `desde` (now, for today). Starts are rounded up to five minutes because the
 * booking form moves in steps of five.
 */
export function huecosLibres({
  abierto,
  ocupado,
  desde = 0,
  minimo = MINIMO_MINUTOS,
}: {
  abierto: Tramo[];
  ocupado: Tramo[];
  desde?: number;
  minimo?: number;
}): Tramo[] {
  const ocupados = [...ocupado].sort((a, b) => a.desde - b.desde);
  const libres: Tramo[] = [];

  for (const rango of [...abierto].sort((a, b) => a.desde - b.desde)) {
    let cursor = Math.max(rango.desde, desde);

    for (const o of ocupados) {
      if (o.hasta <= cursor) continue;
      if (o.desde >= rango.hasta) break;
      agregar(libres, cursor, Math.min(o.desde, rango.hasta), minimo);
      cursor = Math.max(cursor, o.hasta);
    }

    agregar(libres, cursor, rango.hasta, minimo);
  }

  return libres;
}

function agregar(libres: Tramo[], desde: number, hasta: number, minimo: number) {
  const inicio = Math.ceil(desde / 5) * 5;
  if (hasta - inicio >= minimo) libres.push({ desde: inicio, hasta });
}

/** "14:30" → 870. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 870 → "14:30". */
export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Where an instant falls in `dia`, in minutes since midnight of the business:
 * 0 if it is before that day, 1440 if after. Lets an appointment or a block
 * that crosses midnight count only for its part of the day.
 */
export function minutoDelDia(instante: string | Date, dia: string, timeZone: string): number {
  const fecha = new Date(instante);
  const suDia = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);

  if (suDia < dia) return 0;
  if (suDia > dia) return 24 * 60;
  return aMinutos(timeIn(fecha, timeZone));
}
