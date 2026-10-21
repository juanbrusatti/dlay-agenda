import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  CUANDO,
  incluye,
  type AvisosDelServicio,
  type Cuando,
  type ReglaAviso,
} from "@/lib/avisos";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";

export type AvisosDelNegocio = {
  /** Las dos reglas fijas. Null si alguien la borró desde las avanzadas. */
  reglas: Record<Cuando, (ReglaAviso & { plantilla: string | null }) | null>;
  servicios: Array<{ id: string; name: string; preparation_note: string | null }>;
};

/**
 * Las dos reglas que los servicios prenden y apagan, con el texto de WhatsApp
 * de cada una para la vista previa, y los servicios activos.
 *
 * Si hubiera más de una regla con el mismo momento —alguien armó otra desde
 * las opciones avanzadas— se usa la más vieja: es la que nació con la cuenta.
 */
export async function getAvisos(): Promise<AvisosDelNegocio> {
  const supabase = await createClient();

  const [reglas, servicios] = await Promise.all([
    supabase
      .from("reminder_rules")
      .select(
        "id, enabled, service_ids, offset_minutes, rule_templates ( channel, message_templates ( body ) )",
      )
      .eq("trigger", "before_appointment")
      .in("offset_minutes", [CUANDO.semana.offset, CUANDO.dia.offset])
      .order("created_at", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, preparation_note")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (reglas.error) throw reglas.error;
  if (servicios.error) throw servicios.error;

  const elegir = (cuando: Cuando) => {
    const r = (reglas.data ?? []).find((x) => x.offset_minutes === CUANDO[cuando].offset);
    if (!r) return null;
    const whatsapp = (r.rule_templates ?? []).find((rt) => rt.channel === "whatsapp");
    const plantilla =
      (whatsapp?.message_templates as { body: string } | null | undefined)?.body ?? null;
    return { id: r.id, enabled: r.enabled, service_ids: r.service_ids, plantilla };
  };

  return {
    reglas: { semana: elegir("semana"), dia: elegir("dia") },
    servicios: servicios.data ?? [],
  };
}

/**
 * Lo que necesita el formulario de un servicio. Un servicio nuevo arranca con
 * los avisos que el negocio tiene en uso: si avisa un día antes, el servicio
 * nuevo también, salvo que lo desmarquen.
 */
export async function getAvisosDelServicio(
  serviceId: string | null,
  negocio: string,
): Promise<AvisosDelServicio> {
  const [{ reglas }, membership] = await Promise.all([getAvisos(), getCurrentTenant()]);

  const marcado = (c: Cuando) => {
    const r = reglas[c];
    if (serviceId) return incluye(r, serviceId);
    return Boolean(r?.enabled);
  };

  return {
    editable: Boolean(membership && atLeast(membership.role, "admin")),
    marcados: { semana: marcado("semana"), dia: marcado("dia") },
    plantillas: {
      semana: reglas.semana?.plantilla ?? null,
      dia: reglas.dia?.plantilla ?? null,
    },
    negocio,
  };
}
