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

  if (!prender) await cancelarLoQueYaNoVa(regla.id, { id: regla.id, ...alcance });
  return null;
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
    .update({ status: "cancelled", skip_reason: "Se apagó este aviso para el servicio." })
    .in("id", cancelar);
}
