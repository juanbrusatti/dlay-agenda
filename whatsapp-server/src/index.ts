import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Sessions } from "./sessions.js";

/**
 * El servidor de WhatsApp de Dlay.
 *
 * Mantiene abierta una conexión por negocio, como lo hace WhatsApp Web, y
 * expone cuatro pedidos que sólo puede hacer quien tenga el secreto: el panel
 * (vincular, desvincular) y el emisor de recordatorios (enviar).
 *
 * No guarda nada en disco. Todo vive en Supabase, así que se puede borrar y
 * levantar en otro hosting sin que nadie tenga que volver a escanear.
 */

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name}.`);
  return value;
}

const SECRET = env("BAILEYS_SECRET");
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sessions = new Sessions(supabase);

function authorized(req: IncomingMessage) {
  const given = Buffer.from(String(req.headers["x-dlay-secret"] ?? ""));
  const expected = Buffer.from(SECRET);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64_000) throw new Error("demasiado grande");
  }
  return raw ? JSON.parse(raw) : {};
}

function reply(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const server = createServer(async (req, res) => {
  try {
    // Sin secreto: es lo que miran el hosting y el «mantener despierto».
    if (req.method === "GET" && req.url === "/health") {
      return reply(res, 200, { ok: true });
    }

    if (req.method !== "POST") return reply(res, 404, { ok: false });
    if (!authorized(req)) return reply(res, 401, { ok: false, error: "no autorizado" });

    const data = await body(req);
    const tenantId = String(data.tenantId ?? "");
    if (!UUID.test(tenantId)) {
      return reply(res, 400, { ok: false, error: "Falta el negocio." });
    }

    switch (req.url) {
      case "/whatsapp/link":
        await sessions.link(tenantId);
        return reply(res, 200, { ok: true });

      case "/whatsapp/unlink":
        await sessions.unlink(tenantId);
        return reply(res, 200, { ok: true });

      case "/whatsapp/send": {
        const to = String(data.to ?? "");
        const text = String(data.text ?? "");
        if (!to || !text) {
          return reply(res, 400, { ok: false, error: "Falta el número o el texto.", permanent: true });
        }
        const result = await sessions.send(tenantId, to, text);
        return reply(res, result.ok ? 200 : result.permanent ? 422 : 503, result);
      }

      default:
        return reply(res, 404, { ok: false });
    }
  } catch (error) {
    console.error(error);
    return reply(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, async () => {
  console.log(`WhatsApp de Dlay escuchando en el puerto ${port}`);
  await sessions.restore().catch((e) => console.error("No se pudieron restaurar las sesiones", e));
});

// Los planes gratis que se duermen sin tráfico (Render) se despiertan solos
// con un pedido cada diez minutos. Dormido, el servidor corta las conexiones
// y los recordatorios dejan de salir.
const keepAlive = process.env.KEEPALIVE_URL ?? process.env.RENDER_EXTERNAL_URL;
if (keepAlive) {
  setInterval(() => {
    fetch(`${keepAlive.replace(/\/$/, "")}/health`).catch(() => {});
  }, 10 * 60 * 1000);
}
