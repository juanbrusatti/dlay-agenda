import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import { createService } from "@/lib/actions/services";
import { listCategories } from "@/lib/data/services";
import { ServiceForm } from "../_components/service-form";
import { getAvisosDelServicio } from "@/lib/data/avisos";

export const metadata: Metadata = { title: "Nuevo servicio" };

export default async function NuevoServicioPage() {
  const membership = await getCurrentTenant();
  if (!membership) return null;

  // La RLS lo rechazaría igual; esto evita mostrar un formulario que después
  // no va a poder guardarse.
  if (!atLeast(membership.role, "admin")) notFound();

  const [categories, avisos] = await Promise.all([
    listCategories(),
    getAvisosDelServicio(null, membership.tenant.name),
  ]);

  return (
    <>

      <main className="mx-auto grid max-w-2xl gap-5 px-4 py-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Nuevo servicio
        </h1>

        <ServiceForm
          action={createService}
          categories={categories}
          avisos={avisos}
          submitLabel="Crear servicio"
        />
      </main>
    </>
  );
}
