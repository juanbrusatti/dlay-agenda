"use server";

import { revalidatePath } from "next/cache";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export type ResultadoLogo = { error: string | null };

/**
 * Saves which uploaded file is the business's logo (or removes it with null),
 * then deletes the files left over in its folder.
 *
 * The upload itself goes from the browser straight to storage; the bucket's
 * policies already keep each business in its own folder. This checks it
 * again, and the table refuses a path outside that folder too.
 */
export async function guardarLogo(path: string | null): Promise<ResultadoLogo> {
  const membership = await getCurrentTenant();
  if (!membership) return { error: "No encontramos tu negocio." };
  if (!atLeast(membership.role, "admin")) {
    return { error: "Sólo titulares y administración pueden cambiar el logo." };
  }

  const carpeta = `${membership.tenantId}/`;
  if (path !== null && (!path.startsWith(carpeta) || path.includes(".."))) {
    return { error: "No se pudo guardar el logo." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ logo_path: path })
    .eq("id", membership.tenantId);

  if (error) return { error: "No se pudo guardar el logo. Probá de nuevo." };

  // Old files are only clutter: removing them can fail without consequence.
  try {
    const { data } = await supabase.storage.from("logos").list(membership.tenantId);
    const sobrantes = (data ?? [])
      .map((f) => `${carpeta}${f.name}`)
      .filter((p) => p !== path);
    if (sobrantes.length > 0) await supabase.storage.from("logos").remove(sobrantes);
  } catch {
    // Leftovers stay; nothing visible depends on them.
  }

  revalidatePath("/configuracion/negocio");
  return { error: null };
}
