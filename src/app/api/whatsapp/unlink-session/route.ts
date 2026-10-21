import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { atLeast } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

/**
 * Endpoint para desvincular una sesión de WhatsApp con Baileys.
 *
 * Cierra la sesión en el servidor Baileys y la marca como desconectada
 * en la base de datos.
 */
export async function POST() {
  const membership = await getCurrentTenant();
  if (!membership) {
    return NextResponse.json({ error: "No encontramos tu negocio." }, { status: 401 });
  }
  if (!atLeast(membership.role, "admin")) {
    return NextResponse.json(
      { error: "Sólo titulares y administración pueden desvincular WhatsApp." },
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
    // Obtener la sesión activa del negocio
    const { data: session, error: fetchError } = await supabase
      .from("baileys_sessions")
      .select("*")
      .eq("tenant_id", membership.tenantId)
      .in("status", ["connecting", "connected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: "No hay sesión activa para desvincular." },
        { status: 404 }
      );
    }

    // Llamar al servidor Baileys para cerrar la sesión
    const response = await fetch(`${env.BAILEYS_SERVER_URL}/whatsapp/unlink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.session_id,
      }),
    });

    // No fallamos si el servidor Baileys no responde, porque queremos
    // limpiar la sesión localmente de todas formas
    if (!response.ok) {
      console.error("El servidor Baileys no pudo cerrar la sesión:", await response.text());
    }

    // Marcar la sesión como desconectada
    const { error: updateError } = await supabase
      .from("baileys_sessions")
      .update({
        status: "disconnected",
        qr_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateError) {
      return NextResponse.json(
        { error: "No se pudo actualizar la sesión en la base de datos." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al desvincular WhatsApp:", error);
    return NextResponse.json(
      { error: "No se pudo desvincular la sesión." },
      { status: 500 }
    );
  }
}
