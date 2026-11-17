/**
 * What each kind of business does, so the examples it sees sound like its own
 * day and not like an estética's.
 *
 * Only examples and default texts change by rubro: placeholders, the sample
 * values in previews, the empty-state copy. The product, the screens and the
 * words for things (cliente, turno, servicio) are the same for everyone, so a
 * fix or a feature lands for every rubro at once.
 *
 * No `server-only`: client forms read it too.
 */

export const RUBROS = ["estetica", "psicologia", "general"] as const;

export type Rubro = (typeof RUBROS)[number];

/** Accounts created before rubros existed, and anything unknown, are estéticas. */
export function rubroDe(valor: string | null | undefined): Rubro {
  return (RUBROS as readonly string[]).includes(valor ?? "")
    ? (valor as Rubro)
    : "estetica";
}

export type Ejemplos = {
  /** How the choice reads in the sign-up form and in settings. */
  etiqueta: string;
  negocio: string;
  /** Hint under the business name field. */
  negocioPista: string;
  servicio: string;
  /** Mid-sentence list of services, for the empty state. */
  servicios: string;
  /** What to tell a client before coming, as the service message. */
  indicacion: string;
  /** Welcome text for the online booking page. */
  bienvenida: string;
  cobro: string;
  gasto: string;
  /** Hint for how many people a service takes at once. */
  capacidad: string;
};

export const EJEMPLOS: Record<Rubro, Ejemplos> = {
  estetica: {
    etiqueta: "Estética, uñas, pestañas o belleza",
    negocio: "Estética Luna",
    negocioPista: "Con tu nombre alcanza si trabajás por tu cuenta.",
    servicio: "Depilación definitiva",
    servicios: "una depilación, una limpieza de cutis, un masaje",
    indicacion: "No te depiles con cera ni pinza 15 días antes, y vení sin cremas.",
    bienvenida: "Depilación definitiva, tratamientos faciales y masajes.",
    cobro: "Masaje de Mirián",
    gasto: "Compra de algodón",
    capacidad:
      "Cuántas personas podés atender a la vez con este servicio. Si el aparato trabaja solo mientras atendés a otro cliente, poné 2 o 3. Un masaje es siempre 1.",
  },
  psicologia: {
    etiqueta: "Psicología",
    negocio: "Lic. Paula Ríos",
    negocioPista:
      "Tu nombre o el del consultorio. Es lo que ven tus pacientes al reservar.",
    servicio: "Sesión individual",
    servicios: "una sesión individual, una de pareja, una primera entrevista",
    indicacion: "Si la sesión es online, te paso el enlace de la videollamada un rato antes.",
    bienvenida: "Atención a adultos y adolescentes, presencial y online.",
    cobro: "Sesión de Mirián",
    gasto: "Alquiler del consultorio",
    capacidad:
      "Cuántas personas podés atender a la vez con este servicio. Una sesión es siempre 1; un taller o un grupo, los que entren.",
  },
  general: {
    etiqueta: "Otro rubro que trabaja con turnos",
    negocio: "Estudio Norte",
    negocioPista: "Con tu nombre alcanza si trabajás por tu cuenta.",
    servicio: "Consulta",
    servicios: "una consulta, un control, una sesión",
    indicacion: "Traé los estudios que tengas, y si llegás tarde avisanos.",
    bienvenida: "Contanos en un par de líneas qué hacés y para quién.",
    cobro: "Consulta de Mirián",
    gasto: "Compra de insumos",
    capacidad:
      "Cuántas personas podés atender a la vez con este servicio. Si es de a una, dejalo en 1.",
  },
};
