import Link from "next/link";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import type { PrimerPaso } from "@/lib/data/guia";

/**
 * Lo que falta para dejar el negocio andando, en el Inicio.
 *
 * Desaparece sola cuando están hechos todos los pasos que no son opcionales:
 * a quien ya está andando no le sirve una lista de tareas cumplidas.
 */
export function PrimerosPasos({ pasos }: { pasos: PrimerPaso[] }) {
  const necesarios = pasos.filter((p) => !p.opcional);
  const hechos = necesarios.filter((p) => p.hecho).length;
  if (hechos === necesarios.length) return null;

  const siguiente = pasos.find((p) => !p.hecho && !p.opcional);

  return (
    <Card>
      <CardBody className="grid gap-4" data-guia="primeros-pasos">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>Primeros pasos</CardTitle>
            <p className="mt-1 text-[13.5px] text-muted">
              Seguilos en orden y en un rato tenés todo andando.
            </p>
          </div>
          <p className="text-[13px] font-semibold tabular-nums text-accent-text">
            {hechos} de {necesarios.length}
          </p>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(hechos / necesarios.length) * 100}%` }}
          />
        </div>

        <ol className="grid gap-1.5">
          {pasos.map((p) => {
            const esElSiguiente = p.id === siguiente?.id;
            return (
              <li key={p.id}>
                <Link
                  href={p.href}
                  className={`flex items-start gap-3 rounded-[16px] border-[1.5px] px-3.5 py-3 hover:border-accent ${
                    esElSiguiente ? "border-accent bg-accent-wash" : "border-line"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      p.hecho
                        ? "bg-accent text-on-accent"
                        : "border-[1.5px] border-line"
                    }`}
                  >
                    {p.hecho ? "✓" : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[14.5px] font-medium ${
                        p.hecho ? "text-muted line-through" : ""
                      }`}
                    >
                      {p.titulo}
                      {p.opcional && (
                        <span className="ml-2 rounded-pill bg-surface-2 px-2 py-0.5 align-middle text-[10.5px] font-semibold uppercase tracking-wider text-faint no-underline">
                          Opcional
                        </span>
                      )}
                    </span>
                    {!p.hecho && (
                      <span className="block text-[13px] leading-snug text-muted">
                        {p.detalle}
                      </span>
                    )}
                  </span>
                  {!p.hecho && <span className="shrink-0 text-muted">→</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
