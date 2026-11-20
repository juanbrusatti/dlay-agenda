import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, pool } from "./helpers";
import { setupScenario, teardownScenario, type Scenario } from "./fixtures";

/**
 * «Para recuperar» lists a business's clients: it must never show another
 * business's, and must leave out whoever already has their next visit.
 */

let s: Scenario;

beforeAll(async () => {
  s = await setupScenario("rec");

  await asAdmin(async (c) => {
    const { rows: b } = await c.query(
      `select id from public.branches where tenant_id = $1 and is_default`,
      [s.tenantA],
    );
    const { rows: sv } = await c.query(
      `insert into public.services (tenant_id, name, duration_minutes, price_cents)
       values ($1, 'Limpieza', 60, 100000) returning id`,
      [s.tenantA],
    );
    const { rows: cl } = await c.query(
      `insert into public.clients (tenant_id, first_name) values
         ($1, 'Lejana'), ($1, 'Vuelve'), ($1, 'Reciente')
       returning id, first_name`,
      [s.tenantA],
    );
    const id = (n: string) => cl.find((r) => r.first_name === n).id;

    const turno = async (cliente: string, cuando: string, estado: string) => {
      await c.query("begin");
      const { rows } = await c.query(
        `insert into public.appointments
           (tenant_id, branch_id, client_id, starts_at, ends_at, blocks_until, status)
         values ($1, $2, $3, now() + $4::interval, now() + $4::interval + interval '1 hour',
                 now() + $4::interval + interval '1 hour', $5)
         returning id`,
        [s.tenantA, b[0].id, cliente, cuando, estado],
      );
      await c.query(
        `insert into public.appointment_services
           (tenant_id, appointment_id, service_id, duration_minutes, position)
         values ($1, $2, $3, 60, 0)`,
        [s.tenantA, rows[0].id, sv[0].id],
      );
      await c.query("commit");
    };

    await turno(id("Lejana"), "-80 days", "attended");
    await turno(id("Vuelve"), "-79 days", "attended");
    await turno(id("Vuelve"), "7 days", "confirmed");
    await turno(id("Reciente"), "-10 days", "attended");
  });
});

afterAll(async () => {
  await teardownScenario(s);
  await pool.end();
});

describe("clientes para recuperar", () => {
  it("lists only who has not come back and has nothing booked", async () => {
    await asUser(s.owner, async (c) => {
      const { rows } = await c.query(
        `select first_name, ultimo_servicio, visitas
         from public.clientes_para_recuperar($1, 45)`,
        [s.tenantA],
      );
      expect(rows).toEqual([{ first_name: "Lejana", ultimo_servicio: "Limpieza", visitas: 1 }]);
    });
  });

  it("another business gets nothing, even asking for this one", async () => {
    await asUser(s.intruder, async (c) => {
      const { rows } = await c.query(
        `select id from public.clientes_para_recuperar($1, 30)`,
        [s.tenantA],
      );
      expect(rows).toHaveLength(0);
    });
  });

  it("a visitor without an account cannot call it", async () => {
    await asAdmin(async (c) => {
      const { rows } = await c.query(
        `select has_function_privilege('anon',
           'public.clientes_para_recuperar(uuid, integer)', 'execute') as puede`,
      );
      expect(rows[0].puede).toBe(false);
    });
  });
});
