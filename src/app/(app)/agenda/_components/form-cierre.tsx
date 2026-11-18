"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cerrarDia, type CierreDia } from "@/lib/actions/agenda";
import { METHODS, METHOD_LABELS, type PaymentMethod } from "@/lib/caja";
import { formatPrice } from "@/lib/money";

export type TurnoACerrar = {
  id: string;
  hora: string;
  nombre: string;
  servicios: string;
  /** What is still owed. 0 when it is paid, «a convenir», or not visible. */
  saldoCents: number;
};

type Marca = { vino: boolean; cobrar: boolean };

/**
 * The closing list. Everyone starts as «vino» and, if something is owed,
 * ticked to charge: the usual day needs a single tap at the bottom.
 */
export function FormCierre({
  turnos,
  puedeCobrar,
  cajaAbierta,
  volver,
}: {
  turnos: TurnoACerrar[];
  puedeCobrar: boolean;
  cajaAbierta: boolean;
  volver: string;
}) {
  const [marcas, setMarcas] = useState<Record<string, Marca>>(() =>
    Object.fromEntries(
      turnos.map((t) => [t.id, { vino: true, cobrar: puedeCobrar && t.saldoCents > 0 }]),
    ),
  );
  const [metodo, setMetodo] = useState<PaymentMethod>("cash");
  const [resultado, setResultado] = useState<CierreDia | null>(null);
  const [pendiente, startTransition] = useTransition();

  const cambiar = (id: string, cambio: Partial<Marca>) =>
    setMarcas((m) => ({ ...m, [id]: { ...m[id], ...cambio } }));

  const vinieron = turnos.filter((t) => marcas[t.id].vino);
  const aCobrar = vinieron.filter((t) => marcas[t.id].cobrar && t.saldoCents > 0);
  const totalCents = aCobrar.reduce((s, t) => s + t.saldoCents, 0);
  const faltaCaja = aCobrar.length > 0 && metodo === "cash" && !cajaAbierta;

  function cerrar() {
    setResultado(null);
    startTransition(async () => {
      setResultado(
        await cerrarDia({
          vinieron: vinieron.map((t) => t.id),
          faltaron: turnos.filter((t) => !marcas[t.id].vino).map((t) => t.id),
          cobrar: aCobrar.map((t) => t.id),
          metodo,
        }),
      );
    });
  }

  if (resultado && !resultado.error && resultado.resumen) {
    const r = resultado.resumen;
    return (
      <Card>
        <CardBody className="grid gap-3">
          <p className="font-hand text-[34px] leading-none text-accent-text">Día cerrado</p>
          <p className="text-[15px] leading-relaxed">
            {r.vinieron} {r.vinieron === 1 ? "vino" : "vinieron"}
            {r.faltaron > 0 && ` · ${r.faltaron} no ${r.faltaron === 1 ? "vino" : "vinieron"}`}
            {r.cobrados > 0 &&
              ` · cobraste ${formatPrice(r.totalCents)} en ${r.cobrados} ${r.cobrados === 1 ? "turno" : "turnos"}`}
            .
          </p>
          <div className="flex">
            <Button asChild>
              <Link href={volver}>Volver a la agenda</Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (turnos.length === 0) {
    return (
      <EmptyState
        eyebrow="Todo al día"
        title="No queda nada por cerrar"
        action={
          <Button asChild size="lg">
            <Link href={volver}>Volver a la agenda</Link>
          </Button>
        }
      >
        <p>
          Los turnos de este día que ya empezaron están marcados. Los que
          todavía no llegaron a su hora aparecen acá cuando empiecen.
        </p>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-[14.5px] leading-relaxed text-muted">
        Están todos marcados como que vinieron. Tocá «No vino» en los que
        faltaron{puedeCobrar ? " y destildá lo que no quieras cobrar ahora" : ""}.
      </p>

      <ul className="grid gap-2.5">
        {turnos.map((t) => {
          const m = marcas[t.id];
          return (
            <li
              key={t.id}
              className={`grid gap-2.5 rounded-card border-[1.5px] bg-surface px-4 py-3 ${
                m.vino ? "border-line" : "border-danger"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    <span className="tabular-nums text-muted">{t.hora}</span> · {t.nombre}
                  </p>
                  {t.servicios && <p className="text-[13px] text-muted">{t.servicios}</p>}
                </div>
                <div className="inline-flex shrink-0 overflow-hidden rounded-pill border-[1.5px] border-line">
                  {[
                    [true, "Vino"],
                    [false, "No vino"],
                  ].map(([valor, texto]) => (
                    <button
                      key={String(valor)}
                      type="button"
                      aria-pressed={m.vino === valor}
                      onClick={() => cambiar(t.id, { vino: valor as boolean })}
                      className={`px-3.5 py-1.5 text-[13px] font-medium ${
                        m.vino === valor
                          ? valor
                            ? "bg-ok-wash text-ok"
                            : "bg-danger-wash text-danger"
                          : "bg-surface text-muted"
                      }`}
                    >
                      {texto as string}
                    </button>
                  ))}
                </div>
              </div>

              {puedeCobrar && m.vino && (
                t.saldoCents > 0 ? (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
                    <input
                      type="checkbox"
                      checked={m.cobrar}
                      onChange={(e) => cambiar(t.id, { cobrar: e.target.checked })}
                      className="h-5 w-5 accent-[var(--color-accent)]"
                    />
                    Cobrar <span className="font-semibold tabular-nums">{formatPrice(t.saldoCents)}</span>
                  </label>
                ) : (
                  <p className="text-[13px] text-muted">
                    Nada para cobrar: ya está pago o es a convenir.
                  </p>
                )
              )}
            </li>
          );
        })}
      </ul>

      {puedeCobrar && aCobrar.length > 0 && (
        <div className="grid gap-2">
          <span className="text-[13.5px] font-medium">Cómo pagaron</span>
          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={metodo === x}
                onClick={() => setMetodo(x)}
                className={`rounded-pill border-[1.5px] px-3 py-1.5 text-[12.5px] font-medium ${
                  metodo === x
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                {METHOD_LABELS[x]}
              </button>
            ))}
          </div>
          <p className="text-[12.5px] leading-snug text-muted">
            Va el mismo medio para todos. Si alguien pagó distinto, destildalo
            acá y cobralo desde su turno.
          </p>
        </div>
      )}

      {faltaCaja && (
        <p className="rounded-[14px] bg-warn-wash px-3.5 py-2.5 text-[13px] leading-snug text-ink">
          No hay una caja abierta, así que el efectivo todavía no se puede
          registrar.{" "}
          <Link href="/caja" className="font-medium underline">
            Abrir la caja
          </Link>
        </p>
      )}

      {resultado?.error && (
        <p role="alert" className="rounded-[14px] bg-danger-wash px-3.5 py-2.5 text-[13.5px] text-danger">
          {resultado.error}
        </p>
      )}

      <div className="grid gap-2 border-t-[1.5px] border-line pt-4">
        <p className="text-[14px] text-muted">
          {vinieron.length} {vinieron.length === 1 ? "vino" : "vinieron"}
          {turnos.length - vinieron.length > 0 &&
            ` · ${turnos.length - vinieron.length} no ${turnos.length - vinieron.length === 1 ? "vino" : "vinieron"}`}
          {aCobrar.length > 0 && ` · se cobran ${formatPrice(totalCents)}`}
        </p>
        <div className="flex">
          <Button size="lg" disabled={pendiente || faltaCaja} onClick={cerrar}>
            {pendiente ? "Cerrando…" : "Cerrar el día"}
          </Button>
        </div>
      </div>
    </div>
  );
}
