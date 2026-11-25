/**
 * The «what's new» notice shown once after an update.
 *
 * To announce something new, change `clave` (any new string) and the texts.
 * People who closed the previous one see this one once; accounts created
 * after `desde` never see it, since everything is new to them anyway.
 */
export const NOVEDADES: {
  clave: string;
  desde: string;
  titulo: string;
  items: ReadonlyArray<{ titulo: string; texto: string }>;
  /** A button next to «Entendido» that takes you to try it. */
  accion?: { texto: string; href: string };
  /** Only for owners and admins, when it is about something only they can change. */
  soloAdmin?: boolean;
} = {
  clave: "2026-11-logo",
  desde: "2026-11-26T12:00:00Z",
  titulo: "Ahora podés poner tu logo",
  items: [
    {
      titulo: "Tu logo, donde lo ven tus clientes",
      texto:
        "Aparece chiquito arriba de la página donde tus clientes confirman o cancelan el turno, y en tu página de reservas. Así reconocen enseguida que el mensaje es tuyo.",
    },
    {
      titulo: "Cómo ponerlo",
      texto:
        "Entrá a Ajustes → Tu negocio → Logo o foto y tocá «Subir imagen». Sirve una foto del celular: la achicamos sola. Se ve mejor si es cuadrada.",
    },
  ],
  accion: { texto: "Subir mi logo", href: "/configuracion/negocio" },
  soloAdmin: true,
};
