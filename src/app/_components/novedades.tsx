"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { marcarNovedadesVistas } from "@/lib/actions/novedades";
import { NOVEDADES } from "@/lib/novedades";

/**
 * A short «what's new» card, opened once after an update. Closing it is
 * remembered on the account, so it does not come back on another device.
 */
export function Novedades() {
  const [abierto, setAbierto] = useState(true);
  // Opens only once in the browser: the server render has no document, and
  // drawing the portal on the first pass would not match it.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  if (!montado || !abierto) return null;

  function cerrar() {
    setAbierto(false);
    void marcarNovedadesVistas();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="novedades-titulo"
    >
      <div aria-hidden className="fixed inset-0" style={{ background: "rgb(10 10 25 / 0.55)" }} />
      <div className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-md gap-4 overflow-y-auto rounded-card border-[1.5px] border-line bg-surface p-5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.45)]">
        <div className="grid gap-1">
          <p className="font-hand text-[26px] leading-none text-accent-text">Novedades</p>
          <p id="novedades-titulo" className="text-[18px] font-bold leading-tight tracking-[-0.02em]">
            {NOVEDADES.titulo}
          </p>
        </div>
        <ul className="grid gap-3">
          {NOVEDADES.items.map((item) => (
            <li key={item.titulo} className="grid gap-0.5">
              <p className="text-[14.5px] font-semibold">{item.titulo}</p>
              <p className="text-[13.5px] leading-relaxed text-muted">{item.texto}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button onClick={cerrar}>Entendido</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
