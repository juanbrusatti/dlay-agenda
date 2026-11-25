"use client";

import { useEffect, useState } from "react";
import { horariosLibres, type HorariosLibres } from "@/lib/actions/horarios";

/**
 * The free times of the chosen day, as buttons: tapping one fills in the
 * hour. Asks again whenever the day or the length changes.
 *
 * Only a shortcut: the hour field stays editable, and the database checks
 * the real capacity when saving, as before.
 */
export function ElegirHorario({
  fecha,
  minutos,
  excluir,
  elegida,
  onElegir,
}: {
  fecha: string;
  /** Service time plus cleanup; nothing is offered until it is known. */
  minutos: number;
  /** When moving: the appointment being moved, so its own time is free. */
  excluir?: string;
  elegida: string;
  onElegir: (hora: string) => void;
}) {
  const [resultado, setResultado] = useState<{ clave: string; r: HorariosLibres } | null>(null);
  const clave = `${fecha}|${minutos}|${excluir ?? ""}`;
  const listo = minutos > 0 && /^\d{4}-\d{2}-\d{2}$/.test(fecha);

  useEffect(() => {
    if (!listo) return;
    let vigente = true;
    horariosLibres(fecha, minutos, excluir).then(
      (r) => vigente && setResultado({ clave, r }),
      () => vigente && setResultado({ clave, r: { estado: "error" } }),
    );
    // A slower answer for a day the person already changed is dropped.
    return () => {
      vigente = false;
    };
  }, [clave, listo, fecha, minutos, excluir]);

  if (!listo) {
    return (
      <p className="text-[12.5px] text-muted">
        Elegí qué se le hace y te mostramos los horarios libres de ese día.
      </p>
    );
  }

  const r = resultado?.clave === clave ? resultado.r : null;

  if (!r) return <p className="text-[12.5px] text-faint">Buscando horarios libres…</p>;
  // Nothing useful to say: the hour field still works as always.
  if (r.estado === "error" || r.estado === "pasado") return null;
  if (r.estado === "cerrado") {
    return (
      <p className="text-[12.5px] text-muted">
        Ese día no atendés según tus horarios. Si igual querés agendar, escribí la hora.
      </p>
    );
  }
  if (r.horas.length === 0) {
    return (
      <p className="text-[12.5px] text-muted">
        Ese día ya no queda un hueco libre de ese largo. Probá con otro día.
      </p>
    );
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-[12.5px] text-muted">Libres ese día:</span>
      <div className="flex flex-wrap gap-1.5">
        {r.horas.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onElegir(h)}
            aria-pressed={h === elegida}
            className={`rounded-pill border-[1.5px] px-3 py-1.5 text-[13px] font-medium tabular-nums ${
              h === elegida
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-surface text-ink hover:border-accent"
            }`}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}
