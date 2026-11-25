import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, expectRejected, pool } from "./helpers";
import { setupScenario, teardownScenario, type Scenario } from "./fixtures";

/**
 * Logos live in a public bucket, one folder per business: anyone can see
 * them, but only that business's owner or admin can put files there.
 */

let s: Scenario;

beforeAll(async () => {
  s = await setupScenario("logo");
});

afterAll(async () => {
  // Storage refuses plain deletes unless told this one is on purpose.
  await asAdmin(async (c) => {
    await c.query("begin");
    await c.query("set local storage.allow_delete_query = 'true'");
    await c.query(`delete from storage.objects where bucket_id = 'logos' and name like $1`, [
      `${s.tenantA}/%`,
    ]);
    await c.query("commit");
  });
  await teardownScenario(s);
  await pool.end();
});

const subir = (tenant: string) =>
  `insert into storage.objects (bucket_id, name) values ('logos', '${tenant}/prueba.webp')`;

describe("logo del negocio", () => {
  it("the owner can upload into their own folder", async () => {
    await asUser(s.owner, async (c) => {
      const { rowCount } = await c.query(subir(s.tenantA));
      expect(rowCount).toBe(1);
    });
  });

  it("another business can't upload into that folder", async () => {
    await asUser(s.intruder, async (c) => {
      const code = await expectRejected(() => c.query(subir(s.tenantA)));
      expect(code).toBe("42501");
    });
  });

  it("staff of the same business can't change the logo", async () => {
    await asUser(s.staff, async (c) => {
      const code = await expectRejected(() => c.query(subir(s.tenantA)));
      expect(code).toBe("42501");
    });
  });

  it("a business can't point its logo at another folder", async () => {
    await asAdmin(async (c) => {
      const code = await expectRejected(() =>
        c.query(`update public.tenants set logo_path = $1 where id = $2`, [
          `${s.tenantB}/x.webp`,
          s.tenantA,
        ]),
      );
      expect(code).toBe("23514");
    });
  });
});
