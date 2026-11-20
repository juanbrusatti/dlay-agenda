"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { cambiarTema } from "@/lib/actions/plataforma";
import type { TemaCuenta } from "@/lib/data/cuenta";

/**
 * «Modo fiestas», account by account: a little snow, Santa now and then and
 * the accent in Christmas green. Turning it on for one account changes
 * nothing for the others, so it can be tried on DLAY first.
 */
export function Temas({ cuentas }: { cuentas: TemaCuenta[] }) {
  const [pendiente, empezar] = useTransition();
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cambiar = (id: string, tema: "fiestas" | null) => {
    setEnCurso(id);
    empezar(async () => {
      const r = await cambiarTema(id, tema);
      setError(r.error);
      setEnCurso(null);
    });
  };

  const activas = cuentas.filter((c) => c.tema === "fiestas").length;

  return (
    <Card>
      <CardBody className="grid gap-3">
        <div className="grid gap-1">
          <CardTitle>Modo fiestas</CardTitle>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Verde navideño, un poco de nieve y Papá Noel que se asoma o pasa
            con el trineo cada tanto. Se prende por cuenta: las demás no ven
            nada. {activas > 0 && `Activo en ${activas} ${activas === 1 ? "cuenta" : "cuentas"}.`}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-[14px] bg-danger-wash px-3.5 py-2.5 text-[13.5px] text-danger">
            {error}
          </p>
        )}

        <ul className="grid gap-1.5">
          {cuentas.map((c) => {
            const activo = c.tema === "fiestas";
            return (
              <li
                key={c.tenant_id}
                className="flex items-center justify-between gap-3 border-t-[1.5px] border-line pt-1.5 text-[14px]"
              >
                <span className="min-w-0 truncate">
                  {c.nombre}
                  {activo && (
                    <span className="ml-2 rounded-pill bg-ok-wash px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ok">
                      Activo
                    </span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant={activo ? "ghost" : "outline"}
                  disabled={pendiente && enCurso === c.tenant_id}
                  onClick={() => cambiar(c.tenant_id, activo ? null : "fiestas")}
                >
                  {pendiente && enCurso === c.tenant_id
                    ? "Guardando…"
                    : activo
                      ? "Desactivar"
                      : "Activar"}
                </Button>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
