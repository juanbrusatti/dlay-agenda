import { WHATSAPP_CONSULTA } from "@/lib/contacto";
import { EnlaceContado } from "./boton-contado";

/**
 * «Consultas», always at hand in the bottom-right corner of the home page,
 * for whoever wants to ask before signing up.
 */
export function WhatsappFlotante() {
  return (
    <EnlaceContado
      boton="whatsapp"
      href={WHATSAPP_CONSULTA}
      externo
      aria-label="Escribinos por WhatsApp"
      className="fixed z-30 flex items-center gap-2 rounded-pill px-4 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] hover:opacity-95"
      // WhatsApp-ish green on purpose, fixed: it is the chat, not the brand.
      style={{ background: "#1f8a4c", right: 16, bottom: 16 }}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8Z" />
      </svg>
      Consultas
    </EnlaceContado>
  );
}
