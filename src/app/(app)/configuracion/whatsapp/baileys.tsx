"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import {
  desvincularBaileys,
  getBaileysSessionState,
  probarBaileys,
  vincularBaileys,
  type BaileysSessionState,
} from "@/lib/actions/baileys";

/** Lo bastante seguido para que el QR nuevo aparezca antes de que venza. */
const CADA_MS = 3000;

/**
 * Conectar WhatsApp escaneando un QR, como WhatsApp Web.
 *
 * Es la alternativa gratis a la Cloud API: sin plantillas que aprobar y sin
 * costo por mensaje. El servidor de WhatsApp escribe el QR en la base y lo
 * renueva solo; esta tarjeta lo dibuja y mira hasta que la conexión abre.
 */
export function BaileysLink() {
  const [estado, setEstado] = useState<BaileysSessionState | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [qrImagen, setQrImagen] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const cargar = useCallback(async () => {
    setEstado(await getBaileysSessionState());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  // Mientras se espera el escaneo, se pregunta seguido. Conectado o sin
  // sesión, no hay nada que esperar.
  useEffect(() => {
    if (estado?.status !== "connecting") return;
    const id = setInterval(cargar, CADA_MS);
    return () => clearInterval(id);
  }, [estado?.status, cargar]);

  useEffect(() => {
    const qr = estado?.status === "connecting" ? estado.qrCode : null;
    if (!qr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQrImagen(null);
      return;
    }
    let vigente = true;
    QRCode.toDataURL(qr, { margin: 1, width: 512 }).then((url) => {
      if (vigente) setQrImagen(url);
    });
    return () => {
      vigente = false;
    };
  }, [estado?.status, estado?.qrCode]);

  function vincular() {
    setAviso(null);
    startTransition(async () => {
      const r = await vincularBaileys();
      if (r.error) setAviso(r.error);
      await cargar();
    });
  }

  function desvincular() {
    setAviso(null);
    startTransition(async () => {
      const r = await desvincularBaileys();
      if (r.error) setAviso(r.error);
      setConfirmar(false);
      await cargar();
    });
  }

  if (!estado) {
    return (
      <Card>
        <CardBody>
          <p className="text-[13.5px] text-muted">Mirando el estado de WhatsApp…</p>
        </CardBody>
      </Card>
    );
  }

  const error = aviso ?? estado.error;

  if (estado.status === "connected") {
    return (
      <>
      <Card accent>
        <CardBody className="grid gap-3">
          <CardTitle>WhatsApp conectado con QR</CardTitle>
          <p className="text-[13.5px] leading-relaxed opacity-90">
            Los recordatorios salen desde tu número, sin costo por mensaje. El
            teléfono tiene que conectarse a internet al menos una vez cada dos
            semanas, o WhatsApp desvincula el dispositivo.
          </p>
          <dl className="grid gap-1.5 border-t-[1.5px] border-white/25 pt-3 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="opacity-75">Número</dt>
              <dd>{estado.phoneNumber ?? "Conectado"}</dd>
            </div>
            {estado.lastConnectedAt && (
              <div className="flex justify-between gap-3">
                <dt className="opacity-75">Conectado desde</dt>
                <dd>
                  {new Date(estado.lastConnectedAt).toLocaleString("es-AR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            )}
          </dl>
          {error && <p className="text-[13px]">{error}</p>}
          {confirmar ? (
            <div className="mt-1 flex flex-wrap gap-2">
              <Button variant="danger" disabled={pendiente} onClick={desvincular}>
                {pendiente ? "Desconectando…" : "Sí, desconectar"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmar(false)}>
                Mejor no
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="mt-1" onClick={() => setConfirmar(true)}>
              Desconectar
            </Button>
          )}
        </CardBody>
      </Card>
      <Prueba />
      </>
    );
  }

  if (estado.status === "connecting") {
    return (
      <Card>
        <CardBody className="grid gap-4">
          <CardTitle>Escaneá el código</CardTitle>
          <ol className="ml-4 list-decimal text-[13.5px] leading-relaxed text-muted">
            <li>Abrí WhatsApp en el teléfono del negocio.</li>
            <li>Andá a Ajustes → Dispositivos vinculados → Vincular un dispositivo.</li>
            <li>Apuntá la cámara a este código.</li>
          </ol>
          <div className="flex justify-center">
            {qrImagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrImagen}
                alt="Código QR para vincular WhatsApp"
                className="h-64 w-64 rounded-lg border-[1.5px] border-line bg-white p-2"
              />
            ) : (
              <p className="py-24 text-[13.5px] text-muted">Generando el código…</p>
            )}
          </div>
          <p className="text-center text-[12.5px] text-faint">
            El código se renueva solo cada unos segundos.
          </p>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <Button variant="ghost" size="sm" disabled={pendiente} onClick={desvincular}>
            Cancelar
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Sin conexión: nunca se vinculó, se desvinculó o falló.
  return (
    <Card>
      <CardBody className="grid gap-3">
        <CardTitle>Conectar con QR, sin costo por mensaje</CardTitle>
        <p className="text-[13.5px] leading-relaxed text-muted">
          Vinculá el número del negocio como si fuera WhatsApp Web. Los
          recordatorios salen como texto común, con el enlace para confirmar o
          cambiar el turno. No hace falta aprobar plantillas y el número sigue
          funcionando normal en el teléfono.
        </p>
        <p className="text-[13px] leading-relaxed text-muted">
          WhatsApp no permite oficialmente esta forma de conexión: si detecta
          algo raro puede bloquear el número. Por eso los mensajes salen de a
          uno y despacio.
        </p>
        {estado.errorMessage && (
          <p className="text-[13px] text-danger">{estado.errorMessage}</p>
        )}
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Button disabled={pendiente} onClick={vincular} className="mt-1">
          {pendiente ? "Pidiendo el código…" : "Mostrar el código QR"}
        </Button>
      </CardBody>
    </Card>
  );
}

/**
 * Un mensaje a un número propio, para ver que la cadena entera anda antes de
 * que le llegue algo a un cliente.
 */
function Prueba() {
  const [telefono, setTelefono] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  function probar(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    startTransition(async () => {
      const r = await probarBaileys(telefono);
      setResultado(
        r.error
          ? { ok: false, texto: r.error }
          : { ok: true, texto: "Listo: fijate en ese teléfono, tendría que llegar en unos segundos." },
      );
    });
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={probar} className="grid gap-3">
          <CardTitle>Mandarme un mensaje de prueba</CardTitle>
          <Field
            label="A qué número"
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="358 412 3456"
            hint="Usá uno tuyo, distinto del que acabás de vincular: un número no se puede escribir a sí mismo."
            required
          />
          {resultado && (
            <p
              role="status"
              className={`text-[13px] ${resultado.ok ? "text-ink" : "text-danger"}`}
            >
              {resultado.texto}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={pendiente || !telefono.trim()}>
            {pendiente ? "Mandando…" : "Mandar prueba"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
