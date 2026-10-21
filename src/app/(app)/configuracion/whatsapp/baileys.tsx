"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import {
  vincularBaileys,
  desvincularBaileys,
  getBaileysSessionState,
  type BaileysSessionState,
} from "@/lib/actions/baileys";

const POLL_INTERVAL = 3000; // Consultar cada 3 segundos

/**
 * Componente para vincular WhatsApp con Baileys (modo dispositivo vinculado).
 *
 * Muestra un QR code que el usuario escanea con WhatsApp, como en WhatsApp Web.
 * Una vez conectado, el número funciona como dispositivo vinculado sin la
 * ventana de 24 horas de la API oficial.
 */
export function BaileysLink() {
  const [sessionState, setSessionState] = useState<BaileysSessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, startLinking] = useTransition();
  const [unlinking, startUnlinking] = useTransition();
  const [confirmar, setConfirmar] = useState(false);

  // Cargar estado inicial
  useEffect(() => {
    loadState();
  }, []);

  // Polling para verificar si el QR fue escaneado
  useEffect(() => {
    if (!sessionState?.hasSession || sessionState.status === "connected") {
      return;
    }

    const interval = setInterval(() => {
      loadState();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [sessionState?.hasSession, sessionState?.status]);

  async function loadState() {
    const state = await getBaileysSessionState();
    setSessionState(state);
    setLoading(false);
  }

  function handleVincular() {
    startLinking(async () => {
      const result = await vincularBaileys();
      if (result.error) {
        setSessionState({
          error: result.error,
          hasSession: false,
          status: null,
          phoneNumber: null,
          qrCode: null,
          lastConnectedAt: null,
          errorMessage: null,
        });
      } else {
        await loadState();
      }
    });
  }

  function handleDesvincular() {
    startUnlinking(async () => {
      const result = await desvincularBaileys();
      if (result.error) {
        setSessionState({
          error: result.error,
          hasSession: sessionState?.hasSession ?? false,
          status: sessionState?.status ?? null,
          phoneNumber: sessionState?.phoneNumber ?? null,
          qrCode: sessionState?.qrCode ?? null,
          lastConnectedAt: sessionState?.lastConnectedAt ?? null,
          errorMessage: null,
        });
      } else {
        await loadState();
        setConfirmar(false);
      }
    });
  }

  if (loading) {
    return (
      <Card>
        <CardBody>
          <p className="text-[13.5px] text-muted">Cargando estado de WhatsApp...</p>
        </CardBody>
      </Card>
    );
  }

  if (sessionState?.error) {
    return (
      <Card accent={false}>
        <CardBody className="grid gap-3">
          <CardTitle>Error</CardTitle>
          <p className="text-[13.5px] text-muted">{sessionState.error}</p>
          <Button variant="outline" size="sm" onClick={() => loadState()}>
            Reintentar
          </Button>
        </CardBody>
      </Card>
    );
  }

  // No hay sesión activa
  if (!sessionState?.hasSession) {
    return (
      <Card>
        <CardBody className="grid gap-4">
          <CardTitle>Vincular WhatsApp (modo dispositivo vinculado)</CardTitle>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Conectá tu número como si fuera WhatsApp Web. Este modo no tiene la
            ventana de 24 horas y el número sigue funcionando normal en tu celular.
          </p>
          <div className="grid gap-2">
            <p className="text-[13px] font-medium">Ventajas:</p>
            <ul className="ml-4 list-disc text-[13px] leading-relaxed text-muted">
              <li>Sin ventana de 24 horas</li>
              <li>El número sigue funcionando en el celular</li>
              <li>Funciona como WhatsApp Web</li>
            </ul>
          </div>
          <Button
            variant="default"
            disabled={linking}
            onClick={handleVincular}
            className="mt-2"
          >
            {linking ? "Generando QR..." : "Vincular WhatsApp"}
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Hay sesión en proceso de conexión (mostrar QR)
  if (sessionState.status === "connecting" && sessionState.qrCode) {
    return (
      <Card accent={false}>
        <CardBody className="grid gap-4">
          <CardTitle>Vincular WhatsApp</CardTitle>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Escaneá el código QR con WhatsApp. Se debe escanear directamente desde
            la app de WhatsApp (no desde WhatsApp Web).
          </p>
          <div className="flex justify-center">
            <img
              src={`data:image/png;base64,${sessionState.qrCode}`}
              alt="QR Code para vincular WhatsApp"
              className="h-64 w-64 rounded-lg border"
            />
          </div>
          <p className="text-center text-[12.5px] text-muted">
            Abre WhatsApp → Ajustes → Dispositivos vinculados → Vincular un
            dispositivo
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startUnlinking(() => desvincularBaileys())}
            disabled={unlinking}
          >
            {unlinking ? "Cancelando..." : "Cancelar"}
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Sesión conectada
  if (sessionState.status === "connected") {
    return (
      <Card accent={true}>
        <CardBody className="grid gap-3">
          <CardTitle>WhatsApp conectado</CardTitle>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Tu número de WhatsApp está conectado como dispositivo vinculado.
            Los recordatorios se envían automáticamente desde acá.
          </p>
          <dl className="grid gap-1.5 border-t-[1.5px] border-white/25 pt-3 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="opacity-75">Número</dt>
              <dd>{sessionState.phoneNumber || "Conectado"}</dd>
            </div>
            {sessionState.lastConnectedAt && (
              <div className="flex justify-between gap-3">
                <dt className="opacity-75">Última conexión</dt>
                <dd>
                  {new Date(sessionState.lastConnectedAt).toLocaleString("es-AR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            )}
          </dl>
          {confirmar ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="danger"
                disabled={unlinking}
                onClick={handleDesvincular}
              >
                {unlinking ? "Desconectando..." : "Sí, desconectar"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmar(false)}>
                Mejor no
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setConfirmar(true)}
            >
              Desconectar
            </Button>
          )}
        </CardBody>
      </Card>
    );
  }

  // Estado de error
  if (sessionState.status === "error") {
    return (
      <Card accent={false}>
        <CardBody className="grid gap-3">
          <CardTitle>Error de conexión</CardTitle>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Hubo un error con la sesión de WhatsApp.
            {sessionState.errorMessage && `: ${sessionState.errorMessage}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startUnlinking(() => desvincularBaileys())}
              disabled={unlinking}
            >
              {unlinking ? "Limpiando..." : "Limpiar sesión"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleVincular}>
              Reintentar
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Otros estados (disconnected, pending)
  return (
    <Card>
      <CardBody className="grid gap-3">
        <CardTitle>Estado: {sessionState.status}</CardTitle>
        <p className="text-[13.5px] leading-relaxed text-muted">
          La sesión está en estado "{sessionState.status}".
        </p>
        <Button variant="outline" size="sm" onClick={handleVincular}>
          Vincular de nuevo
        </Button>
      </CardBody>
    </Card>
  );
}
