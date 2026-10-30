import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Salud y uso · Plataforma" };

type Negocio = {
  tenant_id: string;
  nombre: string;
  slug: string;
  creado: string;
  suscripcion: { plan?: string; estado?: string; prueba_hasta?: string } | null;
  titular: { nombre: string | null; correo: string | null; ultimo_ingreso: string | null } | null;
  ultimo_ingreso_equipo: string | null;
  telefono: string | null;
  whatsapp: {
    status: string;
    numero: string | null;
    vinculado: string | null;
    ultimo_mensaje: string | null;
    error: string | null;
  } | null;
  envios: {
    enviados_24h: number;
    fallidos_24h: number;
    salteados_24h: number;
    enviados_7d: number;
    fallidos_7d: number;
    salteados_7d: number;
  };
  trabados: number;
  en_cola: number;
  motivo_salteo: { motivo: string | null; veces: number } | null;
  ultimos_errores: { cuando: string; error: string | null }[];
  clientes: number;
  turnos_cargados_7d: number;
  turnos_proximos: number;
  ultimo_turno_cargado: string | null;
};

type Auditoria = {
  generado: string;
  base: { bytes: number; limite_bytes: number; tablas: { nombre: string; bytes: number }[] };
  negocios: Negocio[];
};

const ETAPA: Record<string, [string, string]> = {
  prueba: ["En prueba", "bg-accent-wash text-accent-text"],
  activa: ["Al día", "bg-ok-wash text-ok"],
  a_pagar: ["Vencido", "bg-warn-wash text-warn"],
  suspendida: ["Suspendida", "bg-warn text-on-accent"],
};

const ZONA = "America/Argentina/Cordoba";

/** La página se arma en el servidor, que está en UTC: la hora va en la de Córdoba. */
function fecha(iso: string | null | undefined) {
  return iso
    ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: ZONA })
    : "—";
}

/** «2026-10-30» en Córdoba: para contar días de calendario y no de 24 horas. */
function dia(ms: number) {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: ZONA });
}

