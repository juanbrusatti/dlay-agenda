import type { Rubro } from "@/lib/rubros";

/**
 * «Para recuperar»: clients who came before and have not been back.
 *
 * No `server-only`: the list on screen builds the WhatsApp message.
 */

/** How long without coming counts as «no volvió», in days. */
export const PLAZOS = [30, 45, 60, 90] as const;
export const PLAZO_INICIAL = 45;

export function plazoDe(valor: string | undefined): number {
  const n = Number(valor);
  return (PLAZOS as readonly number[]).includes(n) ? n : PLAZO_INICIAL;
}

/**
 * The first message to send, ready to edit in WhatsApp before sending. Warm
 * and short, an invitation and not an ad. A psychology practice gets one that
 * names neither the practice nor the therapy, like its reminders.
 */
export function mensajeRecuperar(rubro: Rubro, nombre: string, negocio: string): string {
  if (rubro === "psicologia") {
    return (
      `Hola ${nombre}, ¿cómo estás? Te escribo para saber cómo seguís. ` +
      "Si en algún momento querés retomar, tengo horarios disponibles. Un saludo."
    );
  }
  return (
    `Hola ${nombre}! ¿Cómo estás? Te escribimos de ${negocio}. ` +
    "Hace un tiempito que no te vemos y queríamos saber si te gustaría que te " +
    "guardemos un turno. ¡Avisanos y lo coordinamos!"
  );
}
