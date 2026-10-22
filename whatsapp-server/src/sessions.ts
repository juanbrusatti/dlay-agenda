import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidDecode,
  makeCacheableSignalKeyStore,
  type WASocket,
} from "baileys";
import pino from "pino";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearAuthState, useSupabaseAuthState } from "./auth-supabase.js";

/**
 * Una conexión de WhatsApp por negocio.
 *
 * El estado que ve el panel vive en `baileys_sessions` y lo escribe sólo este
 * servidor: el panel pide «vinculá» o «desvinculá» y después mira la tabla.
 * Así el QR —que WhatsApp cambia cada veinte segundos— llega solo a la
 * pantalla, y si el servidor se reinicia, lo que dice la tabla sigue siendo
 * verdad.
 */

type Status = "connecting" | "connected" | "disconnected" | "error";

type Entry = {
  socket: WASocket;
  /** Ya escaneó el QR alguna vez. Sin esto, un corte es «venció el QR». */
  paired: boolean;
  /** Quien desvincula a propósito no quiere que lo reconectemos. */
  closing: boolean;
  retries: number;
};

const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });

/** WhatsApp corta el QR sólo después de varias vueltas; esto le pone techo. */
const MAX_QR = 6;

export class Sessions {
  private entries = new Map<string, Entry>();
  private qrCount = new Map<string, number>();

  constructor(private supabase: SupabaseClient) {}

  /** Al arrancar, vuelve a levantar lo que estaba conectado. */
  async restore() {
    const { data, error } = await this.supabase
      .from("baileys_sessions")
      .select("tenant_id, status");
    if (error) throw error;

    for (const row of data ?? []) {
      if (row.status === "connected") {
        // Que un negocio con problemas no deje sin levantar a los demás.
        await this.start(row.tenant_id).catch((e) =>
          logger.error({ e, tenantId: row.tenant_id }, "no se pudo restaurar"),
        );
      } else if (row.status === "connecting") {
        // Se reinició con un QR en pantalla: ese QR ya no sirve.
        await this.update(row.tenant_id, {
          status: "disconnected",
          qr_code: null,
          error_message: "El código venció. Generá uno nuevo.",
        });
      }
    }
  }

  isConnected(tenantId: string) {
    const entry = this.entries.get(tenantId);
    return Boolean(entry?.socket.user && entry.paired);
  }

  /** Empieza de cero: borra lo anterior y deja que llegue un QR nuevo. */
  async link(tenantId: string) {
    if (this.isConnected(tenantId)) return;

    await this.stop(tenantId);
    await clearAuthState(this.supabase, tenantId);
    this.qrCount.set(tenantId, 0);

    await this.supabase.from("baileys_sessions").upsert(
      {
        tenant_id: tenantId,
        status: "connecting",
        qr_code: null,
        phone_number: null,
        error_message: null,
        linked_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );

    await this.start(tenantId);
  }

  async unlink(tenantId: string) {
    const entry = this.entries.get(tenantId);
    if (entry) {
      entry.closing = true;
      // `logout` le avisa al teléfono, que saca el dispositivo de su lista.
      await entry.socket.logout().catch(() => entry.socket.end(undefined));
      this.entries.delete(tenantId);
    }
    await clearAuthState(this.supabase, tenantId);
    await this.update(tenantId, {
      status: "disconnected",
      qr_code: null,
      error_message: null,
    });
  }

  /**
   * Manda un texto. Devuelve `permanent` cuando reintentar no cambia nada,
   * con la misma idea que el emisor usa para Meta.
   */
  async send(
    tenantId: string,
    phone: string,
    text: string,
  ): Promise<{ ok: boolean; messageId?: string; error?: string; permanent?: boolean }> {
    const entry = this.entries.get(tenantId);
    if (!entry || !this.isConnected(tenantId)) {
      return { ok: false, error: "El WhatsApp del negocio no está conectado." };
    }

    const digits = phone.replace(/\D/g, "");
    // Preguntarle a WhatsApp por el número resuelve solo el 9 de los
    // celulares argentinos: devuelve la dirección real, con o sin él.
    const [found] = (await entry.socket.onWhatsApp(digits)) ?? [];
    if (!found?.exists) {
      return { ok: false, error: "Ese número no tiene WhatsApp.", permanent: true };
    }

    // «Escribiendo…» un par de segundos, como una persona.
    await entry.socket.presenceSubscribe(found.jid).catch(() => {});
    await entry.socket.sendPresenceUpdate("composing", found.jid).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1800));
    await entry.socket.sendPresenceUpdate("paused", found.jid).catch(() => {});

