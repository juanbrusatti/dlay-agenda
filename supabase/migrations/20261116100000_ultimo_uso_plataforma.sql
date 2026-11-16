-- ============================================================================
-- Dlay Agenda · Platform panel: last activity instead of last sign-in
--
-- The health page showed `auth.users.last_sign_in_at` as «Último ingreso».
-- That column only moves when someone types their email and password. The
-- app keeps the session alive by refreshing its token in the background, so
-- an owner who works every day looked inactive for weeks, and fell into the
-- «En prueba y quietos» summary by mistake.
--
-- The last activity is the latest of that sign-in and the last time any of
-- the user's sessions was refreshed (`auth.sessions.updated_at`), which
-- happens while the app is in use. Read-only: nothing new is recorded.
-- ============================================================================

create or replace function app.ultimo_uso(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    (select u.last_sign_in_at from auth.users u where u.id = p_user),
    (select max(s.updated_at) from auth.sessions s where s.user_id = p_user)
  );
$$;

comment on function app.ultimo_uso(uuid) is
  'Last time the user used the app: sign-in or session refresh.';

revoke all on function app.ultimo_uso(uuid) from public, anon, authenticated;

-- Same function as 20261031100000_auditoria_plataforma.sql, with both
-- «último ingreso» values taken from app.ultimo_uso().
create or replace function public.platform_auditoria()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ahora timestamptz := now();
begin
  if not (select app.is_platform_admin()) then
    raise exception 'Esto es del panel de Dlay.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generado', v_ahora,

    'base', jsonb_build_object(
      'bytes', pg_database_size(current_database()),
      -- Lo que da el plan gratis de Supabase.
      'limite_bytes', 500 * 1024 * 1024,
      'tablas', (
        select coalesce(jsonb_agg(x order by x.bytes desc), '[]'::jsonb)
        from (
          select n.nspname || '.' || c.relname as nombre,
                 pg_total_relation_size(c.oid) as bytes
          from pg_catalog.pg_class c
          join pg_catalog.pg_namespace n on n.oid = c.relnamespace
          where c.relkind = 'r'
            and n.nspname in ('public', 'cron', 'auth', 'storage', 'net')
          order by pg_total_relation_size(c.oid) desc
          limit 6
        ) x
      )
    ),

    'negocios', coalesce((
      select jsonb_agg(n order by n.nombre)
      from (
        select
          t.id   as tenant_id,
          t.name as nombre,
          t.slug,
          t.status,
          t.created_at as creado,
          app.estado_suscripcion(t.id) as suscripcion,

          -- Quién es.
          (
            select jsonb_build_object(
              'nombre', p.full_name,
              'correo', u.email,
              -- Key kept for the panel; it now holds the last activity.
              'ultimo_ingreso', app.ultimo_uso(u.id)
            )
            from public.memberships m
            join auth.users u on u.id = m.user_id
            left join public.profiles p on p.id = m.user_id
            where m.tenant_id = t.id and m.role = 'owner'
            order by m.created_at
            limit 1
          ) as titular,
          (
            select max(app.ultimo_uso(m.user_id))
            from public.memberships m
            where m.tenant_id = t.id
          ) as ultimo_ingreso_equipo,
          coalesce(
            (select nullif(bs.contact_phone, '') from public.booking_settings bs where bs.tenant_id = t.id),
            (select nullif(b.phone, '') from public.branches b where b.tenant_id = t.id and b.is_default)
          ) as telefono,

          -- Su WhatsApp.
          (
            select jsonb_build_object(
              'status', s.status,
              'numero', s.phone_number,
              'vinculado', s.linked_at,
              'ultimo_mensaje', s.last_message_sent_at,
              'error', s.error_message
            )
            from public.baileys_sessions s
            where s.tenant_id = t.id
          ) as whatsapp,

          -- Cómo van sus envíos. Se cuentan por la hora en que tocaba salir,
          -- que es lo que indexa `message_jobs_tenant_idx`.
          (
            select jsonb_build_object(
              'enviados_24h',  count(*) filter (where j.status = 'sent'    and j.scheduled_for > v_ahora - interval '24 hours'),
              'fallidos_24h',  count(*) filter (where j.status = 'failed'  and j.scheduled_for > v_ahora - interval '24 hours'),
              'salteados_24h', count(*) filter (where j.status = 'skipped' and j.scheduled_for > v_ahora - interval '24 hours'),
              'enviados_7d',   count(*) filter (where j.status = 'sent'),
              'fallidos_7d',   count(*) filter (where j.status = 'failed'),
              'salteados_7d',  count(*) filter (where j.status = 'skipped')
            )
            from public.message_jobs j
            where j.tenant_id = t.id
              and j.scheduled_for > v_ahora - interval '7 days'
              and j.scheduled_for <= v_ahora
          ) as envios,
          (
            -- Ya tendrían que haber salido y siguen en la cola: algo se trabó.
            select count(*)
            from public.message_jobs j
            where j.tenant_id = t.id
              and j.status in ('pending', 'sending')
              and j.scheduled_for < v_ahora - interval '15 minutes'
              and j.scheduled_for > v_ahora - interval '7 days'
          ) as trabados,
          (
            select count(*)
            from public.message_jobs j
            where j.tenant_id = t.id
              and j.status = 'pending'
              and j.scheduled_for > v_ahora
          ) as en_cola,
          (
            select jsonb_build_object('motivo', j.skip_reason, 'veces', count(*))
            from public.message_jobs j
            where j.tenant_id = t.id
              and j.status = 'skipped'
              and j.scheduled_for > v_ahora - interval '7 days'
              and j.scheduled_for <= v_ahora
            group by j.skip_reason
            order by count(*) desc
            limit 1
          ) as motivo_salteo,
          (
            select coalesce(jsonb_agg(e order by e.cuando desc), '[]'::jsonb)
            from (
              select j.scheduled_for as cuando, j.last_error as error
              from public.message_jobs j
              where j.tenant_id = t.id
                and j.status = 'failed'
                and j.scheduled_for > v_ahora - interval '7 days'
              order by j.scheduled_for desc
              limit 3
            ) e
          ) as ultimos_errores,

          -- Cuánto lo usan.
          (select count(*) from public.clients c where c.tenant_id = t.id) as clientes,
          (
            select count(*)
            from public.appointments a
            where a.tenant_id = t.id
              and a.created_at > v_ahora - interval '7 days'
          ) as turnos_cargados_7d,
          (
            select count(*)
            from public.appointments a
            where a.tenant_id = t.id
              and a.starts_at > v_ahora
              and a.status in ('pending', 'confirmed')
          ) as turnos_proximos,
          (
            select max(a.created_at)
            from public.appointments a
            where a.tenant_id = t.id
          ) as ultimo_turno_cargado
        from public.tenants t
      ) n
    ), '[]'::jsonb)
  );
end;
$$;

