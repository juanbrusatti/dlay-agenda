import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Estado de la conexión con WhatsApp.
 *
 * Sale de la vista `whatsapp_status`, que existe justamente para esto: la
 * tabla con las credenciales no tiene ningún permiso para quien navega, ni
 * siquiera de lectura. El token se escribe y no se lee nunca más.
 */

export type WhatsappStatus = {
  waba_id: string | null;
  display_phone: string | null;
  status: "pending" | "connected" | "flagged" | "restricted" | "disabled";
  quality_rating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN" | null;
  messaging_limit: string | null;
  onboarding: "manual" | "embedded";
  last_checked_at: string | null;
  has_token: boolean;
  /**
   * La palabra de verificación sí sale: no es una credencial —sólo sirve para
   * el saludo inicial entre Meta y nosotros— y quien conecta tiene que poder
   * copiarla para pegarla del otro lado.
   */
  verify_token: string | null;
  /** El secreto de firma no sale nunca. Sólo si está cargado o no. */
  has_app_secret: boolean;
};

/**
 * Si el WhatsApp por QR se cayó mientras los recordatorios salen de verdad:
 * es el único caso en que hay turnos quedándose sin aviso.
 *
 * Que alguna vez haya tenido número distingue «se cayó» de «nunca se
 * vinculó», que ya lo cubren los primeros pasos. La vista sólo le muestra la
 * fila a titular y administración, que son quienes pueden volver a escanear;
 * para el resto esto da siempre falso.
 */
export async function getWhatsappCaido(tenantId: string): Promise<boolean> {
  const supabase = await createClient();
  const [{ data: sesion }, { data: mensajeria }] = await Promise.all([
    supabase
      .from("baileys_sessions_view")
      .select("status, phone_number")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("messaging_settings")
      .select("test_mode")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  return Boolean(
    sesion?.phone_number &&
      (sesion.status === "disconnected" || sesion.status === "error") &&
      mensajeria?.test_mode === false,
  );
}

export async function getWhatsappStatus(): Promise<WhatsappStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_status")
    .select("*")
    .maybeSingle();
  return (data as WhatsappStatus | null) ?? null;
}
