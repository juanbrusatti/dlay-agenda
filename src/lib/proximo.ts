import type { Rubro } from "@/lib/rubros";
import { nextDay } from "@/lib/tz";

/**
 * When to suggest «el próximo turno» after a visit.
 *
 * Pure on purpose: the turno screen renders it and the tests check it without
 * a database.
 */

/** The choices offered next to the suggestion, in weeks. */
export const SEMANAS = [1, 2, 3, 4, 6, 8] as const;

/**
 * The client's own rhythm if they came before (the gap between their last two
 * visits, in whole weeks, from 1 to 12). A first visit gets what is usual for
 * the rubro: a weekly session in psychology, about a month elsewhere.
 */
export function semanasSugeridas(diasDesdeAnterior: number | null, rubro: Rubro): number {
  if (diasDesdeAnterior === null || diasDesdeAnterior < 4) {
    return rubro === "psicologia" ? 1 : 4;
  }
  return Math.min(12, Math.max(1, Math.round(diasDesdeAnterior / 7)));
}

/**
 * The same weekday, `semanas` weeks after `dia`. If that is already today or
 * past (the visit was closed late), it keeps the same step until it is ahead.
 */
export function diaSugerido(dia: string, semanas: number, hoy: string): string {
  let fecha = nextDay(dia, semanas * 7);
  while (fecha <= hoy) fecha = nextDay(fecha, semanas * 7);
  return fecha;
}
