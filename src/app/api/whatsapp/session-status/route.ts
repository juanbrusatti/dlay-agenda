import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint para consultar el estado de la sesión de WhatsApp.
 *
 * Hace polling desde el frontend para saber si el QR ya fue escaneado
 * y la sesión está conectada.
 */
export async function GET() {
  const membership = await getCurrentTenant();
  if (!membership) {
    return NextResponse.json({ error: "No encontramos tu negocio." }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Obtener la sesión más reciente del negocio
    const { data: session, error } = await supabase
      .from("baileys_sessions_view")
      .select("*")
      .eq("tenant_id", membership.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "No se pudo obtener el estado de la sesión." },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json({
        ok: true,
        hasSession: false,
        status: null,
      });
    }

    return NextResponse.json({
      ok: true,
      hasSession: true,
      sessionId: session.session_id,
      status: session.status,
      phoneNumber: session.phone_number,
      qrCode: session.qr_code,
      lastConnectedAt: session.last_connected_at,
      errorMessage: session.error_message,
    });
  } catch (error) {
    console.error("Error al obtener estado de sesión:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el estado de la sesión." },
      { status: 500 }
    );
  }
}
