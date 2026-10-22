"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { marcarGuiaVista } from "@/lib/actions/guia";
import { RECORRIDO, type PasoRecorrido } from "@/lib/guia";

/** Lo pone «Ver el recorrido de nuevo» antes de mandar al inicio. */
export const PEDIDO_RECORRIDO = "dlay:recorrido";

const MARGEN = 6;
const ANCHO_TARJETA = 340;

type Caja = { top: number; left: number; width: number; height: number };

function anclaDe(paso: PasoRecorrido): HTMLElement | null {
  return paso.ancla
    ? document.querySelector<HTMLElement>(`[data-guia="${paso.ancla}"]`)
    : null;
}

/**
 * El recorrido de bienvenida.
 *
 * Ilumina cada parte del sistema de a una y la explica, con «Siguiente»,
 * «Atrás» y «Saltear». Se abre solo la primera vez que alguien entra y
 * después se puede repetir desde Ayuda.
 *
 * Los pasos cuyo elemento no está en pantalla se saltean: recepción no ve
 * Informes y un profesional no ve la Caja, así que a cada rol le toca su
 * recorrido sin armar uno por rol.
 */
export function Recorrido({ abrirSolo }: { abrirSolo: boolean }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [pasos, setPasos] = useState<PasoRecorrido[]>([]);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [montado, setMontado] = useState(false);

  const empezar = useCallback(() => {
    setPasos(RECORRIDO.filter((p) => !p.ancla || anclaDe(p)));
    setI(0);
    setAbierto(true);
  }, []);

  // Primera vez, o pedido desde Ayuda: se abre recién en el inicio, que es
  // donde están todas las anclas (incluida la tarjeta de primeros pasos).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
    if (pathname !== "/") return;
    let pedido = false;
    try {
      pedido = sessionStorage.getItem(PEDIDO_RECORRIDO) === "1";
      sessionStorage.removeItem(PEDIDO_RECORRIDO);
    } catch {}
    if (pedido || abrirSolo) {
      // Un respiro para que la pantalla termine de dibujarse.
      const t = setTimeout(empezar, 400);
      return () => clearTimeout(t);
    }
  }, [pathname, abrirSolo, empezar]);

  const paso = pasos[i];

  // Dónde está lo que hay que iluminar. Se recalcula al cambiar de paso, al
  // girar el teléfono y al desplazarse.
  useLayoutEffect(() => {
    if (!abierto || !paso) return;
    const el = anclaDe(paso);
    if (!el) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaja(null);
      return;
    }
    el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    const medir = () => {
      const r = el.getBoundingClientRect();
      setCaja({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    medir();
    const t = setTimeout(medir, 350);
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [abierto, paso]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    void marcarGuiaVista();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, pasos.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, [abierto, cerrar, pasos.length]);

  if (!montado || !abierto || !paso) return null;

  const ultimo = i === pasos.length - 1;

  // La tarjeta va debajo de lo iluminado si entra; si no, arriba; y sin
  // nada iluminado, al centro.
  const anchoPantalla = window.innerWidth;
  const altoPantalla = window.innerHeight;
  const ancho = Math.min(ANCHO_TARJETA, anchoPantalla - 32);
  let estilo: React.CSSProperties;
  if (!caja) {
    estilo = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: ancho };
  } else {
    const left = Math.min(
      Math.max(caja.left + caja.width / 2 - ancho / 2, 16),
      anchoPantalla - ancho - 16,
    );
    const abajo = caja.top + caja.height + MARGEN + 14;
    const arriba = caja.top - MARGEN - 14;
    const ALTO = 240;
    estilo =
      abajo + ALTO < altoPantalla
        ? { top: abajo, left, width: ancho }
        : arriba > ALTO
          ? { bottom: altoPantalla - arriba, left, width: ancho }
          : // Lo iluminado ocupa casi toda la pantalla: la tarjeta va abajo,
            // encima, para que nunca quede afuera.
            { bottom: 16, left: (anchoPantalla - ancho) / 2, width: ancho };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="recorrido-titulo">
      {/* El oscurecido. Con algo iluminado, la sombra enorme hace de máscara. */}
      {caja ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[14px] border-2 border-accent transition-all duration-300"
          style={{
            top: caja.top - MARGEN,
            left: caja.left - MARGEN,
            width: caja.width + MARGEN * 2,
            height: caja.height + MARGEN * 2,
            boxShadow: "0 0 0 9999px rgb(10 10 25 / 0.55)",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0" style={{ background: "rgb(10 10 25 / 0.55)" }} />
      )}

      <div
        className="fixed grid gap-3 rounded-card border-[1.5px] border-line bg-surface p-5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.45)]"
        style={estilo}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-faint">
            {i + 1} de {pasos.length}
          </p>
          <button
            type="button"
            onClick={cerrar}
            className="text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Saltear
          </button>
        </div>
        <p id="recorrido-titulo" className="text-[18px] font-bold leading-tight tracking-[-0.02em]">
          {paso.titulo}
        </p>
        <p className="text-[14px] leading-relaxed text-muted">{paso.texto}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={i === 0}
            onClick={() => setI((n) => n - 1)}
          >
            Atrás
          </Button>
          <div className="flex gap-1" aria-hidden>
            {pasos.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${n === i ? "w-4 bg-accent" : "w-1.5 bg-line"}`}
              />
            ))}
          </div>
          <Button size="sm" onClick={() => (ultimo ? cerrar() : setI((n) => n + 1))}>
            {ultimo ? "¡Listo!" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
