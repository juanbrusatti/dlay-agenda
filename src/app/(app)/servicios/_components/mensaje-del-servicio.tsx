"use client";

import { useRef, useState } from "react";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  CUANDO,
  DATOS,
  PLANTILLA_DE_FABRICA,
  vistaPrevia,
  type AvisosDelServicio,
  type Cuando,
} from "@/lib/avisos";

/**
 * El recordatorio de este servicio: cuándo sale y qué dice.
 *
 * Vive acá y no en Avisos a propósito: quien carga un servicio ya está
 * pensando en ese servicio —cuánto dura, cuánto sale, qué hay que saber antes
 * de venir—. Mandarla a otra pantalla a decidir cuándo avisar y qué decir
 * rompe ese hilo.
 *
 * El saludo y el cierre son de la regla, iguales para todos los servicios, y
 * se ven en gris en la vista previa. Lo que se escribe acá va en el medio.
 */

const EJEMPLO_CUANDO: Record<Cuando, string> = {
  dia: "jueves 23 de octubre a las 15:00",
  semana: "jueves 30 de octubre a las 15:00",
};

export function MensajeDelServicio({
  defaultValue,
  nombre,
  avisos,
}: {
  defaultValue: string;
  nombre: string;
  avisos: AvisosDelServicio;
}) {
  const [texto, setTexto] = useState(defaultValue);
  const [marcados, setMarcados] = useState(avisos.marcados);
  const area = useRef<HTMLTextAreaElement>(null);

  // El dato va donde está el cursor, no al final: así se puede escribir
  // «Hola [Nombre], te esperamos» sin tener que mover nada después.
  function insertar(token: string) {
    const el = area.current;
    const desde = el?.selectionStart ?? texto.length;
    const hasta = el?.selectionEnd ?? texto.length;
    const antes = texto.slice(0, desde);
    const pegado = antes && !/\s$/.test(antes) ? ` ${token}` : token;
    setTexto(antes + pegado + texto.slice(hasta));
    requestAnimationFrame(() => {
      el?.focus();
      const pos = desde + pegado.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  const elegidos = (Object.keys(CUANDO) as Cuando[]).filter((c) => marcados[c]);

  return (
    <Card>
      <CardBody className="grid gap-5">
        <CardTitle>Recordatorio por WhatsApp</CardTitle>

        {avisos.editable && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[13.5px] font-medium text-ink">
              ¿Cuándo le avisamos?
            </legend>
            {/* La marca le dice a la acción que esta parte se mostró. */}
            <input type="hidden" name="avisos" value="1" />
            <div className="grid gap-2 sm:grid-cols-2">
              {(["semana", "dia"] as Cuando[]).map((c) => (
                <label
                  key={c}
                  className={`flex cursor-pointer items-center gap-3 rounded-[16px] border-[1.5px] px-3.5 py-3 ${
                    marcados[c] ? "border-accent bg-accent-wash" : "border-line bg-surface"
                  }`}
                >
                  <input
                    type="checkbox"
                    name={`aviso_${c}`}
                    checked={marcados[c]}
                    onChange={(e) => setMarcados((m) => ({ ...m, [c]: e.target.checked }))}
                    className="h-5 w-5 accent-[var(--color-accent)]"
                  />
                  <span className="text-[14.5px] font-medium">{CUANDO[c].titulo}</span>
                </label>
              ))}
            </div>
            <p className="text-[12.5px] leading-snug text-muted">
              {elegidos.length === 0
                ? "Sin ninguno marcado, quien venga a este servicio no recibe recordatorio."
                : elegidos.length === 2
                  ? "Le llegan dos mensajes: uno a la semana y otro el día anterior."
                  : "Le llega un solo mensaje."}
            </p>
          </fieldset>
        )}

        <div className="grid gap-2">
          <Textarea
            ref={area}
            label="Qué le querés decir"
            name="preparationNote"
            maxLength={600}
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="No te depiles con cera ni pinza 15 días antes, y vení sin cremas."
            hint="Indicaciones, qué traer, tu política de ausencias. Si lo dejás vacío, el recordatorio sale igual, sin esta parte."
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12.5px] text-muted">Agregar:</span>
            {DATOS.map((d) => (
              <button
                key={d.token}
                type="button"
                onClick={() => insertar(d.token)}
                className="rounded-pill border-[1.5px] border-line bg-surface px-2.5 py-1 text-[12.5px] font-medium text-accent-text hover:border-accent"
              >
                + {d.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {(avisos.editable ? elegidos : (["dia"] as Cuando[])).map((c) => (
          <div key={c} className="grid gap-1.5">
            <span className="text-[12.5px] font-medium text-muted">
              Así le llega {c === "dia" ? "el día anterior" : "una semana antes"}:
            </span>
            <Burbuja
              {...(() => {
                const plantilla = avisos.plantillas[c] ?? PLANTILLA_DE_FABRICA[c];
                const datos = {
                  negocio: avisos.negocio,
                  servicio: nombre || "este servicio",
                  cuando: EJEMPLO_CUANDO[c],
                };
                return {
                  texto: vistaPrevia(plantilla, texto, datos),
                  marco: vistaPrevia(plantilla, "", datos),
                };
              })()}
            />
          </div>
        ))}

        <p className="text-[12.5px] leading-snug text-muted">
          El saludo y el cierre son iguales para todos los servicios. Se cambian
          en Avisos → Opciones avanzadas.
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * El mensaje como se ve en WhatsApp. Lo que escribió la persona va en negro y
 * el resto en gris, para que se vea qué parte es suya: son los párrafos que no
 * están en el mismo mensaje armado sin su texto.
 */
function Burbuja({ texto, marco }: { texto: string; marco: string }) {
  const delMarco = new Set(marco.split("\n\n"));

  return (
    <div className="rounded-[14px] rounded-tl-[4px] bg-surface-2 px-3.5 py-2.5">
      {texto.split("\n\n").map((parrafo, i) => (
        <p
          key={i}
          className={`whitespace-pre-line text-[13.5px] leading-relaxed ${
            delMarco.has(parrafo) ? "text-muted" : "text-ink"
          } ${i > 0 ? "mt-2" : ""}`}
        >
          {parrafo}
        </p>
      ))}
    </div>
  );
}
