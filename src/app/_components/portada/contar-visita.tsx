"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Counts one visit to a public home page, for the platform panel.
 *
 * Once per tab session and page, so reloads and coming back from the demo
 * don't inflate it. Fire and forget: if it fails, the visitor never notices.
 */
export function ContarVisita({ ruta }: { ruta: "/" | "/psicologos" }) {
  useEffect(() => {
    const clave = `dlay:visita:${ruta}`;
    try {
      if (sessionStorage.getItem(clave)) return;
      sessionStorage.setItem(clave, "1");
    } catch {
      // Without storage it still counts, once per load.
    }
    createClient()
      .rpc("registrar_visita", { p_ruta: ruta })
      .then(
        () => {},
        () => {},
      );
  }, [ruta]);

  return null;
}
