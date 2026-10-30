-- ============================================================================
-- Dlay Agenda · Auditoría desde el panel de Dlay
--
-- Una sola función de lectura que junta, por negocio, cómo van sus envíos,
-- cuánto lo usan y quién es; y, para todo Dlay, cuánto ocupa la base.
--
-- No registra nada nuevo: lee lo que las tablas ya guardan. Se calcula sólo
-- cuando alguien abre el panel, y mira ventanas cortas (24 horas, 7 días)
-- por los índices que ya existen, así que no carga la base mientras nadie
-- mira.
--
-- Además, una limpieza diaria de lo que crece sin que nadie lo lea: el
-- historial del planificador de tareas y la bitácora de cambios vieja.
-- ============================================================================

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
              'ultimo_ingreso', u.last_sign_in_at
            )
            from public.memberships m
            join auth.users u on u.id = m.user_id
            left join public.profiles p on p.id = m.user_id
            where m.tenant_id = t.id and m.role = 'owner'
            order by m.created_at
            limit 1
          ) as titular,
          (
            select max(u.last_sign_in_at)
            from public.memberships m
            join auth.users u on u.id = m.user_id
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

comment on function public.platform_auditoria() is
  'Salud de envíos, uso y datos de contacto de cada negocio, y tamaño de la '
  'base. Sólo lectura, sólo para platform_admins.';

revoke all on function public.platform_auditoria() from public, anon;
grant execute on function public.platform_auditoria() to authenticated;

-- ---------------------------------------------------------------------------
-- Limpieza diaria
-- ---------------------------------------------------------------------------
-- El planificador guarda cada ejecución del emisor, una por minuto, y nunca
-- borra nada: a fines de octubre ya eran más de 80.000 filas. Una semana
-- alcanza para ver si algo falló. La bitácora de cambios no la lee nada del
-- sistema; seis meses dan de sobra para revisar qué pasó con un turno.
create or replace function app.limpiar_registros()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cron  integer;
  v_audit integer;
begin
  delete from cron.job_run_details
  where end_time < now() - interval '7 days';
  get diagnostics v_cron = row_count;

  delete from public.audit_log
  where created_at < now() - interval '180 days';
  get diagnostics v_audit = row_count;

  return jsonb_build_object('planificador', v_cron, 'bitacora', v_audit);
end;
$$;

revoke all on function app.limpiar_registros() from public, anon, authenticated;

-- 05:30 de Córdoba: lejos del respaldo (04:00) y de cualquier turno.
select cron.schedule(
  'dlay-limpieza',
  '30 8 * * *',
  $$select app.limpiar_registros()$$
);
