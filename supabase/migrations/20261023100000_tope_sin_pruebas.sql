-- ============================================================================
-- Dlay Agenda · Los avisos de prueba no cuentan para el tope por cliente
--
-- En modo de prueba los avisos se marcan como enviados aunque no le llega
-- nada a nadie, y el tope por cliente los contaba igual. Una cuenta que
-- probaba los avisos un rato y después salía del modo de prueba se
-- encontraba con los primeros recordatorios reales salteados por «tope
-- alcanzado», durante hasta una semana. El tope del mes ya los dejaba afuera;
-- ahora el diario y el semanal también.
--
-- La función es la de 20260916160000_emisor_trabado.sql, con ese único cambio.
-- ============================================================================

create or replace function app.claim_due_jobs(p_limit integer default 20)
returns setof public.message_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  j        public.message_jobs;
  v_day    integer;
  v_week   integer;
  v_max_d  integer;
  v_max_w  integer;
  v_on     boolean;
  v_budget bigint;
  v_tz     text;
  v_spent  bigint;
begin
  for j in
    update public.message_jobs m
    set status = 'sending', attempts = m.attempts + 1
    where m.id in (
      select id from public.message_jobs
      where channel is not null
        and (
          (status = 'pending' and scheduled_for <= now())
          -- Tomado y nunca cerrado: el emisor se cayó en el medio.
          or (status = 'sending' and updated_at < now() - interval '10 minutes'
              and attempts < 5)
        )
      order by scheduled_for
      for update skip locked
      limit p_limit
    )
    returning m.*
  loop
    select coalesce(ms.sending_enabled, true),
           coalesce(ms.max_per_client_per_day, 2),
           coalesce(ms.max_per_client_per_week, 5),
           ms.monthly_budget_cents,
           t.timezone
      into v_on, v_max_d, v_max_w, v_budget, v_tz
    from public.tenants t
    left join public.messaging_settings ms on ms.tenant_id = t.id
    where t.id = j.tenant_id;

    if not v_on then
      update public.message_jobs set status = 'pending' where id = j.id;
      continue;
    end if;

    select count(*) into v_day
    from public.message_jobs m
    where m.client_id = j.client_id
      and m.status = 'sent'
      and not m.was_test
      and m.sent_at > now() - interval '24 hours';

    select count(*) into v_week
    from public.message_jobs m
    where m.client_id = j.client_id
      and m.status = 'sent'
      and not m.was_test
      and m.sent_at > now() - interval '7 days';

    if v_day >= v_max_d or v_week >= v_max_w then
      update public.message_jobs
      set status = 'skipped',
          skip_reason = format(
            'Tope alcanzado: ya recibió %s mensaje(s) hoy y %s esta semana.',
            v_day, v_week
          )
      where id = j.id;
      continue;
    end if;

    if v_budget is not null and coalesce(j.cost_cents, 0) > 0 then
      select coalesce(sum(m.cost_cents), 0) into v_spent
      from public.message_jobs m
      where m.tenant_id = j.tenant_id
        and m.status = 'sent'
        and not m.was_test
        and m.sent_at >= (
          date_trunc('month', (now() at time zone coalesce(v_tz, 'UTC')))
        ) at time zone coalesce(v_tz, 'UTC');

      if v_spent + j.cost_cents > v_budget then
        update public.message_jobs
        set status = 'skipped',
            skip_reason = format(
              'Tope del mes alcanzado: van $ %s de $ %s.',
              round(v_spent / 100.0, 2), round(v_budget / 100.0, 2)
            )
        where id = j.id;
        continue;
      end if;
    end if;

    return next j;
  end loop;
end;
$$;
