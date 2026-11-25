import { publicEnv } from "@/lib/env";

export type BotonPortada = "crear_cuenta" | "whatsapp";

/**
 * Counts one tap on a home page button, for the funnel in the panel.
 *
 * Both buttons leave the page right away (to sign up, or to WhatsApp), so a
 * normal request could be cut halfway. `keepalive` lets it finish after the
 * page is gone. Fire and forget: if it fails, the visitor never notices.
 */
export function contarClic(boton: BotonPortada) {
  try {
    void fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/registrar_clic`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_boton: boton }),
    }).catch(() => {});
  } catch {
    // Old browsers without keepalive: no count, nothing else changes.
  }
}
