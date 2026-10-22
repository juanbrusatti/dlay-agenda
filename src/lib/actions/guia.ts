"use server";

import { getCurrentUser } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

/**
 * Anota que la persona ya vio (o salteó) el recorrido de bienvenida, para que
 * no se le vuelva a abrir solo en ningún dispositivo.
 */
export async function marcarGuiaVista(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ guide_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("guide_seen_at", null);
}
