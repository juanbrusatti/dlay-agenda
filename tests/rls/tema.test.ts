import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, expectRejected, pool } from "./helpers";
import { setupScenario, teardownScenario, type Scenario } from "./fixtures";

/**
 * «Modo fiestas» is turned on per account, and only from Dlay's panel: a
 * business can't switch it on for itself or for anyone else, nor list them.
 */

let s: Scenario;

beforeAll(async () => {
  s = await setupScenario("tem");
});

afterAll(async () => {
  await teardownScenario(s);
  await pool.end();
});

describe("modo fiestas", () => {
  it("an account owner can't turn it on, not even for their own account", async () => {
    await asUser(s.owner, async (c) => {
      const code = await expectRejected(() =>
        c.query(`select public.platform_set_tema($1, 'fiestas')`, [s.tenantA]),
      );
      expect(code).toBe("42501");
    });
  });

  it("an account owner can't list the accounts and their look", async () => {
    await asUser(s.intruder, async (c) => {
      const code = await expectRejected(() => c.query(`select public.platform_temas()`));
      expect(code).toBe("42501");
    });
  });

  it("the home page funnel is only for Dlay's panel", async () => {
    await asUser(s.owner, async (c) => {
      const code = await expectRejected(() => c.query(`select public.platform_embudo()`));
      expect(code).toBe("42501");
    });
  });

  it("every account starts with the usual look and only accepts known ones", async () => {
    await asAdmin(async (c) => {
      const { rows } = await c.query(`select tema from public.tenants where id = $1`, [s.tenantA]);
      expect(rows[0].tema).toBeNull();
      const code = await expectRejected(() =>
        c.query(`update public.tenants set tema = 'carnaval' where id = $1`, [s.tenantA]),
      );
      expect(code).toBe("23514");
    });
  });
});
