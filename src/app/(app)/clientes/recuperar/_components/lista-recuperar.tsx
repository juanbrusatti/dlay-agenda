"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { linkAgendar } from "@/lib/agendar";
import { whatsappLink } from "@/lib/phone";

export type FilaRecuperar = {
  id: string;
  nombre: string;
  ultimaVisita: string;
  ultimoServicio: string | null;
  visitas: number;
  telefono: string | null;
  mensaje: string;
};

/** Per device only: a reminder of who was already written to, nothing more. */
const CLAVE = "dlay-recuperar-escritos";

const AVISO = "dlay-recuperar";

function leerCrudo(): string {
  try {
    return localStorage.getItem(CLAVE) ?? "{}";
  } catch {
    return "{}";
  }
}

function aObjeto(crudo: string): Record<string, string> {
  try {
    return JSON.parse(crudo) ?? {};
  } catch {
    return {};
  }
}

function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(AVISO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(AVISO, avisar);
  };
}

/**
 * The list itself. «Escribirle» opens WhatsApp with the message ready to edit
 * and send; nothing is sent from Dlay. This device then remembers it was done,
 * so the next person on the list is easy to spot.
 */
export function ListaRecuperar({ filas, hoy }: { filas: FilaRecuperar[]; hoy: string }) {
  // Read after mounting (the server has no storage), and again when it changes.
  const crudo = useSyncExternalStore(suscribir, leerCrudo, () => "{}");
  const escritos = useMemo(() => aObjeto(crudo), [crudo]);

  const marcar = (id: string) => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ ...aObjeto(leerCrudo()), [id]: hoy }));
      window.dispatchEvent(new Event(AVISO));
    } catch {
      // Private window or blocked storage: the mark just does not stick.
    }
  };

  const fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
  const fechaLarga = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <ul className="grid gap-2">
      {filas.map((f) => {
        const wa = whatsappLink(f.telefono, f.mensaje);
        const escrito = escritos[f.id];

        return (
          <li
            key={f.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border-[1.5px] border-line bg-surface px-4 py-3"
          >
            <div className="min-w-0 flex-1 basis-full sm:basis-56">
              <Link
                href={`/clientes/${f.id}`}
                className="block truncate text-[15px] font-semibold hover:underline"
              >
                {f.nombre}
              </Link>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">
                Vino por última vez el{" "}
                {fechaLarga.format(new Date(`${f.ultimaVisita}T12:00:00`))}
                {f.ultimoServicio ? ` · ${f.ultimoServicio}` : ""}
                {f.visitas > 1 ? ` · ${f.visitas} visitas` : ""}
              </p>
              {escrito && (
                <p className="mt-1 text-[12px] font-medium text-ok">
                  Le escribiste el {fecha.format(new Date(`${escrito}T12:00:00`))}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => marcar(f.id)}
                  className="inline-flex h-9 items-center rounded-pill bg-accent px-3.5 text-[13px] font-medium text-on-accent hover:opacity-90"
                >
                  Escribirle
                </a>
              ) : (
                <span className="inline-flex h-9 items-center text-[12.5px] text-faint">
                  Sin WhatsApp
                </span>
              )}
              <Link
                href={linkAgendar({ dia: hoy, cliente: f.id })}
                className="inline-flex h-9 items-center rounded-pill border-[1.5px] border-line px-3.5 text-[13px] font-medium text-ink hover:border-accent"
              >
                Agendar
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
