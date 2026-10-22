-- ============================================================================
-- Dlay Agenda · Cada negocio elige qué botones tiene el enlace del turno
--
-- El enlace que llega con el recordatorio ofrecía siempre lo mismo: confirmar,
-- cambiar el horario y cancelar. No todos los negocios aceptan las tres: hay
-- quien no mueve turnos y quien quiere que las cancelaciones se hablen.
--
-- Son tres interruptores en booking_settings, prendidos por defecto para que
-- nadie note un cambio. No es sólo esconder el botón: cada función que hace
-- la acción también lo pregunta, porque el enlace es público y cualquiera
-- puede llamar a la función sin pasar por la pantalla.
--
-- Las funciones se reescriben desde su última versión (autogestión y
-- lenguaje), con el chequeo agregado y nada más.
-- ============================================================================

alter table public.booking_settings
  add column link_confirm    boolean not null default true,
  add column link_cancel     boolean not null default true,
  add column link_reschedule boolean not null default true;

comment on column public.booking_settings.link_confirm is
  'Si el enlace del turno muestra «Confirmar que voy».';
comment on column public.booking_settings.link_cancel is
  'Si el enlace del turno deja cancelar.';
comment on column public.booking_settings.link_reschedule is
  'Si el enlace del turno deja cambiar el día o el horario.';

-- Un negocio sin fila de ajustes tiene los tres prendidos, igual que el
-- valor por defecto de la columna.
create function app.link_permite(p_tenant uuid)
returns table (confirmar boolean, cancelar boolean, reprogramar boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bs.link_confirm, true),
         coalesce(bs.link_cancel, true),
         coalesce(bs.link_reschedule, true)
  from (select 1) uno
  left join public.booking_settings bs on bs.tenant_id = p_tenant;
$$;

revoke all on function app.link_permite(uuid) from public, anon, authenticated;

create or replace function public.booking_manage(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c           record;
  v_corte     timestamptz;
  v_puede     boolean;
  v_cancelar  boolean;
  v_mover     boolean;
  v_motivo    text := null;
  p           record;
begin
  select * into c from app.manage_context(p_token);

  -- Un token inventado y uno de una estética dada de baja dan lo mismo.
  if c.appointment_id is null then
    return jsonb_build_object('ok', false,
      'error', 'No encontramos este turno. Puede que el enlace esté viejo.');
  end if;

  v_corte := c.starts_at - make_interval(hours => c.cancel_min_hours);
  v_puede := c.self_manage and c.status in ('pending', 'confirmed');

  select * into p from app.link_permite(c.tenant_id);

  v_cancelar := v_puede and now() < v_corte;
  v_mover    := v_cancelar and c.rescheduled < c.max_reschedules;

  if c.status = 'cancelled' then
    v_motivo := 'cancelado';
  elsif c.status in ('attended', 'no_show') or c.starts_at <= now() then
    v_motivo := 'pasado';
  elsif not c.self_manage then
    v_motivo := 'cerrado';
  elsif not v_cancelar then
    v_motivo := 'tarde';
  elsif not v_mover and p.reprogramar then
    v_motivo := 'limite';
  end if;

  -- Lo que el negocio eligió no mostrar se apaga después del motivo: si no
  -- deja cambiar el horario, «ya no podés moverlo» sería una explicación
  -- falsa. Y si no queda ningún botón, se dice que acá no se hacen cambios.
  v_cancelar := v_cancelar and p.cancelar;
  v_mover    := v_mover and p.reprogramar;
  if v_motivo is null and not v_cancelar and not v_mover
     and not (p.confirmar and c.status = 'pending') then
    v_motivo := 'cerrado';
  end if;

  return jsonb_build_object(
    'ok', true,
    'tenant', jsonb_build_object(
      'name', c.tenant_name,
      'slug', c.slug,
      'timezone', c.timezone,
      'phone', c.contact_phone
    ),
    'appointment', (
      select jsonb_build_object(
        'startsAt', a.starts_at,
        'endsAt',   a.ends_at,
        'status',   a.status,
        'priceCents', case when bs.show_prices then a.price_cents end,
        -- Sólo el nombre de pila, y para que quien abre el enlace reconozca
        -- que es su turno. El apellido y el teléfono no hacen falta.
        'firstName', cl.first_name,
        'services', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'name', coalesce(s.name, 'Servicio'),
                   'minutes', aps.duration_minutes
                 ) order by aps.position)
          from public.appointment_services aps
          left join public.services s on s.id = aps.service_id
          where aps.appointment_id = a.id
        ), '[]'::jsonb)
      )
      from public.appointments a
      left join public.clients cl on cl.id = a.client_id
      left join public.booking_settings bs on bs.tenant_id = a.tenant_id
      where a.id = c.appointment_id
    ),
    'can', jsonb_build_object(
      'confirm',    p.confirmar and v_puede and c.status = 'pending' and c.starts_at > now(),
      'cancel',     v_cancelar,
      'reschedule', v_mover
    ),
    'why', v_motivo,
    -- Para ofrecerle sacar otro turno sólo si la agenda pública está abierta.
    -- Un enlace a una página que va a decirle que no se puede reservar es
    -- peor que no ofrecer nada.
    'bookingOpen', c.booking_open,
    'cancelMinHours', c.cancel_min_hours,
    'reschedulesLeft', greatest(c.max_reschedules - c.rescheduled, 0)
  );
