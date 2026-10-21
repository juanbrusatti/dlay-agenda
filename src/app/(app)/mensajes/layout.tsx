import { notFound } from "next/navigation";
import { META_VISIBLE } from "@/lib/canal-whatsapp";

/**
 * La bandeja muestra lo que llega por la Cloud API de Meta. Mientras WhatsApp
 * salga sólo por QR no hay nada que mostrar, y la sección no existe.
 */
export default function MensajesLayout({ children }: { children: React.ReactNode }) {
  if (!META_VISIBLE) notFound();
  return children;
}
