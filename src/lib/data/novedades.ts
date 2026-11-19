import "server-only";

import { getCurrentUser } from "@/lib/auth/tenant";
import { NOVEDADES } from "@/lib/novedades";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether to open the «what's new» notice: only for people who were already
 * using the app before it (they finished the welcome tour earlier) and have
 * not closed this one yet. When in doubt, it does not open.
 */
export async function getNovedadesPendientes(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("guide_seen_at, novedades_vistas")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data?.guide_seen_at) return false;
  return (
    new Date(data.guide_seen_at) < new Date(NOVEDADES.desde) &&
    data.novedades_vistas !== NOVEDADES.clave
  );
}
