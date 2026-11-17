"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RUBROS } from "@/lib/rubros";

export type FormState = { error: string | null };

const schema = z.object({
  name: z.string().min(2, "Poné el nombre del negocio."),
  rubro: z.enum(RUBROS, { message: "Elegí a qué te dedicás." }),
});

/** Convierte "Estética Asusalud" en "estetica-asusalud". */
function toSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createTenant(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    rubro: formData.get("rubro"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  const base = toSlug(parsed.data.name);
  if (base.length < 3) {
    return { error: "El nombre necesita al menos tres letras o números." };
  }

  const supabase = await createClient();

  // El alta pasa sí o sí por la función de la base, que crea negocio,
  // membresía de titular y sucursal principal en una sola transacción.
  let { data: tenant, error } = await supabase.rpc("create_tenant", {
    p_name: parsed.data.name.trim(),
    p_slug: base,
  });

  // 23505 = el slug ya existe. Se reintenta una vez con un sufijo corto.
  if (error?.code === "23505") {
    const suffix = Math.random().toString(36).slice(2, 6);
    ({ data: tenant, error } = await supabase.rpc("create_tenant", {
      p_name: parsed.data.name.trim(),
      p_slug: `${base.slice(0, 35)}-${suffix}`,
    }));
  }

  if (error || !tenant) {
    return {
      error: "No se pudo crear el negocio. Probá de nuevo en unos segundos.",
    };
  }

  // New accounts are born as estéticas; any other rubro is set right after,
  // and a database trigger swaps in that rubro's default reminder texts. If
  // this fails the account still works, with the generic examples.
  if (parsed.data.rubro !== "estetica") {
    await supabase
      .from("tenants")
      .update({ rubro: parsed.data.rubro })
      .eq("id", tenant.id);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
