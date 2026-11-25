import type { Rubro } from "@/lib/rubros";

/**
 * The made-up business the home page demos run on, one per rubro.
 *
 * Both demos follow the same day: four appointments on Thursday 12, and Sofía
 * Ramírez at 15:00 is the one who books, gets the reminder and answers it.
 * Only names, services and texts change by rubro; times, prices on screen
 * and the story stay the same, so the demos' logic does not depend on this.
 */

export type TurnoDeEjemplo = {
  id: string;
  hora: string;
  fin: string;
  nombre: string;
  servicio: string;
  precio: string;
  alerta?: boolean;
};

export type EjemploPortada = {
  negocio: string;
  /** Path of its online booking page. */
  slug: string;
  /** Avatar letter in the WhatsApp chat. */
  inicial: string;
  /** Sofía is the one with id "sofia", from 15:00 to 16:00. */
  turnos: TurnoDeEjemplo[];
  /** The two services offered in the booking scene; Sofía picks the first. */
  reservables: [string, string];
  /**
   * The factory reminder Sofía gets, with «{cuando}» where the day goes.
   * Plain text and not a function: it travels from the server to the demos.
   */
  recordatorio: string;
  /** The service's own message, appended to the reminder. */
  indicacion: string;
  /** Rest of the factory reminder: the line before the link, and the sign-off. */
  enlace: string;
  despedida: string;
  ficha: {
    alerta: string;
    etiquetas: string[];
    seguimiento: string;
    ultimaVez: string;
    gastoCents: number;
    relato: string;
  };
  cobroCents: number;
  /** Who the visitor plays in the hands-on demo. */
  quienSos: string;
};

const ESTETICA: EjemploPortada = {
  negocio: "Estudio Malva",
  slug: "estudio-malva",
  inicial: "M",
  turnos: [
    { id: "mica", hora: "10:00", fin: "11:00", nombre: "Mica Sosa", servicio: "Uñas semipermanentes", precio: "$ 14.000" },
    { id: "carla", hora: "14:00", fin: "14:30", nombre: "Carla Benítez", servicio: "Perfilado de cejas", precio: "$ 9.000" },
    { id: "sofia", hora: "15:00", fin: "16:00", nombre: "Sofía Ramírez", servicio: "Limpieza facial", precio: "$ 25.000", alerta: true },
    { id: "lu", hora: "16:00", fin: "17:00", nombre: "Lu Ferreyra", servicio: "Masaje descontracturante", precio: "$ 18.000" },
  ],
  reservables: ["Limpieza facial · 60 min", "Perfilado de cejas · 30 min"],
  recordatorio:
    "Hola Sofía! Te escribimos de Estudio Malva para recordarte tu turno de mañana {cuando}, para limpieza facial.",
  indicacion: "Vení con la cara lavada y sin maquillaje.",
  enlace: "Para confirmar el turno o avisarnos que no vas a venir:",
  despedida: "¡Te esperamos!",
  ficha: {
    alerta: "Alérgica al ácido glicólico.",
    etiquetas: ["Facial", "Frecuente"],
    seguimiento: "La piel reaccionó bien. Próxima: probar peeling suave.",
    ultimaVez: "3 sem.",
    gastoCents: 31200000,
    relato:
      "Antes de que llegue, abrís su ficha: alergias, cuántas veces vino, cuánto gastó y lo que anotaste la última vez.",
  },
  cobroCents: 2500000,
  quienSos: "Sos el cliente",
};

