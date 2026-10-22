import "server-only";

import { getCurrentUser } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

/** Si la persona ya vio el recorrido de bienvenida. */
export async function getGuiaVista(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("guide_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  // Ante la duda, no se abre: un recorrido que aparece en cada pantalla por un
  // error de lectura es peor que uno que no aparece.
  return data ? data.guide_seen_at !== null : true;
}

export type PrimerPaso = {
  id: string;
  titulo: string;
  detalle: string;
  href: string;
  hecho: boolean;
  opcional?: boolean;
};

/**
 * Lo que le falta a un negocio para quedar andando, en el orden en que
 * conviene hacerlo. Cada paso se da por hecho mirando los datos, no porque
 * alguien lo tilde: así no se puede marcar algo que no se hizo.
 */
export async function getPrimerosPasos(tenantId: string): Promise<PrimerPaso[]> {
  const supabase = await createClient();
  const contar = { count: "exact", head: true } as const;

  const [servicios, horarios, clientes, equipo, qr, reglas, mensajeria, reserva] =
    await Promise.all([
      supabase.from("services").select("id", contar).eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("business_hours").select("id", contar).eq("tenant_id", tenantId),
      supabase.from("clients").select("id", contar).eq("tenant_id", tenantId),
      supabase.from("memberships").select("id", contar).eq("tenant_id", tenantId).eq("status", "active"),
      supabase.from("baileys_sessions_view").select("status").eq("tenant_id", tenantId).maybeSingle(),
      supabase
        .from("reminder_rules")
        .select("id", contar)
        .eq("tenant_id", tenantId)
        .eq("enabled", true),
      supabase.from("messaging_settings").select("test_mode").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("booking_settings").select("enabled").eq("tenant_id", tenantId).maybeSingle(),
    ]);

  const hayServicios = (servicios.count ?? 0) > 0;

  return [
    {
      id: "servicios",
      titulo: "Cargá tus servicios",
      detalle: "Con su duración y su precio. Sin servicios no se pueden agendar turnos.",
      href: hayServicios ? "/servicios" : "/servicios/nuevo",
      hecho: hayServicios,
    },
    {
      id: "horarios",
      titulo: "Revisá tus horarios de atención",
      detalle: "Vienen cargados de lunes a viernes. Cambialos si no son los tuyos.",
      href: "/configuracion/horarios",
      hecho: (horarios.count ?? 0) > 0,
    },
    {
      id: "whatsapp",
      titulo: "Conectá tu WhatsApp",
      detalle: "Escaneando un código, como WhatsApp Web. Los recordatorios salen desde tu número.",
      href: "/configuracion/whatsapp",
      hecho: qr.data?.status === "connected",
    },
    {
      id: "avisos",
      titulo: "Elegí qué avisa cada servicio",
      detalle: "Una semana antes, un día antes o las dos, y qué le dice el mensaje.",
      href: "/recordatorios",
      hecho: hayServicios && (reglas.count ?? 0) > 0,
    },
    {
      id: "clientes",
      titulo: "Traé tus clientes",
      detalle: "Desde un Excel, de una vez, o cargalos a medida que vengan.",
      href: "/clientes/importar",
      hecho: (clientes.count ?? 0) > 0,
    },
    {
      id: "enviar",
      titulo: "Empezá a enviar de verdad",
      detalle: "Los avisos arrancan en modo de prueba. Cuando te gusten, activalos.",
      href: "/recordatorios",
      hecho: mensajeria.data?.test_mode === false,
    },
    {
      id: "reserva",
      titulo: "Abrí tu reserva online",
      detalle: "Para que tus clientes saquen turno solos, a cualquier hora.",
      href: "/configuracion/reservas",
      hecho: reserva.data?.enabled === true,
      opcional: true,
    },
    {
      id: "equipo",
      titulo: "Sumá a tu equipo",
      detalle: "Cada persona con su usuario y sus permisos.",
      href: "/configuracion/equipo",
      hecho: (equipo.count ?? 0) > 1,
      opcional: true,
    },
  ];
}
