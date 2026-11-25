/**
 * How someone who hasn't signed up yet reaches Dlay: the home page's
 * «Escribinos por WhatsApp» opens a chat here with a first line already
 * written.
 */

/** Dlay's WhatsApp, in international format without the «+». */
export const WHATSAPP_DLAY = "5493584178955";

export const MENSAJE_CONSULTA = "Hola! Vi Dlay Agenda y quería hacer una consulta.";

export const WHATSAPP_CONSULTA = `https://wa.me/${WHATSAPP_DLAY}?text=${encodeURIComponent(
  MENSAJE_CONSULTA,
)}`;
