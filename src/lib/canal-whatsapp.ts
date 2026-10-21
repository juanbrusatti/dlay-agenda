/**
 * Por dónde sale WhatsApp.
 *
 * Desde el 21/10/2026 WhatsApp sale sólo por QR (Baileys): gratis, sin
 * plantillas que aprobar y sin ventana de 24 horas. Todo lo de la Cloud API
 * de Meta —la conexión, el webhook, la bandeja de Mensajes, los nombres de
 * plantilla, los costos por mensaje— sigue en el código pero no se muestra.
 *
 * Volver a mostrarlo es cambiar esto a `true`. Nada se borró.
 *
 * Va en su propio archivo, sin `next/headers`, porque lo leen también
 * componentes de cliente.
 */
export const META_VISIBLE = false;
