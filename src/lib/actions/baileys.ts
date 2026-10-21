"use server";

import { revalidatePath } from "next/cache";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

/**
 * WhatsApp por QR (Baileys).
 *
 * El panel no escribe el estado de la conexión: le pide al servidor de
 * WhatsApp que vincule o desvincule, y el servidor va dejando en la base el QR
 * y lo que pasa. La pantalla sólo mira `baileys_sessions_view`.
 */

export type BaileysSessionState = {
  error: string | null;
  status: "connecting" | "connected" | "disconnected" | "error" | null;
  phoneNumber: string | null;
  qrCode: string | null;
  lastConnectedAt: string | null;
  errorMessage: string | null;
};

const VACIO: Omit<BaileysSessionState, "error"> = {
  status: null,
  phoneNumber: null,
  qrCode: null,
  lastConnectedAt: null,
  errorMessage: null,
};

async function pedir(path: string, tenantId: string): Promise<string | null> {
  const env = serverEnv();
  if (!env.BAILEYS_SERVER_URL || !env.BAILEYS_SECRET) {
    return "El servidor de WhatsApp todavía no está configurado.";
  }

  try {
    const response = await fetch(`${env.BAILEYS_SERVER_URL.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dlay-secret": env.BAILEYS_SECRET,
      },
      body: JSON.stringify({ tenantId }),
      // Un servidor gratis que se estaba despertando puede tardar.
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.error("Servidor de WhatsApp:", response.status, await response.text());
      return "El servidor de WhatsApp no respondió bien. Probá de nuevo en un rato.";
    }
    return null;
  } catch (error) {
    console.error("Servidor de WhatsApp:", error);
    return "No pudimos hablar con el servidor de WhatsApp. Probá de nuevo en un rato.";
  }
}

async function autorizado(): Promise<{ error: string } | { tenantId: string }> {
  const membership = await getCurrentTenant();
  if (!membership) return { error: "No encontramos tu negocio." };
  if (!atLeast(membership.role, "admin")) {
    return { error: "Sólo titulares y administración pueden conectar WhatsApp." };
  }
  return { tenantId: membership.tenantId };
}

export async function vincularBaileys(): Promise<{ error: string | null }> {
  const quien = await autorizado();
  if ("error" in quien) return { error: quien.error };

  const error = await pedir("/whatsapp/link", quien.tenantId);
  revalidatePath("/configuracion/whatsapp");
  return { error };
}

export async function desvincularBaileys(): Promise<{ error: string | null }> {
  const quien = await autorizado();
  if ("error" in quien) return { error: quien.error };

  const error = await pedir("/whatsapp/unlink", quien.tenantId);
  revalidatePath("/configuracion/whatsapp");
  return { error };
}

export async function getBaileysSessionState(): Promise<BaileysSessionState> {
  const membership = await getCurrentTenant();
  if (!membership) return { error: "No encontramos tu negocio.", ...VACIO };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baileys_sessions_view")
    .select("status, phone_number, qr_code, last_connected_at, error_message")
    .eq("tenant_id", membership.tenantId)
    .maybeSingle();

  if (error) return { error: "No pudimos leer el estado de WhatsApp.", ...VACIO };
  if (!data) return { error: null, ...VACIO };

  return {
    error: null,
    status: data.status as BaileysSessionState["status"],
    phoneNumber: data.phone_number,
    qrCode: data.qr_code,
    lastConnectedAt: data.last_connected_at,
    errorMessage: data.error_message,
  };
}
