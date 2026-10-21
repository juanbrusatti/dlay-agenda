"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";

type Session = {
  id: string;
  tenant_id: string;
  session_id: string;
  phone_number: string | null;
  status: string;
  last_connected_at: string | null;
  last_message_sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

/**
 * Lista de sesiones de WhatsApp Baileys con opción de reconexión automática.
 *
 * Implementa pausas aleatorias entre empresas y pausas cada 10 envíos
 * para evitar que WhatsApp detecte el envío automático.
 */
export function BaileysRelinkList({ sessions }: { sessions: Session[] }) {
  const [relinking, setRelinking] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  async function handleRelinkAll() {
    if (!confirm("¿Querés reconectar todas las sesiones? Esto va a tardar un rato.")) {
      return;
    }

    setRelinking(new Set(sessions.map((s) => s.id)));
    setProgress({ current: 0, total: sessions.length });

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];

      // Pausa aleatoria de 30 a 60 segundos entre empresas
      const pause = Math.floor(Math.random() * 30000) + 30000;
      await new Promise((resolve) => setTimeout(resolve, pause));

      // Pausa de 5 minutos cada 10 envíos
      if (i > 0 && i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
      }

      try {
        const response = await fetch("/api/whatsapp/relink-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.session_id }),
        });

        if (!response.ok) {
          console.error(`Error al reconectar sesión ${session.session_id}`);
        }
      } catch (error) {
        console.error(`Error al reconectar sesión ${session.session_id}:`, error);
      }

      setRelinking((prev) => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });

      setProgress({ current: i + 1, total: sessions.length });
    }

    setProgress(null);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-muted";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "connected":
        return "Conectada";
      case "connecting":
        return "Conectando";
      case "error":
        return "Error";
      case "disconnected":
        return "Desconectada";
      case "pending":
        return "Pendiente";
      default:
        return status;
    }
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-[13.5px] text-muted">
            No hay sesiones de WhatsApp vinculadas.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Números vinculados</CardTitle>
            <p className="mt-1 text-[13.5px] text-muted">
              {sessions.length} sesión{sessions.length !== 1 ? "es" : ""} activa
              {sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="default"
            onClick={handleRelinkAll}
            disabled={relinking.size > 0}
          >
            {relinking.size > 0
              ? `Reconectando... (${progress?.current ?? 0}/${progress?.total ?? 0})`
              : "Reconectar todas"}
          </Button>
        </CardBody>
      </Card>

      {progress && (
        <Card accent={false}>
          <CardBody>
            <div className="mb-2 flex justify-between text-[13.5px]">
              <span>Progreso</span>
              <span>
                {progress.current} de {progress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              Pausa aleatoria de 30-60s entre empresas, 5min cada 10 envíos
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-3">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardBody className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">
                    {session.phone_number || "Sin número"}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    Session ID: {session.session_id}
                  </p>
                </div>
                <span
                  className={`text-[13px] font-medium ${getStatusColor(session.status)}`}
                >
                  {getStatusLabel(session.status)}
                </span>
              </div>

              {session.error_message && (
                <p className="text-[12.5px] text-red-600">
                  Error: {session.error_message}
                </p>
              )}

              <dl className="grid gap-1 border-t-[1.5px] border-line pt-2 text-[12.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Creada</dt>
                  <dd>
                    {new Date(session.created_at).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </dd>
                </div>
                {session.last_connected_at && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Última conexión</dt>
                    <dd>
                      {new Date(session.last_connected_at).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                )}
                {session.last_message_sent_at && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Último mensaje</dt>
                    <dd>
                      {new Date(session.last_message_sent_at).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
