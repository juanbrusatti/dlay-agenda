"use server";

import { z } from "zod";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getDay } from "@/lib/data/agenda";
import { getBusinessHours } from "@/lib/data/configuracion";
import { aMinutos, horasDeInicio, huecosLibres, minutoDelDia } from "@/lib/huecos";
import { todayIn } from "@/lib/tz";

export type HorariosLibres =
  | { estado: "libres"; horas: string[] }
  /** The business has no opening hours that weekday. */
  | { estado: "cerrado" }
  | { estado: "pasado" }
  | { estado: "error" };

const entrada = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutos: z.number().int().min(5).max(720),
  excluir: z.string().uuid().optional(),
});

/**
 * The times a booking of `minutos` (service time plus cleanup) still fits on
 * a day, to offer as buttons instead of typing the hour.
 *
 * A suggestion, not a promise: it leaves out any slot with something booked
 * or blocked, even if a service takes more than one person at a time, and
 * the database still checks the real capacity when saving. When moving an
 * appointment, `excluir` is that appointment, so its own time counts as free.
 */
export async function horariosLibres(
  fecha: string,
  minutos: number,
  excluir?: string,
): Promise<HorariosLibres> {
  const parsed = entrada.safeParse({ fecha, minutos, excluir });
  if (!parsed.success) return { estado: "error" };

  const membership = await getCurrentTenant();
  if (!membership) return { estado: "error" };

  const tz = membership.tenant.timezone;
  const hoy = todayIn(tz);
  if (parsed.data.fecha < hoy) return { estado: "pasado" };

  try {
    const [{ appointments, blocks }, horarios] = await Promise.all([
      getDay(parsed.data.fecha, tz),
      getBusinessHours(),
    ]);

    const [y, m, d] = parsed.data.fecha.split("-").map(Number);
    const diaSemana = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const abierto = horarios
      .filter((h) => h.weekday === diaSemana)
      .map((h) => ({ desde: aMinutos(h.opens_at), hasta: aMinutos(h.closes_at) }));
    if (abierto.length === 0) return { estado: "cerrado" };

    const dia = parsed.data.fecha;
    const libres = huecosLibres({
      abierto,
      ocupado: [
        ...appointments
          .filter((a) => a.status !== "cancelled" && a.id !== parsed.data.excluir)
          .map((a) => ({
            desde: minutoDelDia(a.starts_at, dia, tz),
            hasta: minutoDelDia(a.blocks_until, dia, tz),
          })),
        ...blocks.map((b) => ({
          desde: minutoDelDia(b.starts_at, dia, tz),
          hasta: minutoDelDia(b.ends_at, dia, tz),
        })),
      ],
      desde: dia === hoy ? minutoDelDia(new Date(), dia, tz) : 0,
      minimo: parsed.data.minutos,
    });

    return { estado: "libres", horas: horasDeInicio(libres, parsed.data.minutos) };
  } catch {
    return { estado: "error" };
  }
}
