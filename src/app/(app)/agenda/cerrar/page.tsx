import Link from "next/link";
import type { Metadata } from "next";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import { porCerrar } from "@/lib/cierre";
import { getDay } from "@/lib/data/agenda";
import { getOpenSession, getPaidByAppointment } from "@/lib/data/caja";
import { longDateIn, timeIn, todayIn } from "@/lib/tz";
import { FormCierre, type TurnoACerrar } from "../_components/form-cierre";

export const metadata: Metadata = { title: "Cerrar el día" };

/**
 * End of the day in one step: everyone who is still pending or confirmed
 * comes pre-marked as «vino», with their balance ready to charge. The person
 * only unticks who did not come and picks how they paid.
 */
export default async function CerrarDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const { dia } = await searchParams;

  const membership = await getCurrentTenant();
  if (!membership) return null;

  const tz = membership.tenant.timezone;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dia ?? "") ? dia! : todayIn(tz);

  const { appointments } = await getDay(date, tz);
  const abiertos = porCerrar(appointments, new Date());

  // A professional marks who came but does not see the money.
  const puedeCobrar = atLeast(membership.role, "reception");
  const [pagado, caja] = puedeCobrar
    ? await Promise.all([
        getPaidByAppointment(abiertos.map((a) => a.id)),
        getOpenSession(),
      ])
    : [{} as Record<string, number>, null];

  const turnos: TurnoACerrar[] = abiertos.map((a) => {
    const servicios = a.services.map((s) => s.service?.name).filter(Boolean) as string[];
    return {
      id: a.id,
      hora: timeIn(a.starts_at, tz),
      nombre: a.client
        ? [a.client.first_name, a.client.last_name].filter(Boolean).join(" ")
        : "Sin cliente",
      servicios: servicios.join(", "),
      saldoCents: puedeCobrar ? Math.max(0, Number(a.price_cents) - (pagado[a.id] ?? 0)) : 0,
    };
  });

  return (
    <main className="mx-auto grid max-w-2xl gap-5 px-4 py-8">
      <div>
        <Link href={`/agenda?dia=${date}`} className="text-[13px] text-muted hover:text-ink">
          ← Agenda
        </Link>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Cerrar el día
        </h1>
        <p className="mt-1 text-[14.5px] capitalize text-muted">{longDateIn(date, tz)}</p>
      </div>

      {/* Always mounted, even with nothing left: after closing, the page
          reloads with an empty list and the form keeps showing the summary. */}
      <FormCierre
        turnos={turnos}
        puedeCobrar={puedeCobrar}
        cajaAbierta={caja !== null}
        volver={`/agenda?dia=${date}`}
      />
    </main>
  );
}
