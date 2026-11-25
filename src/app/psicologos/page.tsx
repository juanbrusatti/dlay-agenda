import type { Metadata } from "next";
import { Portada } from "@/app/_components/portada/portada";

export const metadata: Metadata = {
  title: "Dlay Agenda para psicólogos",
  description:
    "Agenda y recordatorios por WhatsApp para tu consultorio. Mensajes discretos, menos sesiones perdidas.",
};

/**
 * The same home page, opened with the psychology example. The address stays
 * because it was already sent to practices, and the panel counts its visits
 * apart.
 */
export default function PsicologosPage() {
  return <Portada rubro="psicologia" ruta="/psicologos" />;
}
