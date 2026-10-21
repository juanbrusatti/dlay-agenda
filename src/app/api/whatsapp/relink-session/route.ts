import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

const schema = z.object({
  sessionId: z.string().min(1, "El ID de sesión es requerido"),
});

/**
 * Endpoint para forzar la reconexión de una sesión de Baileys.
 *
 * Usado por el panel /super/whatsapp-relink para reconectar sesiones
 * que pueden haberse desconectado.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const env = serverEnv();
  if (!env.BAILEYS_SERVER_URL) {
    return NextResponse.json(
      { error: "El servidor Baileys no está configurado." },
      { status: 500 }
    );
  }

  const supabase = createClient();

  try {
    // Obtener la sesión
    const { data: session, error: fetchError } = await supabase
      .from("baileys_sessions")
      .select("*")
      .eq("session_id", parsed.data.sessionId)
      .maybeSingle();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: "No se encontró la sesión." },
        { status: 404 }
      );
    }

    // Llamar al servidor Baileys para reconectar
    const response = await fetch(`${env.BAILEYS_SERVER_URL}/whatsapp/relink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.session_id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error del servidor Baileys:", error);
      return NextResponse.json(
        { error: "No se pudo reconectar la sesión." },
        { status: 500 }
      );
    }

    const data = (await response.json()) as {
      ok: boolean;
      qr?: string;
    };

    if (!data.ok) {
      return NextResponse.json(
        { error: "El servidor Baileys no pudo reconectar la sesión." },
        { status: 500 }
      );
    }

    // Actualizar la sesión
    const { error: updateError } = await supabase
      .from("baileys_sessions")
      .update({
        status: "connecting",
        qr_code: data.qr || null,
        error_message: null,
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
    console.error("Error al reconectar sesión:", error);
    return NextResponse.json(
      { error: "No se pudo reconectar la sesión." },
      { status: 500 }
    );
  }
}
