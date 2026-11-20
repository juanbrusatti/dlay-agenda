import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { todayIn, zonedDayRange } from "@/lib/tz";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];
export type AgendaBlock = Database["public"]["Tables"]["agenda_blocks"]["Row"];

export type AppointmentWithDetail = Appointment & {
  client: {
    id: string;
    first_name: string;
    last_name: string | null;
    phone_e164: string | null;
    alert: string | null;
  } | null;
  services: Array<{
    id: string;
    duration_minutes: number;
    price_cents: number | null;
    position: number;
    service: { id: string; name: string } | null;
  }>;
};

const DETAIL_SELECT = `
  *,
  client:clients ( id, first_name, last_name, phone_e164, alert ),
  services:appointment_services (
    id, duration_minutes, price_cents, position,
    service:services ( id, name )
  )
`;

/** Los turnos de un día, en la zona horaria del negocio. */
export async function getDay(
  date: string,
  timeZone: string,
): Promise<{ appointments: AppointmentWithDetail[]; blocks: AgendaBlock[] }> {
  const { from, to } = zonedDayRange(date, timeZone);
  const supabase = await createClient();

  const [turnos, bloqueos] = await Promise.all([
    supabase
      .from("appointments")
      .select(DETAIL_SELECT)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("agenda_blocks")
      .select("*")
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .order("starts_at", { ascending: true }),
  ]);

  if (turnos.error) throw turnos.error;
  if (bloqueos.error) throw bloqueos.error;

  const appointments = (turnos.data ?? []) as unknown as AppointmentWithDetail[];
  for (const a of appointments) {
    a.services.sort((x, y) => x.position - y.position);
  }

  return { appointments, blocks: bloqueos.data ?? [] };
}

/**
 * Cuántos turnos activos tiene cada día de una semana.
 *
 * Una sola consulta para los siete días: pedir día por día serían siete
 * viajes a la base para pintar unas cifras chiquitas.
 */
export async function getWeekCounts(
  days: string[],
  timeZone: string,
): Promise<Record<string, number>> {
  if (days.length === 0) return {};

  const from = zonedDayRange(days[0], timeZone).from;
  const to = zonedDayRange(days[days.length - 1], timeZone).to;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("starts_at")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .not("status", "in", "(cancelled)");

  if (error) throw error;

  const counts: Record<string, number> = {};
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (const row of data ?? []) {
    const day = formatter.format(new Date(row.starts_at));
    counts[day] = (counts[day] ?? 0) + 1;
  }

  return counts;
}

export async function getAppointment(
  id: string,
): Promise<AppointmentWithDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const appointment = data as unknown as AppointmentWithDetail;
  appointment.services.sort((x, y) => x.position - y.position);
  return appointment;
}

export type StatusChange = {
  id: string;
  from_status: AppointmentStatus | null;
  to_status: AppointmentStatus;
  reason: string | null;
  created_at: string;
  /** Lo hizo el cliente desde el enlace de su turno, no el equipo. */
  by_client: boolean;
  author: { full_name: string | null } | null;
};

export async function getStatusHistory(
  appointmentId: string,
): Promise<StatusChange[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointment_status_history")
    .select(
      "id, from_status, to_status, reason, created_at, by_client, author:profiles ( full_name )",
    )
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as StatusChange[];
}

export type ClientAgenda = {
  last: AppointmentWithDetail | null;
  next: AppointmentWithDetail | null;
  attended: number;
  noShows: number;
};

/**
 * El resumen de agenda de un cliente: cuándo vino, cuándo vuelve y cómo se
 * portó. De las ausencias sale después cuántos recordatorios necesita.
 */
export async function getClientAgenda(clientId: string): Promise<ClientAgenda> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [last, next, counts] = await Promise.all([
    supabase
      .from("appointments")
      .select(DETAIL_SELECT)
      .eq("client_id", clientId)
      .lt("starts_at", now)
      .not("status", "in", "(cancelled)")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select(DETAIL_SELECT)
      .eq("client_id", clientId)
      .gte("starts_at", now)
      .not("status", "in", "(cancelled)")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("status")
      .eq("client_id", clientId)
      .in("status", ["attended", "no_show"]),
  ]);

  const rows = counts.data ?? [];

  return {
    last: (last.data as unknown as AppointmentWithDetail) ?? null,
    next: (next.data as unknown as AppointmentWithDetail) ?? null,
    attended: rows.filter((r) => r.status === "attended").length,
    noShows: rows.filter((r) => r.status === "no_show").length,
  };
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Sin confirmar",
  confirmed: "Confirmado",
  attended: "Atendido",
  no_show: "No vino",
  cancelled: "Cancelado",
};

/**
 * The services of the client's latest appointment that was not cancelled, in
 * the order they were booked. Used to pre-select «lo de siempre» when booking
 * again; empty for a first visit.
 */
export async function getLastServiceIds(clientId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("services:appointment_services ( service_id, position )")
    .eq("client_id", clientId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.services ?? [])
    .sort((a, b) => a.position - b.position)
    .map((s) => s.service_id);
}

export type Ritmo = {
  /** Already has something booked after this appointment. */
  yaTieneProximo: boolean;
  /** Days between the visit before this one and this one, if there was one. */
  diasDesdeAnterior: number | null;
};

/**
 * What «el próximo turno» needs after a visit: whether the client already has
 * the next one booked, and how far apart their last two visits were, so the
 * suggestion follows their own rhythm.
 */
export async function getRitmo(clientId: string, startsAt: string): Promise<Ritmo> {
  const supabase = await createClient();

  const [siguiente, anterior] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .eq("client_id", clientId)
      .gt("starts_at", startsAt)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("starts_at")
      .eq("client_id", clientId)
      .lt("starts_at", startsAt)
      .eq("status", "attended")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Unsure means «already has one»: better to not offer it than to offer a
  // second appointment to someone who already has the next one.
  if (siguiente.error) return { yaTieneProximo: true, diasDesdeAnterior: null };

  const dias = anterior.data
    ? Math.round(
        (new Date(startsAt).getTime() - new Date(anterior.data.starts_at).getTime()) /
          86_400_000,
      )
    : null;

  return { yaTieneProximo: siguiente.data !== null, diasDesdeAnterior: dias };
}

/**
 * Past days that still have appointments nobody closed (pending or confirmed
 * after they happened), most recent first, for the reminder on the home page.
 *
 * Today is left out: its appointments are still going on. Only the last 30
 * days count, so a forgotten appointment from months ago does not nag forever.
 */
export async function getDiasSinCerrar(
  timeZone: string,
): Promise<Array<{ dia: string; cuantos: number }>> {
  const hoy = todayIn(timeZone);
  const desde = new Date(Date.now() - 30 * 86_400_000);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("starts_at")
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", desde.toISOString())
    .lt("starts_at", zonedDayRange(hoy, timeZone).from.toISOString());

  // A reminder, not something to fail the home page over.
  if (error) return [];

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const porDia = new Map<string, number>();
  for (const row of data ?? []) {
    const dia = formatter.format(new Date(row.starts_at));
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }

  return [...porDia.entries()]
    .map(([dia, cuantos]) => ({ dia, cuantos }))
    .sort((x, y) => (x.dia < y.dia ? 1 : -1));
}
