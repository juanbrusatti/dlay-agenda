"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { PEDIDO_RECORRIDO } from "@/app/_components/guia/recorrido";
import { MANUAL } from "@/lib/guia";

/** Para buscar sin que importen las tildes ni las mayúsculas. */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function Guia() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");

  const resultado = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return MANUAL;
    return MANUAL.map((s) => ({
      ...s,
      temas: s.temas.filter((t) => {
        const todo = normalizar([s.titulo, t.titulo, ...t.texto].join(" "));
        return palabras.every((p) => todo.includes(p));
      }),
    })).filter((s) => s.temas.length > 0);
  }, [busqueda]);

  function verRecorrido() {
    try {
      sessionStorage.setItem(PEDIDO_RECORRIDO, "1");
    } catch {}
    router.push("/");
  }

  const buscando = busqueda.trim().length > 0;

  return (
    <div className="grid gap-5">
      <Card accent>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>¿Primera vez?</CardTitle>
            <p className="mt-1 text-[13.5px] opacity-90">
              El recorrido te muestra cada parte del sistema en un par de minutos.
            </p>
          </div>
          <Button variant="outline" onClick={verRecorrido}>
            Ver el recorrido de nuevo
          </Button>
        </CardBody>
      </Card>

      <div className="grid gap-1.5">
        <label htmlFor="buscar-ayuda" className="text-[13.5px] font-medium">
          Buscar en la guía
        </label>
        <input
          id="buscar-ayuda"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Por ejemplo: cancelar, WhatsApp, caja, importar"
          className="h-11 w-full rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15px] placeholder:text-faint"
        />
      </div>

      {!buscando && (
        <nav aria-label="Índice" className="grid gap-1.5 sm:grid-cols-2">
          {MANUAL.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-[16px] border-[1.5px] border-line bg-surface px-3.5 py-2.5 hover:border-accent"
            >
              <span className="block text-[14.5px] font-semibold">{s.titulo}</span>
              <span className="block text-[12.5px] leading-snug text-muted">{s.resumen}</span>
            </a>
          ))}
        </nav>
      )}

      {buscando && resultado.length === 0 && (
        <p className="text-[14px] text-muted">
          No encontramos nada con «{busqueda}». Probá con otra palabra.
        </p>
      )}

      {resultado.map((s) => (
        <section key={s.id} id={s.id} className="grid scroll-mt-24 gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2 px-1">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">{s.titulo}</h2>
            {s.enlace && (
              <Link href={s.enlace.href} className="text-[13px] text-accent-text hover:underline">
                {s.enlace.texto} →
              </Link>
            )}
          </div>
          <Card>
            <CardBody className="grid gap-0 divide-y-[1.5px] divide-line p-0 sm:p-0">
              {s.temas.map((t) => (
                <details key={t.titulo} open={buscando} className="group px-5 py-3.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-medium">
                    {t.titulo}
                    <span aria-hidden className="text-muted transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {t.texto.map((p) => (
                      <p key={p} className="text-[14px] leading-relaxed text-muted">
                        {p}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </CardBody>
          </Card>
        </section>
      ))}
    </div>
  );
}
