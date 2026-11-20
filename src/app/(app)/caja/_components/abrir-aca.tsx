"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { abrirCaja } from "@/lib/actions/caja";

/**
 * Open the register without leaving the screen that needs it.
 *
 * Charging cash with the register closed used to send people to «Caja» and
 * back, losing what they were doing. This is the same opening as there, with
 * the same question (how much cash is already in the drawer), right where the
 * charge is. Once it opens the screen refreshes and the charge goes ahead.
 */
export function AbrirCajaAca() {
  const router = useRouter();
  const [inicial, setInicial] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const abrir = () =>
    startTransition(async () => {
      const datos = new FormData();
      datos.set("opening", inicial);
      const res = await abrirCaja({ error: null }, datos);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      router.refresh();
    });

  return (
    <div className="grid gap-2.5 rounded-[14px] bg-warn-wash px-3.5 py-3 text-[13px] leading-snug text-ink">
      <p>
        La caja está cerrada, así que el efectivo todavía no se puede
        registrar. Abrila acá mismo:
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">
          <span className="text-[12.5px] font-medium">Con cuánto arrancás</span>
          <input
            inputMode="numeric"
            value={inicial}
            onChange={(e) => setInicial(e.target.value)}
            // It sits inside the charge form: Enter opens the register here
            // instead of submitting the charge around it.
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                abrir();
              }
            }}
            className="h-10 w-32 rounded-[12px] border-[1.5px] border-line bg-surface px-3 text-[14.5px]"
          />
        </label>
        <Button type="button" size="sm" disabled={pendiente} onClick={abrir}>
          {pendiente ? "Abriendo…" : "Abrir la caja"}
        </Button>
      </div>

      <p className="text-[12px] text-muted">
        El efectivo que ya hay en el cajón. Si arrancás sin nada, dejá 0.
      </p>

      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
