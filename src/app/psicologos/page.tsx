import type { Metadata } from "next";
import { Portada } from "@/app/_components/portada/portada";

export const metadata: Metadata = {
  title: "Dlay Agenda para psicólogos",
  description:
    "Agenda y recordatorios por WhatsApp para tu consultorio. Mensajes discretos, menos sesiones perdidas.",
};

/** The home page told for a psychology practice. Public, like the home page. */
export default function PsicologosPage() {
  return <Portada rubro="psicologia" />;
}
