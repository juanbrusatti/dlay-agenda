"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/money";

/**
 * «¿Cuánto te cuesta un turno perdido?»: two numbers the visitor knows by
 * heart, and what they add up to in a month against the subscription.
 *
 * It promises nothing about how many turns the reminders save: it only says
 * how many it takes to pay for itself, which the visitor can judge.
 */
export function Calculadora({ abonoCents }: { abonoCents: number }) {
  const [perdidos, setPerdidos] = useState("4");
  const [precio, setPrecio] = useState("15000");

  const cantidad = Math.max(0, Math.min(500, Math.floor(Number(perdidos) || 0)));
  const precioCents = Math.max(0, Math.round((Number(precio.replace(/\D/g, "")) || 0) * 100));
  const perdidaCents = cantidad * precioCents;
  const paraPagarlo = precioCents > 0 ? Math.ceil(abonoCents / precioCents) : null;

  return (
    <div className="grid gap-5 rounded-card border-[1.5px] border-line bg-surface p-5 sm:grid-cols-2 sm:p-7">
      <div className="grid content-start gap-4">
        <label className="grid gap-1.5">
          <span className="text-[13.5px] font-medium">
            ¿Cuántos turnos se te pierden por mes?
          </span>
          <input
            inputMode="numeric"
            value={perdidos}
            onChange={(e) => setPerdidos(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className="h-11 w-32 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15px]"
          />
          <span className="text-[12.5px] text-muted">
            Gente que no vino, o que avisó tan tarde que no pudiste dar el horario.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[13.5px] font-medium">¿Cuánto sale un turno, más o menos?</span>
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-muted">$</span>
            <input
              inputMode="numeric"
              value={precio}
              onChange={(e) => setPrecio(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="h-11 w-40 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15px]"
            />
          </div>
        </label>
      </div>

      <div className="grid content-center gap-2 rounded-[18px] bg-surface-2 p-5" aria-live="polite">
        <p className="text-[13.5px] text-muted">Por mes, eso es</p>
        <p className="text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums">
          {formatPrice(perdidaCents)}
        </p>
        <p className="text-[13.5px] leading-relaxed text-muted">
          que no entran.
          {paraPagarlo !== null && (
            <>
              {" "}
              Dlay cuesta {formatPrice(abonoCents)} por mes: con que se salve{" "}
              {paraPagarlo === 1 ? "un turno" : `${paraPagarlo} turnos`}, ya se pagó.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
