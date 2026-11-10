-- ============================================================================
-- Dlay Agenda · Los avisos salen a tiempo
--
-- Tres cosas que se vieron con la primera cuenta real:
--
-- 1. AVISOS QUE LLEGABAN DESPUÉS DEL TURNO. Una regla de «2 horas antes» con
--    la franja del negocio de 18 a 22 corría todos los avisos a las 18:00,
--    también los de turnos de la mañana: «nos vemos a las 10:30» llegaba a
--    las seis de la tarde. Ahora el planificador no programa un aviso previo
--    que, corrido por la franja, caería con el turno empezado (o, si habla de
--    mañana o de la semana, el mismo día del turno): nace salteado y con el
--    motivo. Y el emisor, como red, no manda un aviso previo de un turno que
--    ya empezó.
--
-- 2. LA FRANJA DEL NEGOCIO NO MANDABA. Las dos reglas de fábrica nacían con
--    su propia franja, de 9 a 20, que le gana a la del negocio. La pantalla
--    decía «fuera de esta franja no sale ningún mensaje» y no era cierto.
--    Se les saca esa franja (sólo si sigue siendo la de fábrica) y las
--    cuentas nuevas nacen sin ella. Lo pendiente de esas reglas se borra
--    para que el planificador lo vuelva a programar con la franja correcta
--    en su próxima vuelta, a los cinco minutos: nunca salió, no se pierde
--    nada.
--
-- 3. LOS TURNOS MOVIDOS SE QUEDABAN SIN AVISO. Mover un turno cancelaba sus
--    avisos pendientes, y el cancelado seguía ocupando su lugar (un envío por
--    turno y regla, `dedupe_key`): el planificador ya no podía programar el
--    del horario nuevo. Ahora el cancelado por mudanza libera su lugar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Planificador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.plan_reminders(p_horizon interval DEFAULT '72:00:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_created integer := 0;
  v_rows    integer;
  r         record;
  v_tz      text;
  v_start   time;
  v_end     time;
  v_rate    bigint;
begin
  for r in
    select rr.*, t.timezone,
           ms.quiet_start, ms.quiet_end,
           ms.whatsapp_utility_cents, ms.whatsapp_marketing_cents,
           ms.sending_enabled
    from public.reminder_rules rr
    join public.tenants t on t.id = rr.tenant_id
    left join public.messaging_settings ms on ms.tenant_id = rr.tenant_id
    where rr.enabled and t.status = 'active'
  loop
    -- Si la estética tiene los envíos frenados, no se planifica nada. Frenar
    -- es frenar: si la cola se siguiera llenando, al despausar saldría todo
    -- junto de golpe, que es justo lo que provoca un bloqueo.
    if coalesce(r.sending_enabled, true) is false then
      continue;
    end if;

    v_tz    := r.timezone;
    v_start := coalesce(r.send_window_start, r.quiet_start, '09:00'::time);
    v_end   := coalesce(r.send_window_end,   r.quiet_end,   '21:00'::time);

    if r.trigger in ('before_appointment', 'after_appointment') then
      with candidatos as (
        select
          a.id as appointment_id,
          a.client_id,
          a.starts_at,
          -- Si el turno se cargó tarde, el momento del aviso ya pasó. Sale
          -- ahora, no en un instante del pasado.
          greatest(
            a.starts_at + make_interval(mins => r.offset_minutes), now()
          ) as cuando
        from public.appointments a
        where a.tenant_id = r.tenant_id
          and a.status = any (r.statuses)
          and (
            cardinality(r.service_ids) = 0
            or exists (
              select 1 from public.appointment_services aps
              where aps.appointment_id = a.id
                and aps.service_id = any (r.service_ids)
            )
          )
          -- Sólo a quien ya faltó alguna vez, si la regla lo pide.
          and (
            not r.only_if_missed
            or exists (
              select 1 from public.appointments prev
              where prev.client_id = a.client_id
                and prev.status = 'no_show'
            )
          )
          and a.starts_at > now()
          and (
            -- El caso normal: el momento del aviso todavía no llegó.
            (a.starts_at + make_interval(mins => r.offset_minutes))
              between now() and now() + p_horizon

            -- O el turno se cargó tarde. Sin esto, quien saca turno para
            -- mañana a la tarde no recibe NINGÚN recordatorio, porque el
            -- momento del aviso —24 horas antes— ya pasó cuando se cargó.
            --
            -- Dos límites, y los dos importan:
            --
            --   · Sólo avisos previos. Un «gracias por venir» atrasado no
            --     tiene sentido.
            --   · Sólo si el turno es para OTRO DÍA. El recordatorio dice
            --     «mañana»: mandarlo un rato antes del turno de hoy sería
            --     mentira, y avisarle a alguien que ya está saliendo de su
            --     casa no le sirve para nada.
            or (
              r.catch_up
              and r.trigger = 'before_appointment'
              and (a.starts_at + make_interval(mins => r.offset_minutes)) < now()
              and (a.starts_at at time zone v_tz)::date
                  > (now() at time zone v_tz)::date
            )
          )
      )
      insert into public.message_jobs (
        tenant_id, rule_id, client_id, appointment_id,
        channel, template_id, scheduled_for, status, cost_cents,
        skip_reason, dedupe_key
      )
      select
        r.tenant_id, r.id, c.client_id, c.appointment_id,
        ch.canal,
        rt.template_id,
        s.sale,
        (case when ch.canal is null or s.tarde then 'skipped' else 'pending' end)::public.job_status,
        case
          -- `is distinct from` y no `<>`: cuando no hay canal resuelto el
          -- valor es NULL, la comparación normal da NULL en vez de verdadero,
          -- y el envío salteado terminaba cargando la tarifa de WhatsApp.
          when ch.canal is distinct from 'whatsapp' or s.tarde then 0
          when tpl.category = 'marketing'
            then coalesce(r.whatsapp_marketing_cents, 8956)
          else coalesce(r.whatsapp_utility_cents, 3768)
        end,
        case
          when ch.canal is null
            then 'Esta persona no tiene ningún canal disponible para esta regla.'
          when s.tarde
            then 'Con el horario de envío, el aviso llegaba tarde para este turno.'
        end,
        r.id::text || ':' || c.appointment_id::text
      from candidatos c
      cross join lateral (
        select app.shift_into_window(c.cuando, v_tz, v_start, v_end) as sale
      ) s0
      -- Un aviso previo no puede salir cuando el turno ya empezó: «faltan dos
      -- horas» a las seis de la tarde, por un turno de las diez de la mañana.
      -- Y el que habla de «mañana» o de la semana tampoco puede salir el
      -- mismo día del turno. Pasa cuando la franja de envío corre el aviso
      -- para después.
      cross join lateral (
        select s0.sale,
               r.trigger = 'before_appointment' and (
                 s0.sale >= c.starts_at
                 or (r.offset_minutes <= -1440
                     and (s0.sale at time zone v_tz)::date
                         >= (c.starts_at at time zone v_tz)::date)
               ) as tarde
      ) s
      cross join lateral (
        select app.resolve_channel(c.client_id, r.channel_order) as canal
      ) ch
      left join public.rule_templates rt
        on rt.rule_id = r.id and rt.channel = ch.canal
      left join public.message_templates tpl on tpl.id = rt.template_id
      on conflict (tenant_id, dedupe_key) do nothing;

    elsif r.trigger = 'birthday' then
      with candidatos as (
        select cl.id as client_id,
               (date_trunc('day', (now() at time zone v_tz))
                 + make_interval(mins => r.offset_minutes)) at time zone v_tz as cuando
        from public.clients cl
        where cl.tenant_id = r.tenant_id
          and cl.is_active
          and cl.birthdate is not null
          and to_char(cl.birthdate, 'MM-DD')
              = to_char((now() at time zone v_tz)::date, 'MM-DD')
      )
      insert into public.message_jobs (
        tenant_id, rule_id, client_id, channel, template_id,
        scheduled_for, status, cost_cents, skip_reason, dedupe_key
      )
      select
        r.tenant_id, r.id, c.client_id, ch.canal, rt.template_id,
        app.shift_into_window(c.cuando, v_tz, v_start, v_end),
        (case when ch.canal is null then 'skipped' else 'pending' end)::public.job_status,
        case
          -- `is distinct from` y no `<>`: cuando no hay canal resuelto el
          -- valor es NULL, la comparación normal da NULL en vez de verdadero,
          -- y el envío salteado terminaba cargando la tarifa de WhatsApp.
          when ch.canal is distinct from 'whatsapp' then 0
          when tpl.category = 'marketing'
            then coalesce(r.whatsapp_marketing_cents, 8956)
          else coalesce(r.whatsapp_utility_cents, 3768)
        end,
        case when ch.canal is null
          then 'Esta persona no tiene ningún canal disponible para esta regla.'
        end,
        r.id::text || ':' || c.client_id::text || ':'
          || to_char((now() at time zone v_tz)::date, 'YYYY')
      from candidatos c
      cross join lateral (
        select app.resolve_channel(c.client_id, r.channel_order) as canal
      ) ch
      left join public.rule_templates rt
        on rt.rule_id = r.id and rt.channel = ch.canal
      left join public.message_templates tpl on tpl.id = rt.template_id
      on conflict (tenant_id, dedupe_key) do nothing;

    elsif r.trigger = 'no_activity' then
      -- Reactivación: hace mucho que no viene y no tiene nada agendado.
      with candidatos as (
        select cl.id as client_id, now() as cuando
        from public.clients cl
        where cl.tenant_id = r.tenant_id
          and cl.is_active
          and not exists (
            select 1 from public.appointments a
            where a.client_id = cl.id
              and a.status not in ('cancelled', 'no_show')
              and a.starts_at > now() - make_interval(mins => r.offset_minutes)
          )
          and exists (
            select 1 from public.appointments a
            where a.client_id = cl.id and a.status = 'attended'
          )
      )
      insert into public.message_jobs (
        tenant_id, rule_id, client_id, channel, template_id,
        scheduled_for, status, cost_cents, skip_reason, dedupe_key
      )
      select
        r.tenant_id, r.id, c.client_id, ch.canal, rt.template_id,
        app.shift_into_window(c.cuando, v_tz, v_start, v_end),
        (case when ch.canal is null then 'skipped' else 'pending' end)::public.job_status,
        case
          -- `is distinct from` y no `<>`: cuando no hay canal resuelto el
          -- valor es NULL, la comparación normal da NULL en vez de verdadero,
          -- y el envío salteado terminaba cargando la tarifa de WhatsApp.
          when ch.canal is distinct from 'whatsapp' then 0
          when tpl.category = 'marketing'
            then coalesce(r.whatsapp_marketing_cents, 8956)
          else coalesce(r.whatsapp_utility_cents, 3768)
        end,
        case when ch.canal is null
          then 'Esta persona no tiene ningún canal disponible para esta regla.'
        end,
        -- Como mucho una vez por mes por persona.
        r.id::text || ':' || c.client_id::text || ':'
          || to_char((now() at time zone v_tz)::date, 'YYYY-MM')
      from candidatos c
      cross join lateral (
        select app.resolve_channel(c.client_id, r.channel_order) as canal
      ) ch
      left join public.rule_templates rt
        on rt.rule_id = r.id and rt.channel = ch.canal
      left join public.message_templates tpl on tpl.id = rt.template_id
      on conflict (tenant_id, dedupe_key) do nothing;
    end if;

    get diagnostics v_rows = row_count;
    v_created := v_created + v_rows;
  end loop;

  return v_created;
end;
$function$
;

-- ---------------------------------------------------------------------------
-- 1. Emisor. La función es la de 20261023100000_tope_sin_pruebas.sql con la
--    red de seguridad agregada.
-- ---------------------------------------------------------------------------
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

    -- Un aviso previo cuyo turno ya empezó, o ya no está en pie, no sale:
    -- llegaría tarde. Cubre lo que se planificó antes de que el planificador
    -- lo supiera evitar.
    if exists (
      select 1
      from public.reminder_rules r
      join public.appointments a on a.id = j.appointment_id
      where r.id = j.rule_id
        and r.trigger = 'before_appointment'
        and (a.starts_at <= now() or a.status not in ('pending', 'confirmed'))
    ) then
      update public.message_jobs
      set status = 'skipped',
          skip_reason = 'El turno ya había empezado o no seguía en pie.'
      where id = j.id;
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

-- ---------------------------------------------------------------------------
-- 2. La franja del negocio vale para los avisos de fábrica
-- ---------------------------------------------------------------------------
-- Primero lo pendiente, mientras todavía se reconoce qué reglas cambian.
delete from public.message_jobs j
using public.reminder_rules r
where r.id = j.rule_id
  and j.status = 'pending'
  and r.trigger = 'before_appointment'
  and r.offset_minutes in (-1440, -10080)
  and r.send_window_start = '09:00'
  and r.send_window_end = '20:00';

update public.reminder_rules
set send_window_start = null,
    send_window_end = null
where trigger = 'before_appointment'
  and offset_minutes in (-1440, -10080)
  and send_window_start = '09:00'
  and send_window_end = '20:00';

create or replace function app.seed_messaging(p_tenant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_regla uuid;
begin
  -- La guarda mira las REGLAS y no las plantillas. Un negocio con plantillas
  -- sueltas y ninguna regla es precisamente el que no funciona: mirando las
  -- plantillas lo saltearíamos y lo dejaríamos roto para siempre.
  if exists (select 1 from public.reminder_rules where tenant_id = p_tenant)
  then
    return;
  end if;

  -- =========================================================================
  -- 1. El recordatorio del día anterior. La única encendida.
  -- =========================================================================
  insert into public.reminder_rules (
    tenant_id, name, enabled, trigger, offset_minutes,
    channel_order
  )
  values (
    p_tenant, 'Recordatorio del día anterior', true, 'before_appointment',
    -1440, '{whatsapp}'
  )
  returning id into v_regla;

  insert into public.message_templates
      (tenant_id, name, channel, category, subject, body,
       provider_name, quick_replies)
    values
      (p_tenant, 'Recordatorio del día anterior · WhatsApp', 'whatsapp',
       'utility', null,
       E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte tu '
       || E'turno de mañana {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
       || E'Para confirmar el turno o avisarnos que no vas a venir: {{link}}\n\n'
       || E'¡Te esperamos!',
       'recordatorio_dia_anterior', '{confirmar,cancelar,reprogramar}')
  -- Si alguna ya existía con ese nombre, se respeta la que está.
  on conflict do nothing;

  insert into public.rule_templates (rule_id, channel, template_id, tenant_id)
  select v_regla, m.channel, m.id, p_tenant
  from public.message_templates m
  where m.tenant_id = p_tenant
    and m.name = 'Recordatorio del día anterior · WhatsApp'
  on conflict do nothing;

  -- =========================================================================
  -- 2. El aviso de la semana. Apagada.
  --
  -- Es justo lo que el sistema anterior no podía hacer: avisar de un turno
  -- que está a más de una semana. Nace apagada porque duplica los mensajes
  -- por turno, y esa es una decisión de plata que le toca a cada negocio.
  -- =========================================================================
  insert into public.reminder_rules (
    tenant_id, name, enabled, trigger, offset_minutes,
    channel_order
  )
  values (
    p_tenant, 'Aviso una semana antes', false, 'before_appointment',
    -10080, '{whatsapp}'
  )
  returning id into v_regla;

  insert into public.message_templates
      (tenant_id, name, channel, category, subject, body,
       provider_name, quick_replies)
    values
      (p_tenant, 'Aviso una semana antes · WhatsApp', 'whatsapp',
       'utility', null,
       E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte '
       || E'que tenés turno el {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
       || E'Si ya sabés que no vas a poder, avisanos desde acá así le damos el '
       || E'lugar a otra persona: {{link}}\n\n¡Gracias!',
       'aviso_una_semana_antes', '{confirmar,cancelar,reprogramar}')
  on conflict do nothing;

  insert into public.rule_templates (rule_id, channel, template_id, tenant_id)
  select v_regla, m.channel, m.id, p_tenant
  from public.message_templates m
  where m.tenant_id = p_tenant
    and m.name = 'Aviso una semana antes · WhatsApp'
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Mover un turno libera el lugar de sus avisos
-- ---------------------------------------------------------------------------
create or replace function app.cancel_jobs_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('cancelled', 'no_show')
     or new.starts_at is distinct from old.starts_at then
    update public.message_jobs
    set status = 'cancelled',
        skip_reason = case
          when new.status = 'cancelled' then 'El turno se canceló.'
          when new.status = 'no_show'   then 'El cliente no vino.'
          else 'El turno se movió de horario.'
        end,
        -- Si se movió y sigue en pie, el planificador tiene que poder
        -- programar el aviso del horario nuevo: el cancelado deja libre su
        -- lugar. Si se canceló, el lugar queda ocupado a propósito.
        dedupe_key = case
          when new.status in ('cancelled', 'no_show') then dedupe_key
          else dedupe_key || ':movido:' || id::text
        end
    where appointment_id = new.id
      and status = 'pending';
  end if;

  return new;
end;
$$;

-- Los que ya quedaron trabados así: el planificador los repone si el turno
-- sigue en pie y todavía está a tiempo.
update public.message_jobs
set dedupe_key = dedupe_key || ':movido:' || id::text
where status = 'cancelled'
  and skip_reason = 'El turno se movió de horario.'
  and dedupe_key not like '%:movido:%';