function hace(iso: string | null | undefined, ahora: number) {
  if (!iso) return "nunca";
  const dias = Math.round(
    (Date.parse(dia(ahora)) - Date.parse(dia(new Date(iso).getTime()))) / 86_400_000,
  );
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function megas(bytes: number) {
  return `${(bytes / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

/**
 * Salud y uso de cada negocio.
 *
 * Arriba, lo que pide atención ya: envíos trabados, errores y WhatsApp caídos.
 * Después cada negocio con quién es, cómo le salen los avisos y cuánto lo usa;
 * los que están de prueba y casi no lo tocan se marcan, porque son a los que
 * hay que llamar antes de que se les termine el mes.
 *
 * Todo sale de una sola consulta que lee lo que ya está guardado, y sólo
 * cuando alguien abre esta pantalla.
 */
export default async function SaludPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_auditoria");
  if (error || !data) notFound();

  const a = data as unknown as Auditoria;
  const ahora = new Date(a.generado).getTime();
  const tresDias = 3 * 86_400_000;

  const conProblemas = (n: Negocio) =>
    n.trabados > 0 ||
    n.envios.fallidos_24h > 0 ||
    (n.whatsapp !== null && n.whatsapp.status !== "connected" && n.whatsapp.status !== "connecting");

  const sinUso = (n: Negocio) =>
    n.suscripcion?.estado === "prueba" &&
    n.turnos_cargados_7d === 0 &&
    (!n.ultimo_ingreso_equipo || ahora - new Date(n.ultimo_ingreso_equipo).getTime() > tresDias);

  const problemas = a.negocios.filter(conProblemas);
  const quietos = a.negocios.filter(sinUso);
  const trabadosTotal = a.negocios.reduce((s, n) => s + n.trabados, 0);
  const usoBase = Math.min(100, (a.base.bytes / a.base.limite_bytes) * 100);

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
      <header>
        <Link href="/plataforma" className="text-[13px] text-muted hover:text-ink">
          ← Plataforma
        </Link>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Salud y uso
        </h1>
        <p className="mt-1 max-w-prose text-[14.5px] text-muted">
          Cómo les salen los avisos a los negocios, cuánto usan el sistema y
          quién es cada uno. Calculado al abrir esta pantalla: {fecha(a.generado)}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Resumen
          titulo="Envíos trabados"
          valor={String(trabadosTotal)}
          nota={trabadosTotal > 0 ? "Tendrían que haber salido hace más de 15 minutos." : "Todo lo que tocaba, salió."}
          alerta={trabadosTotal > 0}
        />
        <Resumen
          titulo="Negocios con problemas"
          valor={String(problemas.length)}
          nota="Envíos fallidos en 24 horas o WhatsApp caído."
          alerta={problemas.length > 0}
        />
        <Resumen
          titulo="En prueba y quietos"
          valor={String(quietos.length)}
          nota="Sin turnos nuevos esta semana y sin entrar hace días."
          alerta={quietos.length > 0}
        />
      </div>

      <section className="grid gap-3">
        {a.negocios.map((n) => (
          <FichaNegocio
            key={n.tenant_id}
            n={n}
            ahora={ahora}
            problema={conProblemas(n)}
            quieto={sinUso(n)}
          />
        ))}
      </section>

      <Card>
        <CardBody className="grid gap-3">
          <CardTitle>Base de datos</CardTitle>
          <p className="text-[14px] text-muted">
            {megas(a.base.bytes)} de {megas(a.base.limite_bytes)} del plan gratis (
            {usoBase.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %).
          </p>
          <div className="h-2 overflow-hidden rounded-pill bg-line" aria-hidden>
            <div
              className={`h-full rounded-pill ${usoBase > 80 ? "bg-danger" : usoBase > 60 ? "bg-warn" : "bg-accent"}`}
              style={{ width: `${Math.max(usoBase, 1)}%` }}
            />
          </div>
          <ul className="grid gap-1 text-[13px]">
            {a.base.tablas.map((t) => (
              <li key={t.nombre} className="flex justify-between gap-3">
                <span className="truncate text-muted">{t.nombre}</span>
                <span className="shrink-0 tabular-nums">{megas(t.bytes)}</span>
              </li>
            ))}
          </ul>
          <p className="text-[12.5px] text-faint">
            Todos los días a las 5:30 se borra el historial del planificador de
            más de 7 días y la bitácora de cambios de más de 6 meses.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}

function Resumen({ titulo, valor, nota, alerta }: { titulo: string; valor: string; nota: string; alerta: boolean }) {
  return (
    <Card className={alerta ? "border-warn bg-warn-wash" : undefined}>
      <CardBody className="grid gap-1">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{titulo}</p>
        <p className={`text-[28px] font-bold leading-none tabular-nums ${alerta ? "text-warn" : ""}`}>{valor}</p>
        <p className="text-[12.5px] leading-snug text-muted">{nota}</p>
      </CardBody>
    </Card>
  );
}

function FichaNegocio({
  n,
  ahora,
  problema,
  quieto,
}: {
  n: Negocio;
  ahora: number;
  problema: boolean;
  quieto: boolean;
}) {
  const [etapa, color] =
    n.suscripcion?.plan === "acuerdo"
      ? ["Acuerdo propio", "bg-surface-2 text-muted"]
      : (ETAPA[n.suscripcion?.estado ?? ""] ?? ["—", "bg-surface-2 text-muted"]);

  const wa = n.whatsapp;
  const waTexto = !wa
    ? "Sin vincular"
    : wa.status === "connected"
      ? `Conectado desde ${fecha(wa.vinculado)}`
      : wa.status === "connecting"
        ? "Esperando que escaneen el código"
        : (wa.error ?? "Desconectado");

  return (
    <Card className={problema ? "border-warn" : undefined}>
      <CardBody className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{n.nombre}</CardTitle>
            <p className="mt-0.5 text-[12.5px] text-faint">
              /{n.slug} · alta {fecha(n.creado)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quieto && (
              <span className="rounded-pill bg-warn-wash px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wider text-warn">
                Casi sin uso
              </span>
            )}
            <span className={`rounded-pill px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wider ${color}`}>
              {etapa}
            </span>
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-2">
          <Dato titulo="Titular">
            {n.titular?.nombre ?? "—"}
            {n.titular?.correo && <span className="block text-muted">{n.titular.correo}</span>}
            {n.telefono && <span className="block text-muted">{n.telefono}</span>}
          </Dato>
          <Dato titulo="Último ingreso">
            {hace(n.ultimo_ingreso_equipo, ahora)}
            <span className="block text-muted">{fecha(n.ultimo_ingreso_equipo)}</span>
          </Dato>
          <Dato titulo="WhatsApp">
            <span className={wa?.status === "connected" ? "" : "text-warn"}>{waTexto}</span>
            {wa?.numero && <span className="block text-muted">{wa.numero}</span>}
          </Dato>
          <Dato titulo="Uso">
            {n.clientes} {n.clientes === 1 ? "cliente" : "clientes"} · {n.turnos_proximos} turnos por venir
            <span className="block text-muted">
              {n.turnos_cargados_7d} cargados esta semana · último {hace(n.ultimo_turno_cargado, ahora)}
            </span>
          </Dato>
        </dl>

        <div className="grid gap-2 rounded-[14px] bg-surface-2 px-3.5 py-3 text-[13.5px]">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Avisos</p>
          <p>
            Últimas 24 horas: <b className="tabular-nums">{n.envios.enviados_24h}</b> enviados ·{" "}
            <b className={`tabular-nums ${n.envios.fallidos_24h > 0 ? "text-danger" : ""}`}>{n.envios.fallidos_24h}</b> fallidos ·{" "}
            <b className="tabular-nums">{n.envios.salteados_24h}</b> salteados
          </p>
          <p className="text-muted">
            Últimos 7 días: {n.envios.enviados_7d} enviados · {n.envios.fallidos_7d} fallidos ·{" "}
            {n.envios.salteados_7d} salteados · {n.en_cola} en cola
          </p>
          {n.trabados > 0 && (
            <p className="font-semibold text-danger">
              {n.trabados} {n.trabados === 1 ? "aviso trabado" : "avisos trabados"}: tendrían que haber salido y siguen en la cola.
            </p>
          )}
          {n.motivo_salteo?.motivo && (
            <p className="text-muted">
              Lo que más se saltea: «{n.motivo_salteo.motivo}» ({n.motivo_salteo.veces})
            </p>
          )}
          {n.ultimos_errores.length > 0 && (
            <ul className="grid gap-1 text-[12.5px] text-danger">
              {n.ultimos_errores.map((e, i) => (
                <li key={i}>
                  {fecha(e.cuando)} · {e.error ?? "Sin detalle"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-semibold uppercase tracking-wider text-muted">{titulo}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
