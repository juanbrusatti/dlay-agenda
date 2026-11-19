"use server";

import { getCurrentUser } from "@/lib/auth/tenant";
import { NOVEDADES } from "@/lib/novedades";
import { createClient } from "@/lib/supabase/server";

/** Notes that the person closed the current notice, on every device. */
export async function marcarNovedadesVistas(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ novedades_vistas: NOVEDADES.clave })
    .eq("id", user.id);
}
