import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFigure } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReglasWhatsapp } from "@/components/whatsapp/reglas";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import { formatPrice } from "@/lib/money";
import {
  CHANNEL_LABELS,
  getQueueSummary,
  getSettings,
  getWhatsappStatus,
  listRules,
  listUpcoming,
} from "@/lib/data/recordatorios";
import { timeIn } from "@/lib/tz";
import { Freno } from "./_components/freno";
import { ModoPrueba } from "./_components/modo-prueba";
import { ListaReglas } from "./_components/lista-reglas";
import { TablaAvisos } from "./_components/tabla-avisos";
import { getAvisos } from "@/lib/data/avisos";

import { META_VISIBLE } from "@/lib/canal-whatsapp";
import { getBaileysSessionState } from "@/lib/actions/baileys";

export const metadata: Metadata = { title: "Avisos" };

export default async function RecordatoriosPage() {
  const membership = await getCurrentTenant();
  if (!membership) return null;

  const [rules, settings, cola, proximos, whatsapp, qr, avisos] = await Promise.all([
    listRules(),
    getSettings(),
    getQueueSummary(),
    listUpcoming(10),
    META_VISIBLE ? getWhatsappStatus() : null,
    getBaileysSessionState(),
    getAvisos(),
  ]);

  const puedeEditar = atLeast(membership.role, "admin");
  const tz = membership.tenant.timezone;
  const activas = rules.filter((r) => r.enabled).length;

  const cuando = new Intl.DateTimeFormat("es-AR", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
  });

  return (
    <>

      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
              Avisos
            </h1>
            <p className="mt-1 max-w-prose text-[14.5px] text-muted">
              Los recordatorios que le llegan solos a tus clientes por WhatsApp
              antes del turno.
            </p>
          </div>
        </header>

        {META_VISIBLE && <ReglasWhatsapp costo />}

        {settings && !settings.sending_enabled && (
          <Freno enabled={false} reason={settings.paused_reason} />
        )}

        <ModoPrueba
          testMode={settings?.test_mode ?? true}
          puedeEditar={puedeEditar}
          whatsappConectado={
            qr.status === "connected" || Boolean(META_VISIBLE && whatsapp?.has_token)
          }
        />

        {/* Sin cuenta conectada, todo lo que caiga en WhatsApp va a fallar.
            Conviene decirlo antes y no en la bitácora de errores. */}
        {!whatsapp?.has_token && qr.status !== "connected" && (
          <div className="rounded-card border-[1.5px] border-line bg-surface px-4 py-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-faint">
              WhatsApp sin conectar
            </p>
            <p className="mt-0.5 max-w-prose text-[13.5px] leading-relaxed text-muted">
              {META_VISIBLE
                ? "Los recordatorios que caigan en WhatsApp no van a poder salir hasta que conectes la cuenta de Meta. Los que van por correo sí funcionan."
                : "Los recordatorios no van a poder salir hasta que conectes el número en Ajustes → WhatsApp."}
            </p>
          </div>
        )}

        <TablaAvisos
          servicios={avisos.servicios}
          reglas={avisos.reglas}
          puedeEditar={puedeEditar}
        />

        {/* La tasa de lectura y la calidad las informa el webhook de Meta. */}
        {META_VISIBLE && cola.readRate !== null && cola.readRate < 0.5 && (
          <div className="rounded-card border-[1.5px] border-warn bg-warn-wash px-4 py-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-warn">
              Poca gente los está leyendo
            </p>
            <p className="mt-0.5 max-w-prose text-[13.5px] leading-relaxed text-ink">
              Sólo el {Math.round(cola.readRate * 100)} % de tus WhatsApp se
              leyeron. Una tasa sana ronda el 65 %. Conviene revisar los textos
              antes de que Meta empiece a castigar la cuenta.
            </p>
          </div>
        )}

        {META_VISIBLE && whatsapp?.has_token && whatsapp.quality_rating === "RED" && (
          <div className="rounded-card border-[1.5px] border-danger bg-danger-wash px-4 py-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-danger">
              Calidad en rojo
            </p>
            <p className="mt-0.5 max-w-prose text-[13.5px] leading-relaxed text-ink">
              Demasiada gente está bloqueando o reportando tus mensajes. Frená
              los envíos y revisá los textos antes de que Meta limite la cuenta.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardBody className="grid gap-1">
              <CardFigure>{cola.pending}</CardFigure>
              <p className="text-[12.5px] text-muted">
                en cola para salir
                {META_VISIBLE && cola.plannedCents > 0 && ` · ${formatPrice(cola.plannedCents)}`}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-1">
              <CardFigure>{cola.sent}</CardFigure>
              <p className="text-[12.5px] text-muted">
                enviados este mes ·{" "}
                {settings?.test_mode ? "de prueba" : META_VISIBLE ? formatPrice(cola.spentCents) : "reales"}
                {/* Lo informa el webhook de Meta; por QR no hay lectura. */}
                {META_VISIBLE &&
                  cola.readRate !== null &&
                  ` · ${Math.round(cola.readRate * 100)} % leídos`}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-1">
              <CardFigure>{cola.skipped + cola.failed}</CardFigure>
              <p className="text-[12.5px] text-muted">
                {cola.failed > 0
                  ? `sin salir · ${cola.failed} con problema a revisar`
                  : "salteados por falta de canal o tope"}
              </p>
            </CardBody>
          </Card>
        </div>

        {proximos.length > 0 && (
          <section className="grid gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
              Próximos envíos
            </h2>
            <ul className="grid gap-2">
              {proximos.map((j) => {
                const nombre = j.client
                  ? [j.client.first_name, j.client.last_name]
                      .filter(Boolean)
                      .join(" ")
                  : "Sin cliente";
                const salteado = j.status === "skipped";

                return (
                  <li
                    key={j.id}
                    className={`flex items-center gap-3 rounded-card border-[1.5px] border-line bg-surface px-4 py-3 ${
                      salteado ? "opacity-70" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium">
                        {nombre}
                      </p>
                      <p className="truncate text-[12.5px] text-muted">
                        {salteado
                          ? (j.skip_reason ?? "Salteado")
                          : META_VISIBLE
                            ? `${j.rule?.name ?? "Regla"} · ${
                                j.channel ? CHANNEL_LABELS[j.channel] : "sin canal"
                              }`
                            : (j.rule?.name ?? "Aviso")}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[13px] tabular-nums text-muted">
                        {cuando.format(new Date(j.scheduled_for))}{" "}
                        {timeIn(j.scheduled_for, tz)}
                      </p>
                      {META_VISIBLE && j.cost_cents > 0 && (
                        <p className="text-[12px] tabular-nums text-faint">
                          {formatPrice(j.cost_cents)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {puedeEditar && (
          <details className="group rounded-card border-[1.5px] border-line bg-surface">
            <summary className="cursor-pointer list-none px-4 py-3.5 text-[14.5px] font-semibold">
              <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
              Opciones avanzadas
              <span className="block pl-5 text-[12.5px] font-normal text-muted">
                Reglas a medida, el saludo y el cierre de los mensajes, y a quiénes
                avisar. Para la mayoría de los negocios no hace falta tocar nada.
              </span>
            </summary>
            <div className="grid gap-4 border-t-[1.5px] border-line px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/recordatorios/plantillas">Saludo y cierre de los mensajes</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/recordatorios/nuevo">Nueva regla</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/configuracion/mensajeria">Horario de envío</Link>
                </Button>
              </div>
        {rules.length === 0 ? (
            <EmptyState
              eyebrow="Todo a mano"
              title="Todavía no hay ninguna regla"
              action={
                puedeEditar ? (
                  <Button asChild size="lg">
                    <Link href="/recordatorios/nuevo">Armar la primera</Link>
                  </Button>
                ) : undefined
              }
            >
              <p>
                Una regla es una frase: <em>cuando falten 24 horas para el turno,
                avisarle por correo y, si no tiene, por WhatsApp</em>. La armás una
                vez y no la tocás más.
              </p>
              <p className="mt-2">
                Antes de activarla vas a ver a cuánta gente le llega y cuánto
                cuesta.
              </p>
            </EmptyState>
          ) : (
            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
                  Reglas
                </h2>
                <p className="text-[13px] text-muted">
                  {activas} {activas === 1 ? "activa" : "activas"} de{" "}
                  {rules.length}
                </p>
              </div>
              <ListaReglas rules={rules} />
            </section>
          )}
            </div>
          </details>
        )}

        {settings?.sending_enabled && puedeEditar && rules.length > 0 && (
          <div className="flex justify-end">
            <Freno enabled reason={null} />
          </div>
        )}
      </main>
    </>
  );
}