// Discreet on purpose: the reminder names neither the service nor the
// practice, like the factory texts a psychology account gets.
const PSICOLOGIA: EjemploPortada = {
  negocio: "Lic. Paula Ríos",
  slug: "paula-rios",
  inicial: "P",
  turnos: [
    { id: "mica", hora: "10:00", fin: "10:50", nombre: "Mica Sosa", servicio: "Sesión individual", precio: "$ 28.000" },
    { id: "carla", hora: "14:00", fin: "14:50", nombre: "Carla Benítez", servicio: "Sesión individual", precio: "$ 28.000" },
    { id: "sofia", hora: "15:00", fin: "16:00", nombre: "Sofía Ramírez", servicio: "Primera entrevista", precio: "$ 30.000", alerta: true },
    { id: "lu", hora: "16:00", fin: "17:00", nombre: "Lu Ferreyra", servicio: "Sesión de pareja", precio: "$ 40.000" },
  ],
  reservables: ["Primera entrevista · 60 min", "Sesión individual · 50 min"],
  recordatorio: "Hola Sofía! Te recuerdo nuestro encuentro de mañana {cuando}.",
  indicacion: "Si preferís que sea online, avisame y te paso el enlace.",
  enlace: "Para confirmar o avisarme que no vas a poder venir:",
  despedida: "¡Gracias!",
  ficha: {
    alerta: "Prefiere mensajes, no llamadas.",
    etiquetas: ["Adultos", "Semanal"],
    seguimiento: "Consulta por ansiedad en el trabajo. Proponer encuadre semanal.",
    ultimaVez: "1 sem.",
    gastoCents: 39200000,
    relato:
      "Antes de que llegue, abrís su ficha: lo que tenés que tener presente, cuántas veces vino y lo que anotaste la última vez.",
  },
  cobroCents: 3000000,
  quienSos: "Sos el paciente",
};

// Any other business with appointments, told as a physiotherapy practice:
// the most common kind of consultorio after psychology. Its reminder is the
// factory one every non-psychology account gets.
const GENERAL: EjemploPortada = {
  negocio: "Kine Norte",
  slug: "kine-norte",
  inicial: "K",
  turnos: [
    { id: "mica", hora: "10:00", fin: "10:45", nombre: "Mica Sosa", servicio: "Sesión de kinesiología", precio: "$ 16.000" },
    { id: "carla", hora: "14:00", fin: "14:45", nombre: "Carla Benítez", servicio: "Rehabilitación de rodilla", precio: "$ 16.000" },
    { id: "sofia", hora: "15:00", fin: "16:00", nombre: "Sofía Ramírez", servicio: "Evaluación inicial", precio: "$ 20.000", alerta: true },
    { id: "lu", hora: "16:00", fin: "17:00", nombre: "Lu Ferreyra", servicio: "Drenaje linfático", precio: "$ 18.000" },
  ],
  reservables: ["Evaluación inicial · 60 min", "Sesión de kinesiología · 45 min"],
  recordatorio:
    "Hola Sofía! Te escribimos de Kine Norte para recordarte tu turno de mañana {cuando}, para evaluación inicial.",
  indicacion: "Traé los estudios que tengas y vení con ropa cómoda.",
  enlace: "Para confirmar el turno o avisarnos que no vas a venir:",
  despedida: "¡Te esperamos!",
  ficha: {
    alerta: "Operada de rodilla en marzo.",
    etiquetas: ["Rodilla", "Semanal"],
    seguimiento: "Buena movilidad. Próxima: sumar ejercicios de fuerza.",
    ultimaVez: "1 sem.",
    gastoCents: 14400000,
    relato:
      "Antes de que llegue, abrís su ficha: lo que hay que tener en cuenta, cuántas veces vino y lo que anotaste la última vez.",
  },
  cobroCents: 2000000,
  quienSos: "Sos el paciente",
};

/** The reminder Sofía gets, for a given «jueves 12 a las 15:00». */
export function recordatorioDe(e: EjemploPortada, cuando: string): string {
  return e.recordatorio.replace("{cuando}", cuando);
}

export const EJEMPLOS_PORTADA: Record<Rubro, EjemploPortada> = {
  estetica: ESTETICA,
  psicologia: PSICOLOGIA,
  general: GENERAL,
};

/** How each example is offered in the home page's picker. */
export const NOMBRE_EJEMPLO: Record<Rubro, string> = {
  estetica: "Estética",
  psicologia: "Psicología",
  general: "Kinesiología y otros",
};
