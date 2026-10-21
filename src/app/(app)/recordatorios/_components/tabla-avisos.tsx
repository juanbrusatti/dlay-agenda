"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { setAviso } from "@/lib/actions/avisos";
import { CUANDO, incluye, nuevoAlcance, type Cuando, type ReglaAviso } from "@/lib/avisos";

const COLUMNAS: Cuando[] = ["semana", "dia"];

/**
 * Qué avisa cada servicio, todo en una tabla.
 *
 * Es la pantalla para quien quiere resolverlo en un minuto: una fila por
 * servicio y dos casillas. El mensaje de cada uno se escribe en el servicio;
 * acá sólo se decide cuándo sale. Cada toque se guarda solo.
 */
export function TablaAvisos({
  servicios,
  reglas,
  puedeEditar,
}: {
  servicios: Array<{ id: string; name: string; preparation_note: string | null }>;
  reglas: Record<Cuando, ReglaAviso | null>;
  puedeEditar: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // El cambio se ve al instante; si el servidor lo rechaza, vuelve solo.
  const [vista, cambiar] = useOptimistic(
    reglas,
    (actual, c: { cuando: Cuando; ids: string[]; prender: boolean }) => {
      const r = actual[c.cuando];
      if (!r) return actual;
      const activos = servicios.map((s) => s.id);
      return { ...actual, [c.cuando]: { ...r, ...nuevoAlcance(r, activos, c.ids, c.prender) } };
    },
  );

  function tocar(cuando: Cuando, ids: string[], prender: boolean) {
    setError(null);
    startTransition(async () => {
      cambiar({ cuando, ids, prender });
      const r = await setAviso(ids, cuando, prender);
      if (r.error) setError(r.error);
    });
  }

  const todos = servicios.map((s) => s.id);

  return (
    <Card>
      <CardBody className="grid gap-4">
        <div>
          <CardTitle>Qué avisa cada servicio</CardTitle>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
            Marcá cuándo le llega el recordatorio a quien viene a cada servicio.
            Si un turno tiene dos servicios, recibe un solo mensaje con lo de
            los dos.
          </p>
        </div>

        {servicios.length === 0 ? (
          <p className="text-[13.5px] text-muted">
            Todavía no cargaste servicios.{" "}
            <Link href="/servicios/nuevo" className="text-accent-text underline">
              Cargar el primero
            </Link>
          </p>
        ) : (
          <div className="grid">
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-x-2 border-b-[1.5px] border-line pb-2 sm:gap-x-4">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-faint">
                Servicio
              </span>
              {COLUMNAS.map((c) => {
                const todosPrendidos = todos.every((id) => incluye(vista[c], id));
                return (
                  <div key={c} className="grid w-20 justify-items-center gap-1 text-center sm:w-24">
                    <span className="text-[12px] font-semibold leading-tight">
                      {CUANDO[c].corto}
                    </span>
                    {puedeEditar && vista[c] && (
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => tocar(c, todos, !todosPrendidos)}
                        className="text-[11.5px] text-accent-text underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {todosPrendidos ? "Ninguno" : "Todos"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <ul>
              {servicios.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 border-b-[1.5px] border-line py-2.5 last:border-b-0 sm:gap-x-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-medium">{s.name}</p>
                    {puedeEditar && (
                      <Link
                        href={`/servicios/${s.id}`}
                        className="text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline"
                      >
                        {s.preparation_note?.trim() ? "Ver o cambiar su mensaje" : "Escribirle un mensaje"}
                      </Link>
                    )}
                  </div>
                  {COLUMNAS.map((c) => {
                    const prendido = incluye(vista[c], s.id);
                    return (
                      <div key={c} className="grid w-20 justify-items-center sm:w-24">
                        <input
                          type="checkbox"
                          checked={prendido}
                          disabled={!puedeEditar || !vista[c] || pendiente}
                          onChange={() => tocar(c, [s.id], !prendido)}
                          aria-label={`${CUANDO[c].titulo}: ${s.name}`}
                          className="h-5 w-5 cursor-pointer accent-[var(--color-accent)] disabled:cursor-default"
                        />
                      </div>
                    );
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(!reglas.semana || !reglas.dia) && (
          <p className="text-[12.5px] text-muted">
            Falta el aviso de «
            {(!reglas.semana ? CUANDO.semana : CUANDO.dia).titulo.toLowerCase()}». Se
            puede volver a armar desde las opciones avanzadas.
          </p>
        )}
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