    const sent = await entry.socket.sendMessage(found.jid, { text });

    await this.update(tenantId, { last_message_sent_at: new Date().toISOString() });
    return { ok: true, messageId: sent?.key.id ?? undefined };
  }

  private async stop(tenantId: string) {
    const entry = this.entries.get(tenantId);
    if (!entry) return;
    entry.closing = true;
    entry.socket.end(undefined);
    this.entries.delete(tenantId);
  }

  private async start(tenantId: string, retries = 0) {
    const { state, saveCreds } = await useSupabaseAuthState(this.supabase, tenantId);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: undefined,
    }));

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      // Es el nombre que aparece en «Dispositivos vinculados» del teléfono.
      browser: Browsers.macOS("Dlay Agenda"),
      // Si figuramos «en línea», el teléfono deja de sonar con los mensajes
      // que le llegan al negocio. Tiene que seguir sonando.
      markOnlineOnConnect: false,
      // No pedimos el historial completo: sólo mandamos recordatorios. Lo
      // mínimo sí hay que dejarlo pasar, porque de ahí Baileys aprende a qué
      // dirección interna (LID) corresponde cada número; cortarlo del todo
      // deja la sesión inestable, y lo avisa con un DANGER en los logs.
      syncFullHistory: false,
    });

    const entry: Entry = {
      socket,
      paired: Boolean(state.creds.registered),
      closing: false,
      retries,
    };
    this.entries.set(tenantId, entry);

    socket.ev.on("creds.update", () => {
      saveCreds().catch((e) => logger.error({ e, tenantId }, "no se guardaron las credenciales"));
    });

    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const count = (this.qrCount.get(tenantId) ?? 0) + 1;
        this.qrCount.set(tenantId, count);
        if (count > MAX_QR) {
          entry.closing = true;
          socket.end(undefined);
          this.entries.delete(tenantId);
          await this.update(tenantId, {
            status: "disconnected",
            qr_code: null,
            error_message: "Nadie escaneó el código a tiempo. Generá uno nuevo.",
          });
          return;
        }
        await this.update(tenantId, { status: "connecting", qr_code: qr });
      }

      if (connection === "open") {
        // Si todavía no estaba emparejado, esto es el escaneo: queda la fecha.
        // Las reconexiones posteriores no la tocan.
        const recienEscaneado = !entry.paired;
        entry.paired = true;
        entry.retries = 0;
        this.qrCount.delete(tenantId);
        await this.update(tenantId, {
          status: "connected",
          qr_code: null,
          error_message: null,
          phone_number: socket.user ? `+${jidDecode(socket.user.id)?.user ?? ""}` : null,
          last_connected_at: new Date().toISOString(),
          ...(recienEscaneado && { linked_at: new Date().toISOString() }),
        });
      }

      if (connection === "close") {
        if (this.entries.get(tenantId) === entry) this.entries.delete(tenantId);
        if (entry.closing) return;

        const code = (lastDisconnect?.error as { output?: { statusCode?: number } })
          ?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          // Lo sacaron desde el teléfono. Las llaves ya no sirven.
          await clearAuthState(this.supabase, tenantId);
          await this.update(tenantId, {
            status: "disconnected",
            qr_code: null,
            error_message: "Se desvinculó desde el teléfono. Vinculalo de nuevo.",
          });
          return;
        }

        if (code === DisconnectReason.connectionReplaced) {
          // Otra copia del servidor tomó la sesión. Pelear por ella hace que
          // WhatsApp las corte a las dos.
          await this.update(tenantId, {
            status: "error",
            error_message: "La sesión se abrió en otro servidor.",
          });
          return;
        }

        if (!entry.paired && code !== DisconnectReason.restartRequired) {
          await this.update(tenantId, {
            status: "disconnected",
            qr_code: null,
            error_message: "El código venció. Generá uno nuevo.",
          });
          return;
        }

        // `restartRequired` llega siempre justo después de escanear: es
        // normal. Cualquier otro corte, se reintenta con espera creciente.
        const next = code === DisconnectReason.restartRequired ? 0 : entry.retries + 1;
        const wait = next === 0 ? 0 : Math.min(60_000, 2_000 * 2 ** Math.min(next, 5));
        setTimeout(() => {
          this.start(tenantId, next).catch((e) =>
            logger.error({ e, tenantId }, "no se pudo reconectar"),
          );
        }, wait);
      }
    });
  }

  private async update(tenantId: string, fields: Record<string, unknown>) {
    const { error } = await this.supabase
      .from("baileys_sessions")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId);
    if (error) logger.error({ error, tenantId }, "no se actualizó la sesión");
  }
}
