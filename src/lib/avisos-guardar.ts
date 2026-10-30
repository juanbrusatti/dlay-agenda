import "server-only";

import { createClient } from "@/lib/supabase/server";
import { CUANDO, incluye, nuevoAlcance, type Cuando } from "@/lib/avisos";

/**
 * Guarda el cambio de un aviso. No revisa permisos: lo llaman acciones que ya
 * lo hicieron (y la RLS de `reminder_rules` es la barrera de verdad). Vive
 * fuera de un archivo `"use server"` para no quedar expuesto como acción.
 */
export async function aplicar(
  serviceIds: string[],
  cuando: Cuando,
  prender: boolean,
): Promise<string | null> {
  const supabase = await createClient();

  const [{ data: regla, error: reglaError }, { data: activos, error: activosError }] =
    await Promise.all([
      supabase
        .from("reminder_rules")
        .select("id, enabled, service_ids")
        .eq("trigger", "before_appointment")
        .eq("offset_minutes", CUANDO[cuando].offset)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("services").select("id").eq("is_active", true),
    ]);

  if (reglaError || activosError) return "No pudimos leer los avisos. Probá de nuevo.";
  if (!regla) {
    return `Falta el aviso de «${CUANDO[cuando].titulo.toLowerCase()}». Se puede volver a armar desde las opciones avanzadas.`;
  }

  const ids = (activos ?? []).map((s) => s.id);
  const alcance = nuevoAlcance(regla, ids, serviceIds, prender);

  const { error } = await supabase
    .from("reminder_rules")
    .update(alcance)
    .eq("id", regla.id);
  if (error) return "No se pudo guardar el cambio. Probá de nuevo.";

  const reglaNueva = { id: regla.id, ...alcance };
  if (prender) await revivirLoQueVuelve(regla.id, reglaNueva);
  else await cancelarLoQueYaNoVa(regla.id, reglaNueva);
  return null;
}

/** Lo que pone `cancelarLoQueYaNoVa`. Sirve para encontrarlos al volver a prender. */
const APAGADO = "Se apagó este aviso para el servicio.";

/**
 * Vuelve a poner en cola los envíos que se cancelaron al apagar el aviso, si
 * su turno vuelve a tener un servicio con el aviso prendido y todavía no pasó.
 *
 * Hace falta porque cada envío existe una sola vez por turno y regla: el que
 * se canceló sigue ocupando su lugar, y sin esto apagar y volver a prender un
 * aviso dejaba esos turnos sin recordatorio para siempre.
 */
async function revivirLoQueVuelve(
  reglaId: string,
  regla: { id: string; enabled: boolean; service_ids: string[] },
) {
  const supabase = await createClient();
  const { data: cancelados } = await supabase
    .from("message_jobs")
    .select("id, appointment_id")
    .eq("rule_id", reglaId)
    .eq("status", "cancelled")
    .eq("skip_reason", APAGADO);

  const turnos = [...new Set((cancelados ?? []).map((j) => j.appointment_id).filter(Boolean))] as string[];
  if (turnos.length === 0) return;

  const [{ data: vigentes }, { data: servicios }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .in("id", turnos)
      .in("status", ["pending", "confirmed"])
      .gt("starts_at", new Date().toISOString()),
    supabase
      .from("appointment_services")
      .select("appointment_id, service_id")
      .in("appointment_id", turnos),
  ]);

  const siguen = new Set((vigentes ?? []).map((a) => a.id));
  const cubiertos = new Set(
    (servicios ?? [])
      .filter((s) => siguen.has(s.appointment_id) && incluye(regla, s.service_id))
      .map((s) => s.appointment_id),
  );

  const revivir = (cancelados ?? [])
    .filter((j) => j.appointment_id && cubiertos.has(j.appointment_id))
    .map((j) => j.id);
  if (revivir.length === 0) return;

  await supabase
    .from("message_jobs")
    .update({ status: "pending", skip_reason: null })
    .in("id", revivir);
}

/**
 * Cancela los envíos pendientes de la regla cuyos turnos ya no tienen ningún
 * servicio con este aviso prendido. Un turno con depilación y masaje sigue
 * recibiéndolo si sólo se apagó el masaje.
 */
async function cancelarLoQueYaNoVa(
  reglaId: string,
  regla: { id: string; enabled: boolean; service_ids: string[] },
) {
  const supabase = await createClient();
  const { data: pendientes } = await supabase
    .from("message_jobs")
    .select("id, appointment_id")
    .eq("rule_id", reglaId)
    .eq("status", "pending");

  const turnos = [...new Set((pendientes ?? []).map((j) => j.appointment_id).filter(Boolean))] as string[];
  if (turnos.length === 0) return;

  const { data: servicios } = await supabase
    .from("appointment_services")
    .select("appointment_id, service_id")
    .in("appointment_id", turnos);

  const cubiertos = new Set(
    (servicios ?? [])
      .filter((s) => incluye(regla, s.service_id))
      .map((s) => s.appointment_id),
  );

  const cancelar = (pendientes ?? [])
    .filter((j) => j.appointment_id && !cubiertos.has(j.appointment_id))
    .map((j) => j.id);
  if (cancelar.length === 0) return;

  await supabase
    .from("message_jobs")
    .update({ status: "cancelled", skip_reason: APAGADO })
    .in("id", cancelar);
}
