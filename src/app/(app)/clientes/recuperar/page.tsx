import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getParaRecuperar } from "@/lib/data/clients";
import { PLAZOS, mensajeRecuperar, plazoDe } from "@/lib/recuperar";
import { todayIn } from "@/lib/tz";
import { ListaRecuperar, type FilaRecuperar } from "./_components/lista-recuperar";

export const metadata: Metadata = { title: "Para recuperar" };

/**
 * Clients who came before and did not come back. Writing to them takes one
 * tap each: WhatsApp opens with a warm message already written.
 */
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias } = await searchParams;

  const membership = await getCurrentTenant();
  if (!membership) return null;

  const plazo = plazoDe(dias);
  const tz = membership.tenant.timezone;
  const lista = await getParaRecuperar(membership.tenantId, plazo);

  const filas: FilaRecuperar[] = lista.map((c) => ({
    id: c.id,
    nombre: [c.first_name, c.last_name].filter(Boolean).join(" "),
    ultimaVisita: c.ultima_visita,
    ultimoServicio: c.ultimo_servicio,
    visitas: c.visitas,
    telefono: c.phone_e164,
    mensaje: mensajeRecuperar(
      membership.tenant.rubro,
      c.first_name,
      membership.tenant.name,
    ),
  }));

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
      <div>
        <Link href="/clientes" className="text-[13px] text-muted hover:text-ink">
          ← Clientes
        </Link>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Para recuperar
        </h1>
        <p className="mt-1 max-w-prose text-[14.5px] text-muted">
          Clientes que ya vinieron, hace un tiempo que no vuelven y no tienen
          turno. «Escribirle» abre WhatsApp con un mensaje listo, que podés
          cambiar antes de mandarlo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[13px] text-muted">Sin venir hace más de:</span>
        {PLAZOS.map((p) => (
          <Link
            key={p}
            href={`/clientes/recuperar?dias=${p}`}
            aria-current={p === plazo ? "true" : undefined}
            className={`rounded-pill border-[1.5px] px-3 py-1 text-[12.5px] font-medium ${
              p === plazo
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {p} días
          </Link>
        ))}
      </div>

      {filas.length === 0 ? (
        <p className="rounded-card border-[1.5px] border-line bg-surface px-5 py-8 text-center text-[14.5px] text-muted">
          No hay nadie para recuperar: todos los que vinieron volvieron en los
          últimos {plazo} días o ya tienen turno.
        </p>
      ) : (
        <>
          <p className="text-[13px] text-muted">
            {filas.length === 1 ? "1 cliente" : `${filas.length} clientes`}
            {filas.length === 200 ? " (los 200 más recientes)" : ""}
          </p>
          <ListaRecuperar filas={filas} hoy={todayIn(tz)} />
        </>
      )}
    </main>
  );
}
