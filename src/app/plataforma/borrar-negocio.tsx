"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { borrarNegocio, type PlataformaState } from "@/lib/actions/plataforma";

/**
 * Dar de baja un negocio, al pie de su tarjeta en el panel.
 *
 * Escondido detrás de un enlace y con el nombre escrito a mano como
 * confirmación, que también lo vuelve a pedir la base: borrar el negocio
 * equivocado se lleva puestos los clientes y la agenda de alguien que paga.
 */
export function BorrarNegocio({ tenantId, nombre }: { tenantId: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [estado, setEstado] = useState<PlataformaState | null>(null);
  const [pendiente, empezar] = useTransition();

  const coincide = escrito.trim().toLowerCase() === nombre.trim().toLowerCase();

  if (estado?.notice) {
    return (
      <p className="rounded-[14px] bg-ok-wash px-3.5 py-2.5 text-[13.5px] text-ok">
        {estado.notice}
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="justify-self-start text-[12.5px] text-faint underline-offset-2 hover:text-danger hover:underline"
      >
        Dar de baja este negocio
      </button>
    );
  }

  return (
    <div className="grid gap-3 rounded-[16px] border-[1.5px] border-danger bg-danger-wash p-4">
      <p className="text-[13.5px] leading-relaxed text-ink">
        Se borra <strong>{nombre}</strong> con todo lo suyo: clientes, turnos,
        caja, servicios, avisos y su WhatsApp vinculado. También la cuenta de
        acceso de su titular, si no tiene otro negocio.{" "}
        <strong>No se puede deshacer</strong>; sólo queda el respaldo de la
        noche.
      </p>
      <label className="grid gap-1.5 text-[13px] text-muted">
        Para confirmar, escribí el nombre del negocio
        <input
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          placeholder={nombre}
          autoComplete="off"
          className="h-11 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15px] text-ink"
        />
      </label>
      {estado?.error && (
        <p role="alert" className="text-[13px] text-danger">
          {estado.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!coincide || pendiente}
          className="bg-danger text-paper"
          onClick={() =>
            empezar(async () => setEstado(await borrarNegocio(tenantId, escrito)))
          }
        >
          {pendiente ? "Borrando…" : "Borrar para siempre"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pendiente}
          onClick={() => {
            setAbierto(false);
            setEscrito("");
            setEstado(null);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
