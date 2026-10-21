import type { Metadata } from "next";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/admin";
import { BaileysRelinkList } from "./relink-list";

export const metadata: Metadata = { title: "Reconectar WhatsApp (Super)" };

/**
 * Panel interno para gestionar las sesiones de WhatsApp Baileys.
 *
 * Muestra todas las empresas con WhatsApp vinculado y permite forzar
 * la reconexión automática con pausas aleatorias para evitar detección.
 */
export default async function SuperWhatsappRelinkPage() {
  const supabase = createClient();

  // Obtener todas las sesiones activas de Baileys
  const { data: sessions, error } = await supabase
    .from("baileys_sessions_view")
    .select(
      `
      id,
      tenant_id,
      session_id,
      phone_number,
      status,
      last_connected_at,
      last_message_sent_at,
      error_message,
      created_at
    `
    )
    .in("status", ["connecting", "connected", "error"])
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Empresas con WhatsApp vinculado para recordatorios
        </h1>
        <Card accent={false}>
          <CardBody>
            <p className="text-[13.5px] text-muted">
              Error al cargar las sesiones: {error.message}
            </p>
          </CardBody>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
          Empresas con WhatsApp vinculado para recordatorios
        </h1>
        <p className="mt-1 max-w-prose text-[14.5px] text-muted">
          Este panel muestra todas las sesiones de WhatsApp conectadas con Baileys.
          El sistema envía mensajes con pausa aleatoria de 30 a 60 segundos entre
          empresas y pausas de 5 minutos cada 10 envíos para evitar que WhatsApp
          detecte el envío automático.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <Card>
          <CardBody className="grid gap-3">
            <CardTitle>Estadísticas</CardTitle>
            <dl className="grid gap-1.5 border-t-[1.5px] border-line pt-3 text-[14px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Total de sesiones</dt>
                <dd>{sessions?.length ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Conectadas</dt>
                <dd>
                  {sessions?.filter((s) => s.status === "connected").length ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Conectando</dt>
                <dd>
                  {sessions?.filter((s) => s.status === "connecting").length ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Con error</dt>
                <dd>
                  {sessions?.filter((s) => s.status === "error").length ?? 0}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <BaileysRelinkList sessions={sessions ?? []} />
      </div>
    </main>
  );
}
