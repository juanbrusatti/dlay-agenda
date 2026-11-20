import type { Metadata } from "next";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { createClientAction } from "@/lib/actions/clients";
import { esDia, esHoraAgendable } from "@/lib/agendar";
import { ClientForm } from "../_components/client-form";

export const metadata: Metadata = { title: "Nueva ficha" };

/**
 * Splits what was typed in the search into a starting point for the record:
 * digits go to the phone, words to the name.
 */
function sugerencia(q: string) {
  const texto = q.trim().slice(0, 80);
  if (!texto) return undefined;
  if (/^[\d\s()+-]+$/.test(texto)) return { phoneRaw: texto };
  const [firstName, ...resto] = texto.split(/\s+/);
  return { firstName, lastName: resto.join(" ") || undefined };
}

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ agendar?: string; hora?: string; q?: string }>;
}) {
  const membership = await getCurrentTenant();
  if (!membership) return null;

  const { agendar, hora, q = "" } = await searchParams;
  // Coming from «Agendar turno»: the day to go back to after saving.
  const agendarEl = esDia(agendar) ? agendar : undefined;
  const agendarA = agendarEl && esHoraAgendable(hora) ? hora : undefined;

  return (
    <>
      <main className="mx-auto grid max-w-2xl gap-5 px-4 py-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Nueva ficha
        </h1>
        <ClientForm
          action={createClientAction}
          submitLabel={agendarEl ? "Crear y agendar turno" : "Crear ficha"}
          sugerido={sugerencia(q)}
          agendarEl={agendarEl}
          agendarA={agendarA}
        />
      </main>
    </>
  );
}
