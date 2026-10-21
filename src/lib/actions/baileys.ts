"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

export type BaileysLinkState = {
  error: string | null;
  notice?: string | null;
  sessionId?: string;
  qrCode?: string;
};

/**
 * Inicia el proceso de vinculación de WhatsApp con Baileys.
 *
 * Llama al servidor Baileys externo para generar un QR code y guarda
 * la sesión en Supabase.
 */
export async function vincularBaileys(): Promise<BaileysLinkState> {
  const membership = await getCurrentTenant();
  if (!membership) return { error: "No encontramos tu negocio." };
  if (!atLeast(membership.role, "admin")) {
    return { error: "Sólo titulares y administración pueden vincular WhatsApp." };
  }

  const env = serverEnv();
  if (!env.BAILEYS_SERVER_URL) {
    return { error: "El servidor Baileys no está configurado." };
  }

  const supabase = await createClient();

  try {
    const sessionId = `${membership.tenantId}-${Date.now()}`;

    const response = await fetch(`${env.BAILEYS_SERVER_URL}/whatsapp/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tenantId: membership.tenantId }),
    });

    if (!response.ok) {
      return { error: "No se pudo iniciar la sesión con el servidor Baileys." };
    }

    const data = (await response.json()) as { qr?: string; sessionId?: string };

    if (!data.qr || !data.sessionId) {
      return { error: "El servidor Baileys no devolvió el QR code." };
    }

    const { error: dbError } = await supabase.from("baileys_sessions").insert({
      tenant_id: membership.tenantId,
      session_id: data.sessionId,
      status: "connecting",
      qr_code: data.qr,
    });

    if (dbError) {
      return { error: "No se pudo guardar la sesión en la base de datos." };
    }

    revalidatePath("/configuracion/whatsapp");
    return {
      error: null,
      notice: "QR generado. Escanealo con WhatsApp.",
      sessionId: data.sessionId,
      qrCode: data.qr,
    };
  } catch (error) {
    console.error("Error al vincular Baileys:", error);
    return { error: "No se pudo conectar con el servidor Baileys." };
  }
}

/**
 * Desvincula la sesión de WhatsApp con Baileys.
 *
 * Cierra la sesión en el servidor Baileys y la marca como desconectada.
 */
export async function desvincularBaileys(): Promise<{ error: string | null }> {
  const membership = await getCurrentTenant();
  if (!membership) return { error: "No encontramos tu negocio." };
  if (!atLeast(membership.role, "admin")) {
    return { error: "Sólo titulares y administración pueden desvincular WhatsApp." };
  }

  const env = serverEnv();
  if (!env.BAILEYS_SERVER_URL) {
    return { error: "El servidor Baileys no está configurado." };
  }

  const supabase = await createClient();

  try {
    const { data: session, error: fetchError } = await supabase
      .from("baileys_sessions")
      .select("*")
      .eq("tenant_id", membership.tenantId)
      .in("status", ["connecting", "connected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !session) {
      return { error: "No hay sesión activa para desvincular." };
    }

    const response = await fetch(`${env.BAILEYS_SERVER_URL}/whatsapp/unlink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.session_id }),
    });

    if (!response.ok) {
      console.error("El servidor Baileys no pudo cerrar la sesión:", await response.text());
    }

    const { error: updateError } = await supabase
      .from("baileys_sessions")
      .update({
        status: "disconnected",
        qr_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateError) {
      return { error: "No se pudo actualizar la sesión en la base de datos." };
    }

    revalidatePath("/configuracion/whatsapp");
    return { error: null };
  } catch (error) {
    console.error("Error al desvincular Baileys:", error);
    return { error: "No se pudo desvincular la sesión." };
  }
}

export type BaileysSessionState = {
  error: string | null;
  hasSession: boolean;
  status: string | null;
  phoneNumber: string | null;
  qrCode: string | null;
  lastConnectedAt: string | null;
  errorMessage: string | null;
};

/**
 * Obtiene el estado actual de la sesión de WhatsApp.
 */
export async function getBaileysSessionState(): Promise<BaileysSessionState> {
  const membership = await getCurrentTenant();
  if (!membership) {
    return {
      error: "No encontramos tu negocio.",
      hasSession: false,
      status: null,
      phoneNumber: null,
      qrCode: null,
      lastConnectedAt: null,
      errorMessage: null,
    };
  }

  const supabase = await createClient();

  try {
    const { data: session, error } = await supabase
      .from("baileys_sessions_view")
      .select("*")
      .eq("tenant_id", membership.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        error: "No se pudo obtener el estado de la sesión.",
        hasSession: false,
        status: null,
        phoneNumber: null,
        qrCode: null,
        lastConnectedAt: null,
        errorMessage: null,
      };
    }

    if (!session) {
      return {
        error: null,
        hasSession: false,
        status: null,
        phoneNumber: null,
        qrCode: null,
        lastConnectedAt: null,
        errorMessage: null,
      };
    }

    return {
      error: null,
      hasSession: true,
      status: session.status,
      phoneNumber: session.phone_number,
      qrCode: session.qr_code,
      lastConnectedAt: session.last_connected_at,
      errorMessage: session.error_message,
    };
  } catch (error) {
    console.error("Error al obtener estado de sesión:", error);
    return {
      error: "No se pudo obtener el estado de la sesión.",
      hasSession: false,
      status: null,
      phoneNumber: null,
      qrCode: null,
      lastConnectedAt: null,
      errorMessage: null,
    };
  }
}
