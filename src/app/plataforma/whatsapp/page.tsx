import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "WhatsApp por QR · Plataforma" };

type Sesion = {
  tenant_id: string;
  negocio: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  phone_number: string | null;
  last_connected_at: string | null;
  last_message_sent_at: string | null;
  error_message: string | null;
  updated_at: string;
};

const ESTADO: Record<Sesion["status"], string> = {
  connected: "Conectado",
  connecting: "Esperando el QR",
  disconnected: "Desconectado",
  error: "Con error",
};

function fecha(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    : "—";
}

/**
 * Las conexiones de WhatsApp por QR de todos los negocios.
 *
 * Sólo mira. Reconectar lo hace el servidor solo, con espera creciente; y
 * cuando WhatsApp desvincula el dispositivo, volver a vincular exige que
 * alguien del negocio escanee con su teléfono: desde acá no se puede.
 */
export default async function PlataformaWhatsappPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_baileys_sessions");
  if (error) notFound();

  const sesiones = (data as unknown as Sesion[]) ?? [];
  const caidas = sesiones.filter((s) => s.status !== "connected" && s.status !== "connecting");

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
      <header>
        <Link href="/plataforma" className="text-[13px] text-muted hover:text-ink">
          ← Plataforma
        </Link>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em]">
          WhatsApp por QR
        </h1>
        <p className="mt-1 max-w-prose text-[14.5px] text-muted">
          {sesiones.length === 0
            ? "Ningún negocio vinculó WhatsApp con QR todavía."
            : `${sesiones.length - caidas.length} de ${sesiones.length} conectados.`}{" "}
          A los que figuran desconectados hay que avisarles que vuelvan a
          escanear el código desde Ajustes → WhatsApp.
        </p>
      </header>

      <div className="grid gap-3">
        {sesiones.map((s) => (
          <Card key={s.tenant_id}>
            <CardBody className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{s.negocio}</p>
                  <p className="text-[13px] text-muted">{s.phone_number ?? "Sin número"}</p>
                </div>
                <span
                  className={`text-[13px] font-medium ${
                    s.status === "connected" ? "text-accent-text" : s.status === "connecting" ? "text-muted" : "text-danger"
                  }`}
                >
                  {ESTADO[s.status]}
                </span>
              </div>
              {s.error_message && s.status !== "connected" && (
                <p className="text-[13px] text-danger">{s.error_message}</p>
              )}
              <dl className="grid gap-1 border-t-[1.5px] border-line pt-2 text-[12.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Conectado desde</dt>
                  <dd>{fecha(s.last_connected_at)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Último mensaje</dt>
                  <dd>{fecha(s.last_message_sent_at)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>
    </main>
  );
}
