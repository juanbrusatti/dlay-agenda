import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, expectRejected } from "./helpers";
import { setupScenario, teardownScenario, type Scenario } from "./fixtures";

/**
 * WhatsApp por QR.
 *
 * `baileys_auth` tiene las llaves del dispositivo: con ellas cualquiera manda
 * mensajes en nombre del negocio. Lo que se prueba es que desde el panel no se
 * puedan leer ni escribir, y que el QR —que vincula el número— lo vea sólo
 * quien puede vincular.
 */

let s: Scenario;

beforeAll(async () => {
  s = await setupScenario("baileys");
  // Lo que escribiría el servidor de WhatsApp, que entra como service_role.
  await asAdmin(async (c) => {
    await c.query(
      `insert into public.baileys_sessions (tenant_id, status, qr_code)
       values ($1, 'connecting', 'QR-DE-A')`,
      [s.tenantA],
    );
    await c.query(
      `insert into public.baileys_auth (tenant_id, key, value)
       values ($1, 'creds', '{"secreto": true}')`,
      [s.tenantA],
    );
  });
});

afterAll(async () => {
  await teardownScenario(s);
});

describe("las llaves", () => {
  it("nadie del panel las lee, ni la titular", async () => {
    for (const quien of [s.owner, null]) {
      const code = await expectRejected(() =>
        asUser(quien, (c) => c.query("select * from public.baileys_auth")),
      );
      expect(code).toBe("42501");
    }
  });

  it("la tabla de sesiones tampoco se toca directo", async () => {
    const code = await expectRejected(() =>
      asUser(s.owner, (c) =>
        c.query(
          `update public.baileys_sessions set status = 'connected' where tenant_id = $1`,
          [s.tenantA],
        ),
      ),
    );
    expect(code).toBe("42501");
  });
});

describe("la vista del panel", () => {
  async function ver(quien: string) {
    return asUser(quien, async (c) => {
      const { rows } = await c.query(
        "select tenant_id, qr_code from public.baileys_sessions_view",
      );
      return rows as Array<{ tenant_id: string; qr_code: string }>;
    });
  }

  it("titular y administración ven el QR de su negocio", async () => {
    for (const quien of [s.owner, s.admin]) {
      const filas = await ver(quien);
      expect(filas).toEqual([{ tenant_id: s.tenantA, qr_code: "QR-DE-A" }]);
    }
  });

  it("recepción, profesionales y otro negocio no ven nada", async () => {
    for (const quien of [s.reception, s.staff, s.intruder]) {
      expect(await ver(quien)).toEqual([]);
    }
  });

  it("no expone las llaves", async () => {
    const code = await expectRejected(() =>
      asUser(s.owner, (c) => c.query("select session_data from public.baileys_sessions_view")),
    );
    expect(code).toBe("42703");
  });
});

describe("el panel de Dlay", () => {
  it("un titular cualquiera no lista las conexiones de todos", async () => {
    const code = await expectRejected(() =>
      asUser(s.owner, (c) => c.query("select public.platform_baileys_sessions()")),
    );
    expect(code).toBe("42501");
  });

  it("un visitante ni siquiera puede llamarla", async () => {
    const code = await expectRejected(() =>
      asUser(null, (c) => c.query("select public.platform_baileys_sessions()")),
    );
    expect(code).toBe("42501");
  });
});
