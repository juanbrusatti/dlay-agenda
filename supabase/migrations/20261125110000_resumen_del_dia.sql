-- ============================================================================
-- Dlay Agenda · The day's summary on the phone
--
-- Every morning at 8, local time of each business, the team gets one
-- notification: how many appointments today, how many still unconfirmed, and
-- when the first one is. Tapping it opens the agenda.
--
-- It rides on the team alerts that already exist (the queue the dispatcher
-- drains every minute), so nothing new is sent from anywhere else. It goes
-- out only when:
--   - someone on the team turned notifications on (otherwise there is
--     nobody to send it to, and nothing is queued);
--   - there is at least one appointment that day (no «0 turnos» noise);
--   - the account is active and not paused for payment;
--   - it was not already queued today (one per business and day, even if
--     the job runs twice).
--
-- Additive only: one function and one hourly job.
-- ============================================================================

create or replace function app.resumen_del_dia()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t            record;
  v_hoy        date;
  v_desde      timestamptz;
  v_hasta      timestamptz;
  v_total      integer;
  v_sin        integer;
  v_primero    timestamptz;
  v_tag        text;
  v_cuerpo     text;
  v_n          integer := 0;
begin
  for t in
    select tn.id, tn.timezone
    from public.tenants tn
    left join public.billing_settings bs on bs.tenant_id = tn.id
    where tn.status = 'active'
      and coalesce(bs.suspendida_por_pago, false) = false
      -- 8 in the morning where the business is.
      and extract(hour from now() at time zone tn.timezone) = 8
      and exists (
        select 1 from public.push_subscriptions ps
        where ps.tenant_id = tn.id and ps.user_id is not null
      )
  loop
    v_hoy   := (now() at time zone t.timezone)::date;
    v_tag   := 'resumen-' || v_hoy::text;

    continue when exists (
      select 1 from public.team_alerts a
      where a.tenant_id = t.id and a.tag = v_tag
    );

    v_desde := v_hoy::timestamp at time zone t.timezone;
    v_hasta := (v_hoy + 1)::timestamp at time zone t.timezone;

    select count(*),
           count(*) filter (where a.status = 'pending'),
           min(a.starts_at)
      into v_total, v_sin, v_primero
    from public.appointments a
    where a.tenant_id = t.id
      and a.starts_at >= v_desde
      and a.starts_at <  v_hasta
      and a.status <> 'cancelled';

    continue when v_total = 0;

    v_cuerpo :=
      case when v_total = 1 then 'Tenés 1 turno'
           else 'Tenés ' || v_total || ' turnos' end
      || case
           when v_sin = 0 and v_total = 1 then ', confirmado'
           when v_sin = 0 then ', todos confirmados'
           when v_sin = v_total and v_total = 1 then ', sin confirmar'
           when v_sin = v_total then ', ninguno confirmado todavía'
           when v_sin = 1 then ' y 1 está sin confirmar'
           else ' y ' || v_sin || ' están sin confirmar'
         end
      || '. '
      || case when v_total = 1 then 'Es a las ' else 'El primero es a las ' end
      || to_char(v_primero at time zone t.timezone, 'HH24:MI') || '.';

    insert into public.team_alerts (tenant_id, kind, title, body, url, tag)
    values (t.id, 'resumen', 'Tu día de hoy', v_cuerpo, '/agenda', v_tag);

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

revoke all on function app.resumen_del_dia() from public, anon, authenticated;

comment on function app.resumen_del_dia() is
  'Queues the morning summary for each business whose local time is 8. Run hourly.';

-- Every hour, a few minutes past: each business gets it when it is 8 where
-- it is, whatever its time zone.
select cron.schedule(
  'dlay-resumen-del-dia',
  '3 * * * *',
  $$select app.resumen_del_dia()$$
);
