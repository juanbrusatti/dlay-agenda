"use server";

import { revalidatePath } from "next/cache";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import type { Cuando } from "@/lib/avisos";
import { aplicar } from "@/lib/avisos-guardar";

/**
 * Prende o apaga un aviso para uno o varios servicios.
 *
 * Por debajo cambia la lista de servicios de la regla de ese momento (ver
 * `lib/avisos.ts`). Lo que ya estaba en cola para un servicio que se apaga se
 * cancela: si no, el cambio recién se notaría después del próximo envío, y
 * nadie entendería por qué le llegó a alguien un aviso que se había sacado.
 */
export async function setAviso(
  serviceIds: string[],
  cuando: Cuando,
  prender: boolean,
): Promise<{ error: string | null }> {
  const membership = await getCurrentTenant();
  if (!membership) return { error: "No encontramos tu negocio." };
  if (!atLeast(membership.role, "admin")) {
    return { error: "Sólo titulares y administración pueden cambiar los avisos." };
  }

  const error = await aplicar(serviceIds, cuando, prender);
  revalidatePath("/recordatorios");
  revalidatePath("/servicios");
  return { error };
}
