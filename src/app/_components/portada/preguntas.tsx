import { META_VISIBLE } from "@/lib/canal-whatsapp";

/**
 * The questions people ask before signing up, answered in two lines each.
 * Native <details>: opens and closes with no JavaScript.
 */
const PREGUNTAS: [string, string][] = [
  [
    "¿Mis clientes tienen que instalar algo?",
    "No. Les llega un WhatsApp común. Para confirmar, cancelar o cambiar el turno tocan un enlace que se abre en el navegador del teléfono.",
  ],
  META_VISIBLE
    ? [
        "¿Desde qué número salen los mensajes?",
        "Desde un número de WhatsApp que conectás a Dlay. Te conviene uno aparte para los mensajes automáticos y seguir usando el tuyo como siempre.",
      ]
    : [
        "¿Los mensajes salen desde mi número?",
        "Sí. Conectás tu WhatsApp escaneando un código, como WhatsApp Web, y los recordatorios salen desde tu número. Tu WhatsApp sigue funcionando igual en el teléfono.",
      ],
  [
    "¿Cuándo y cuántos mensajes se mandan?",
    "Vos elegís cuándo sale el recordatorio (por ejemplo, el día anterior) y en qué horario. Hay un tope por persona para que nadie reciba de más.",
  ],
  [
    "¿Se usa desde el celular?",
    "Sí. Funciona en el navegador del celular o de la computadora, y se puede instalar en la pantalla de inicio como una aplicación.",
  ],
  [
    "¿Tengo que cargar todo de nuevo?",
    "No hace falta. Si tenés tus clientes en un Excel o en otro sistema, se importan de una vez y revisás todo antes de guardar.",
  ],
  [
    "¿Y si después no lo quiero usar más?",
    "Sin permanencia: dejás de pagar y listo. Antes te llevás tus clientes y tus turnos en un archivo.",
  ],
];

export function Preguntas() {
  return (
    <div className="grid gap-2">
      {PREGUNTAS.map(([pregunta, respuesta]) => (
        <details
          key={pregunta}
          className="group rounded-card border-[1.5px] border-line bg-surface px-5 py-4 open:pb-5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            {pregunta}
            <span aria-hidden className="shrink-0 text-[18px] text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-muted">{respuesta}</p>
        </details>
      ))}
    </div>
  );
}
