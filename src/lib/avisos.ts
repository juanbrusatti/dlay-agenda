/**
 * Los avisos vistos desde los servicios.
 *
 * El motor de recordatorios piensa en reglas: «24 horas antes, a los turnos de
 * estos servicios». Quien atiende un negocio piensa al revés: «la depilación
 * avisa un día antes y una semana antes; el masaje, sólo el día anterior».
 *
 * Esto traduce una cosa a la otra sin tocar el motor. Hay dos reglas fijas —la
 * de la semana y la del día anterior— y prender un aviso para un servicio es
 * agregarlo a la lista de servicios de esa regla. La lista de la regla es la
 * única fuente de verdad: lo que se ve en Servicios y lo que se ve en Avisos
 * sale del mismo lugar y no se pueden contradecir.
 *
 * Una regla con la lista vacía significa «todos los servicios», incluidos los
 * que se carguen mañana. Por eso se usa así cuando todos están prendidos, y
 * cuando no queda ninguno la regla se apaga en vez de quedar vacía.
 *
 * Sin `server-only`: lo usan también componentes de cliente.
 */

export type Cuando = "semana" | "dia";

export const CUANDO: Record<Cuando, { offset: number; titulo: string; corto: string }> = {
  semana: { offset: -10080, titulo: "Una semana antes", corto: "Semana antes" },
  dia: { offset: -1440, titulo: "Un día antes", corto: "Día antes" },
};

/** Lo que el formulario de un servicio necesita saber de sus avisos. */
export type AvisosDelServicio = {
  /** Si se puede cambiar cuándo sale. Recepción ve el mensaje, no esto. */
  editable: boolean;
  marcados: Record<Cuando, boolean>;
  plantillas: Record<Cuando, string | null>;
  negocio: string;
};

export type ReglaAviso = {
  id: string;
  enabled: boolean;
  service_ids: string[];
};

/** ¿Este servicio recibe este aviso? */
export function incluye(regla: ReglaAviso | null, serviceId: string): boolean {
  if (!regla || !regla.enabled) return false;
  return regla.service_ids.length === 0 || regla.service_ids.includes(serviceId);
}

/**
 * Cómo tiene que quedar la regla después de prender o apagar el aviso para
 * algunos servicios.
 *
 * `activos` son los servicios activos del negocio: hacen falta para saber si
 * «todos» sigue siendo todos y para expandir la lista vacía cuando se apaga
 * uno solo.
 */
export function nuevoAlcance(
  regla: Pick<ReglaAviso, "enabled" | "service_ids">,
  activos: string[],
  serviceIds: string[],
  prender: boolean,
): { enabled: boolean; service_ids: string[] } {
  const actuales = !regla.enabled
    ? []
    : regla.service_ids.length === 0
      ? activos
      : regla.service_ids;

  const conjunto = new Set(actuales);
  for (const id of serviceIds) {
    if (prender) conjunto.add(id);
    else conjunto.delete(id);
  }

  if (conjunto.size === 0) return { enabled: false, service_ids: [] };
  if (activos.length > 0 && activos.every((id) => conjunto.has(id))) {
    return { enabled: true, service_ids: [] };
  }
  return { enabled: true, service_ids: [...conjunto] };
}

// ---------------------------------------------------------------------------
// Vista previa
// ---------------------------------------------------------------------------
// Repite lo que hace el emisor (`supabase/functions/_shared/render.ts` y el
// agregado del enlace en `channels.ts`) para mostrar el mensaje tal como va a
// llegar. No se importa de allá porque esos archivos corren en Deno.

/** Los botones para insertar datos, en palabras y no en código. */
export const DATOS: Array<{ token: string; etiqueta: string }> = [
  { token: "{{cliente}}", etiqueta: "Nombre" },
  { token: "{{cuando}}", etiqueta: "Día y hora" },
  { token: "{{servicio}}", etiqueta: "Servicio" },
  { token: "{{estetica}}", etiqueta: "Tu negocio" },
];

const HUECO = /\{\{\s*(\w+)\s*\}\}/g;

function completar(texto: string, valores: Record<string, string>): string {
  return texto
    .replace(HUECO, (_, key: string) => valores[key] ?? "")
    .replace(/ {2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Por si la regla perdió su mensaje: el de fábrica. */
export const PLANTILLA_DE_FABRICA: Record<Cuando, string> = {
  dia:
    "Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte tu turno de mañana {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\nPara confirmar el turno o avisarnos que no vas a venir: {{link}}\n\n¡Te esperamos!",
  semana:
    "Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte que tenés turno el {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\nSi ya sabés que no vas a poder, avisanos desde acá así le damos el lugar a otra persona: {{link}}\n\n¡Gracias!",
};

export function vistaPrevia(
  plantilla: string,
  mensajeDelServicio: string,
  datos: { negocio: string; servicio: string; cuando: string },
): string {
  const base: Record<string, string> = {
    cliente: "Mirián",
    estetica: datos.negocio,
    servicio: datos.servicio,
    cuando: datos.cuando,
    link: "dlay-agenda.vercel.app/t/x7Kp2",
  };
  const mensaje = completar(mensajeDelServicio, base);
  const texto = completar(plantilla, { ...base, mensaje, preparacion: mensaje });
  // Igual que el emisor: si el mensaje no trae el enlace, se agrega al final.
  return /\{\{\s*link\s*\}\}/.test(plantilla)
    ? texto
    : `${texto}\n\nPara confirmar, cancelar o cambiar el turno: ${base.link}`;
}
