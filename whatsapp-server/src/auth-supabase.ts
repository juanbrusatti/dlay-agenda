import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "baileys";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * El estado de autenticación de Baileys, guardado en Supabase.
 *
 * Baileys trae `useMultiFileAuthState`, que lo guarda en archivos, y sus
 * propios autores avisan que no es para producción. Además, en un hosting
 * gratis el disco se borra en cada reinicio: con archivos, cada reinicio
 * obligaría al negocio a volver a escanear el QR.
 *
 * Acá cada llave es una fila de `baileys_auth`. El servidor queda descartable:
 * se puede borrar y levantar en otro lado, y las sesiones siguen vivas.
 *
 * Los valores pasan por `BufferJSON` porque adentro hay `Buffer`s, y un
 * `JSON.stringify` común los convierte en algo que después no se puede leer.
 */
export async function useSupabaseAuthState(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const encode = (value: unknown) =>
    JSON.parse(JSON.stringify(value, BufferJSON.replacer));
  const decode = (value: unknown) =>
    JSON.parse(JSON.stringify(value), BufferJSON.reviver);

  async function read(key: string) {
    const { data, error } = await supabase
      .from("baileys_auth")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? decode(data.value) : null;
  }

  const creds: AuthenticationCreds = (await read("creds")) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const out: { [id: string]: SignalDataTypeMap[typeof type] } = {};
          if (ids.length === 0) return out;

          const { data, error } = await supabase
            .from("baileys_auth")
            .select("key, value")
            .eq("tenant_id", tenantId)
            .in(
              "key",
              ids.map((id) => `${type}-${id}`),
            );
          if (error) throw error;

          for (const row of data ?? []) {
            const id = (row.key as string).slice(type.length + 1);
            let value = decode(row.value);
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            out[id] = value;
          }
          return out;
        },
        set: async (data) => {
          const upserts: Array<{ tenant_id: string; key: string; value: unknown }> = [];
          const deletes: string[] = [];

          for (const category in data) {
            const entries = data[category as keyof SignalDataTypeMap] ?? {};
            for (const id in entries) {
              const value = entries[id];
              const key = `${category}-${id}`;
              if (value) upserts.push({ tenant_id: tenantId, key, value: encode(value) });
              else deletes.push(key);
            }
          }

          if (upserts.length > 0) {
            const { error } = await supabase
              .from("baileys_auth")
              .upsert(upserts, { onConflict: "tenant_id,key" });
            if (error) throw error;
          }
          if (deletes.length > 0) {
            const { error } = await supabase
              .from("baileys_auth")
              .delete()
              .eq("tenant_id", tenantId)
              .in("key", deletes);
            if (error) throw error;
          }
        },
      },
    },
    saveCreds: async () => {
      const { error } = await supabase
        .from("baileys_auth")
        .upsert(
          { tenant_id: tenantId, key: "creds", value: encode(creds) },
          { onConflict: "tenant_id,key" },
        );
      if (error) throw error;
    },
  };
}

/** Borra todo lo que identifica al dispositivo. Después hace falta un QR nuevo. */
export async function clearAuthState(supabase: SupabaseClient, tenantId: string) {
  const { error } = await supabase
    .from("baileys_auth")
    .delete()
    .eq("tenant_id", tenantId);
  if (error) throw error;
}
