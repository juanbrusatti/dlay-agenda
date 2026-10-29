import type { MetadataRoute } from "next";
import { ICONOS } from "@/lib/marca";

/**
 * Manifiesto de la PWA. `display: standalone` es lo que hace que se sienta una
 * aplicación y no una pestaña: sin barra de direcciones y con su propio icono
 * en la pantalla de inicio.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dlay Agenda",
    // Es lo que se lee debajo del ícono: con más sistemas Dlay instalados,
    // «Dlay» solo no dice cuál es.
    short_name: "Dlay Agenda",
    description:
      "Agenda, clientes y recordatorios automáticos para negocios.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f3ee",
    theme_color: "#f5f3ee",
    lang: "es-AR",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: ICONOS.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICONOS.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: ICONOS.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
