/**
 * The «what's new» notice shown once after an update.
 *
 * To announce something new, change `clave` (any new string) and the texts.
 * People who closed the previous one see this one once; accounts created
 * after `desde` never see it, since everything is new to them anyway.
 */
export const NOVEDADES = {
  clave: "2026-11-menos-pasos",
  desde: "2026-11-20T15:00:00Z",
  titulo: "Novedades para ahorrarte pasos",
  items: [
    {
      titulo: "El próximo turno, en un toque",
      texto:
        "Cuando marcás «Vino y se atendió», te sugiere el próximo turno según cada cuánto viene esa persona. Lo tocás y queda listo para guardar.",
    },
    {
      titulo: "Agendar en un hueco libre",
      texto:
        "En la agenda aparecen los ratos libres del día. Tocá «Agendar acá» y el turno se abre con ese día y esa hora.",
    },
    {
      titulo: "Abrir la caja sin salir del cobro",
      texto:
        "Si vas a cobrar en efectivo con la caja cerrada, la abrís ahí mismo, sin perder lo que estabas haciendo.",
    },
    {
      titulo: "Turnos sin cerrar, a la vista",
      texto:
        "Si quedó algún día sin marcar quién vino, te avisa en Inicio. Tocás el día y lo cerrás todo junto.",
    },
    {
      titulo: "Clientes para recuperar",
      texto:
        "En Clientes, «Para recuperar» te muestra a quienes hace tiempo que no vienen. «Escribirle» abre WhatsApp con un mensaje listo.",
    },
  ],
} as const;
