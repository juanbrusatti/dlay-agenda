import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { atLeast } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

/**
 * Endpoint para iniciar la vinculación de WhatsApp con Baileys.
 *
 * Llama al servidor Baileys externo para generar un QR code que el usuario
 * debe escanear con WhatsApp (como en WhatsApp Web).
 */
export async function POST() {
  const membership = await getCurrentTenant();
  if (!membership) {
    return NextResponse.json({ error: "No encontramos tu negocio." }, { status: 401 });
  }
  if (!atLeast(membership.role, "admin")) {
    return NextResponse.json(
      { error: "Sólo titulares y administración pueden vincular WhatsApp." },
      { status: 403 }
    );
  }

  const env = serverEnv();
  if (!env.BAILEYS_SERVER_URL) {
    return NextResponse.json(
      { error: "El servidor Baileys no está configurado." },
      { status: 500 }
    );
  }

  const supabase = await createClient();

  try {
    // Generar un ID único para la sesión
    const sessionId = `${membership.tenantId}-${Date.now()}`;

    // Llamar al servidor Baileys para iniciar la sesión
    const response = await fetch(`${env.BAILEYS_SERVER_URL}/whatsapp/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        tenantId: membership.tenantId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: "No se pudo iniciar la sesión con el servidor Baileys." },
        { status: 500 }
      );
    }

    const data = (await response.json()) as {
      qr?: string;
      sessionId?: string;
    };

    if (!data.qr || !data.sessionId) {
      return NextResponse.json(
        { error: "El servidor Baileys no devolvió el QR code." },
        { status: 500 }
      );
    }

    // Guardar la sesión en Supabase
    const { error: dbError } = await supabase.from("baileys_sessions").insert({
      tenant_id: membership.tenantId,
      session_id: data.sessionId,
      status: "connecting",
      qr_code: data.qr,
    });

    if (dbError) {
      return NextResponse.json(
        { error: "No se pudo guardar la sesión en la base de datos." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      sessionId: data.sessionId,
      qr: data.qr,
    });
  } catch (error) {
    console.error("Error al vincular WhatsApp:", error);
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor Baileys." },
      { status: 500 }
    );
  }
}
