import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

const schema = z.object({
  to: z.string().min(5, "El número de destino es requerido"),
  message: z.string().min(1, "El mensaje es requerido"),
});

/**
 * Endpoint para enviar un mensaje de WhatsApp a través de Baileys.
 *
 * Envía el mensaje al servidor Baileys externo, que lo hace llegar
 * como si fuera enviado desde WhatsApp Web.
 */
export async function POST(request: Request) {
  const membership = await getCurrentTenant();
  if (!membership) {
    return NextResponse.json({ error: "No encontramos tu negocio." }, { status: 401 });
  }

  const env = serverEnv();
  if (!env.BAILEYS_SERVER_URL) {
    return NextResponse.json(
      { error: "El servidor Baileys no está configurado." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    // Obtener la sesión activa del negocio
    const { data: session, error: fetchError } = await supabase
      .from("baileys_sessions")
      .select("*")
      .eq("tenant_id", membership.tenantId)
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: "No hay sesión de WhatsApp conectada. Vinculá tu número primero." },
        { status: 400 }
      );
    }

    // Llamar al servidor Baileys para enviar el mensaje
    const response = await fetch(`${env.BAILEYS_SERVER_URL}/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.session_id,
        to: parsed.data.to,
        message: parsed.data.message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error del servidor Baileys:", error);
      return NextResponse.json(
        { error: "No se pudo enviar el mensaje." },
        { status: 500 }
      );
    }

    const data = (await response.json()) as {
      ok: boolean;
      messageId?: string;
    };

    if (!data.ok) {
      return NextResponse.json(
        { error: "El servidor Baileys no pudo enviar el mensaje." },
        { status: 500 }
      );
    }

    // Actualizar el timestamp del último mensaje enviado
    await supabase
      .from("baileys_sessions")
      .update({
        last_message_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    return NextResponse.json({
      ok: true,
      messageId: data.messageId,
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el mensaje." },
      { status: 500 }
    );
  }
}
