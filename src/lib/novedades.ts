/**
 * The «what's new» notice shown once after an update.
 *
 * To announce something new, change `clave` (any new string) and the texts.
 * People who closed the previous one see this one once; accounts created
 * after `desde` never see it, since everything is new to them anyway.
 */
export const NOVEDADES = {
  clave: "2026-11-agendar-rapido",
  desde: "2026-11-19T12:00:00Z",
  titulo: "Dos novedades para agendar más rápido",
  items: [
    {
      titulo: "Cliente nuevo sin salir del turno",
      texto:
        "Al agendar, si la persona no está cargada, tocá «Nueva ficha»: al guardarla volvés directo al turno con ella ya elegida. Y si la habías buscado por nombre o teléfono, ya viene escrito.",
    },
    {
      titulo: "Lo de siempre, ya marcado",
      texto:
        "Al agendarle a alguien que ya vino, aparece marcado el servicio de su último turno. Si hoy es otra cosa, lo cambiás con un toque.",
    },
  ],
} as const;
