import type { Metadata } from "next";
import { Portada } from "@/app/_components/portada/portada";

const TITULO = "Dlay Agenda para psicólogos";
const DESCRIPCION =
  "Agenda y recordatorios por WhatsApp para tu consultorio. Mensajes discretos, menos sesiones perdidas.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: TITULO, description: DESCRIPCION, siteName: "Dlay Agenda", locale: "es_AR", type: "website" },
};

/**
 * The same home page, opened with the psychology example. The address stays
 * because it was already sent to practices, and the panel counts its visits
 * apart.
 */
export default function PsicologosPage() {
  return <Portada rubro="psicologia" ruta="/psicologos" />;
}
