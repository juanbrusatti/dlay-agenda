import type { Metadata } from "next";
import { Guia } from "./guia";

export const metadata: Metadata = { title: "Ayuda" };

/**
 * La guía completa. Está para todos los roles: quien atiende también tiene
 * que poder averiguar cómo se marca un turno sin preguntarle a nadie.
 */
export default function AyudaPage() {
  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Ayuda
        </h1>
        <p className="mt-1 max-w-prose text-[14.5px] text-muted">
          Todo lo que hace Dlay, explicado. Buscá lo que necesitás o recorrelo
          por partes.
        </p>
      </header>
      <Guia />
    </main>
  );
}