end;
$$;


create or replace function public.booking_manage_slots(
  p_token text,
  p_date  date
)
returns table (slot timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c         record;
  v_ids     uuid[];
  v_minutes integer;
  v_buffer  integer;
begin
  select * into c from app.manage_context(p_token);

  if c.appointment_id is null
     or not (select reprogramar from app.link_permite(c.tenant_id))
     or not c.self_manage
     or c.status not in ('pending', 'confirmed')
     or now() >= c.starts_at - make_interval(hours => c.cancel_min_hours)
     or c.rescheduled >= c.max_reschedules
  then
    return;
  end if;

  if p_date > ((now() at time zone c.timezone)::date + c.max_days_ahead) then
    return;
  end if;

  -- Las duraciones salen del turno, no del servicio: si el servicio cambió de
  -- duración después de agendado, el turno conserva la que tenía.
  select array_agg(aps.service_id),
         coalesce(sum(aps.duration_minutes), 0),
         coalesce(max(aps.buffer_minutes), 0)
    into v_ids, v_minutes, v_buffer
  from public.appointment_services aps
  where aps.appointment_id = c.appointment_id;

  if v_minutes = 0 then
    return;
  end if;

  return query
  select * from app.free_slots(
    c.branch_id, c.timezone, v_ids, p_date,
    v_minutes, v_buffer, c.slot_minutes, c.min_advance_hours,
    -- Se ignora a sí mismo: si no, el turno taparía el horario que ocupa hoy y
    -- no se podría mover media hora más tarde.
    c.appointment_id
  );
end;
$$;


create or replace function public.booking_confirm(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  select * into c from app.manage_context(p_token);

  if c.appointment_id is null then
    return jsonb_build_object('ok', false, 'error', 'No encontramos este turno.');
  end if;

  if not (select confirmar from app.link_permite(c.tenant_id)) then
    return jsonb_build_object('ok', false,
      'error', 'Este negocio no confirma turnos por acá.');
  end if;

  if c.status <> 'pending' or c.starts_at <= now() then
    return jsonb_build_object('ok', false,
      'error', 'Este turno ya no se puede confirmar.');
  end if;

  perform set_config('app.by_client', 'on', true);
  update public.appointments set status = 'confirmed' where id = c.appointment_id;

  return jsonb_build_object('ok', true);
end;
$$;


create or replace function public.booking_cancel(
  p_token  text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c       record;
  v_razon text;
begin
  select * into c from app.manage_context(p_token);

  if c.appointment_id is null then
    return jsonb_build_object('ok', false, 'error', 'No encontramos este turno.');
  end if;

  if not (select cancelar from app.link_permite(c.tenant_id)) then
    return jsonb_build_object('ok', false,
      'error', 'Este negocio prefiere que las cancelaciones se avisen hablando.');
  end if;

  if not c.self_manage then
    return jsonb_build_object('ok', false,
      'error', 'Este negocio prefiere que los cambios se hagan hablando.');
  end if;

  if c.status not in ('pending', 'confirmed') or c.starts_at <= now() then
    return jsonb_build_object('ok', false,
      'error', 'Este turno ya no se puede cancelar.');
  end if;

  if now() >= c.starts_at - make_interval(hours => c.cancel_min_hours) then
    return jsonb_build_object('ok', false, 'late', true,
      'error', format(
        'Faltan menos de %s horas para el turno, así que hay que avisar hablando.',
        c.cancel_min_hours));
  end if;

  -- Queda claro en la agenda quién lo canceló, sin depender de que alguien
  -- recuerde después de qué se trataba.
  v_razon := 'Cancelado por el cliente'
    || case when coalesce(trim(p_reason), '') = '' then ''
            else ': ' || left(trim(p_reason), 200) end;

  perform set_config('app.by_client', 'on', true);
  update public.appointments
  set status        = 'cancelled',
      cancelled_at  = now(),
      cancel_reason = v_razon
  where id = c.appointment_id;

  return jsonb_build_object('ok', true);
end;
$$;


create or replace function public.booking_reschedule(
  p_token     text,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c         record;
  v_minutes integer;
  v_buffer  integer;
  v_antes   timestamptz;
  v_fecha   text;
begin
  select * into c from app.manage_context(p_token);

  if c.appointment_id is null then
    return jsonb_build_object('ok', false, 'error', 'No encontramos este turno.');
  end if;

  if not (select reprogramar from app.link_permite(c.tenant_id)) then
    return jsonb_build_object('ok', false,
      'error', 'Este negocio no cambia horarios por acá.');
  end if;

  if not c.self_manage then
    return jsonb_build_object('ok', false,
      'error', 'Este negocio prefiere que los cambios se hagan hablando.');
  end if;

  if c.status not in ('pending', 'confirmed') or c.starts_at <= now() then
    return jsonb_build_object('ok', false,
      'error', 'Este turno ya no se puede mover.');
  end if;

  if now() >= c.starts_at - make_interval(hours => c.cancel_min_hours) then
    return jsonb_build_object('ok', false, 'late', true,
      'error', format(
        'Faltan menos de %s horas para el turno, así que hay que avisar hablando.',
        c.cancel_min_hours));
  end if;

  if c.rescheduled >= c.max_reschedules then
    return jsonb_build_object('ok', false, 'limit', true,
      'error', 'Ya moviste este turno todas las veces posibles.');
  end if;

  if p_starts_at < now() + make_interval(hours => c.min_advance_hours) then
    return jsonb_build_object('ok', false, 'error', 'Ese horario ya pasó.');
  end if;

  select coalesce(sum(aps.duration_minutes), 0),
         coalesce(max(aps.buffer_minutes), 0)
    into v_minutes, v_buffer
  from public.appointment_services aps
  where aps.appointment_id = c.appointment_id;

  v_antes := c.starts_at;
  v_fecha := to_char(v_antes at time zone c.timezone, 'DD/MM HH24:MI');

  -- Marca la transacción como "esto lo hizo el cliente" para que el aviso al
  -- equipo sepa distinguirlo de un cambio hecho desde el mostrador. Mover un
  -- turno no cambia su estado, así que acá no dispara nada más.
  perform set_config('app.by_client', 'on', true);

  update public.appointments
  set starts_at         = p_starts_at,
      ends_at           = p_starts_at + make_interval(mins => v_minutes),
      blocks_until      = p_starts_at + make_interval(mins => v_minutes + v_buffer),
      rescheduled_count = rescheduled_count + 1
  where id = c.appointment_id;

  -- Mover un turno no cambia su estado, así que el trigger del historial no
  -- escribe nada. Sin esta fila, en la agenda el turno aparecería en otro
  -- horario sin ninguna explicación de por qué.
  insert into public.appointment_status_history (
    tenant_id, appointment_id, from_status, to_status, reason, by_client
  )
  values (
    c.tenant_id, c.appointment_id, c.status, c.status,
    format('Reprogramado por el cliente: venía del %s', v_fecha),
    true
  );

  -- Se fuerza la verificación de cupos acá, que normalmente corre al cerrar la
  -- transacción: si quedara diferida, el error saltaría fuera del manejador de
  -- esta función y el cliente vería un error crudo de base de datos.
  set constraints all immediate;
  -- Y se vuelve a diferir, porque el modo queda fijado para toda la
  -- transacción.
  set constraints all deferred;

  return jsonb_build_object('ok', true);

exception
  when sqlstate '23P01' then
    return jsonb_build_object('ok', false,
      'error', 'Justo alguien tomó ese horario. Elegí otro, por favor.');
  when sqlstate '23514' then
    return jsonb_build_object('ok', false,
      'error', 'Ese horario no es válido para este turno.');
end;
$$;

