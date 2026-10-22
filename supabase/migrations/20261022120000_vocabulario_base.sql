-- ============================================================================
-- Dlay Agenda · Tres mensajes que todavía hablaban en femenino
--
-- Se colaron antes de que se fijara el vocabulario: «cliente», «titular» y
-- «tu negocio», nunca «clienta», «dueña» ni «estética». Uno se ve en Avisos
-- (el motivo de un envío cancelado) y los otros dos son errores que puede
-- leer quien usa el panel.
--
-- Las funciones salen de producción tal como están hoy
-- (pg_get_functiondef), con sólo el texto cambiado.
-- ============================================================================

CREATE OR REPLACE FUNCTION app.guard_last_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := coalesce(old.tenant_id, new.tenant_id);
  v_owners integer;
begin
  -- Si la estética entera se está borrando, el borrado en cascada de sus
  -- membresías es esperado y no hay nada que proteger. La fila padre ya no
  -- existe cuando corre la cascada, así que alcanza con preguntar por ella.
  if not exists (select 1 from public.tenants t where t.id = v_tenant) then
    return coalesce(new, old);
  end if;

  -- Sólo interesa cuando la fila deja de ser un owner activo.
  if tg_op = 'UPDATE'
     and old.role = 'owner' and old.status = 'active'
     and new.role = 'owner' and new.status = 'active' then
    return new;
  end if;

  if old.role <> 'owner' or old.status <> 'active' then
    return coalesce(new, old);
  end if;

  select count(*) into v_owners
  from public.memberships
  where tenant_id = v_tenant
    and role = 'owner'
    and status = 'active'
    and id <> old.id;

  if v_owners = 0 then
    raise exception
      'No se puede dejar el negocio sin titular. Primero hacé titular a otra persona.'
      using errcode = '23514';
  end if;

  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION app.cancel_jobs_for_appointment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status in ('cancelled', 'no_show')
     or new.starts_at is distinct from old.starts_at then
    update public.message_jobs
    set status = 'cancelled',
        skip_reason = case
          when new.status = 'cancelled' then 'El turno se canceló.'
          when new.status = 'no_show'   then 'El cliente no vino.'
          else 'El turno se movió de horario.'
        end
    where appointment_id = new.id
      and status = 'pending';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.account_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid;
  v_tz     text;
  v_modo   text;
  v_bps    integer;
  v_fijo   bigint;
  v_mes    date;
  v_cant   integer;
  v_base   bigint;
begin
  select t.id, t.timezone into v_tenant, v_tz
  from public.tenants t
  limit 1;

  if v_tenant is null then
    return null;
  end if;

  if not (select app.has_role(v_tenant, 'owner', 'admin')) then
    raise exception 'Sólo titulares y administración pueden ver la cuenta.'
      using errcode = '42501';
  end if;

  select bs.mode, bs.commission_bps, bs.fixed_cents
    into v_modo, v_bps, v_fijo
  from public.billing_settings bs
  where bs.tenant_id = v_tenant;

  v_modo := coalesce(v_modo, 'percent');
  v_bps  := coalesce(v_bps, 300);
  v_fijo := coalesce(v_fijo, 0);
  v_mes  := date_trunc('month', (now() at time zone v_tz))::date;

  select coalesce(bp.cantidad, 0), coalesce(bp.base_cents, 0)
    into v_cant, v_base
  from app.billable_periods(v_tenant) bp
  where bp.period = v_mes;

  v_cant := coalesce(v_cant, 0);
  v_base := coalesce(v_base, 0);

  return jsonb_build_object(
    'modo',         v_modo,
    'comision_bps', v_bps,
    'fijo_cents',   v_fijo,
    'mes_actual', jsonb_build_object(
      'periodo',     v_mes,
      'cantidad',    v_cant,
      'base_cents',  v_base,
      'total_cents', app.importe_mes(v_tenant, v_mes, v_base)
    ),
    'meses', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'periodo',      bp.period,
          'cantidad',     coalesce(pg.appointments, bp.cantidad),
          'base_cents',   coalesce(pg.base_cents, bp.base_cents),
          'comision_bps', coalesce(pg.commission_bps, v_bps),
          'modo',         coalesce(pg.mode, v_modo),
          'total_cents',  coalesce(
                            pg.amount_cents,
                            app.importe_mes(v_tenant, bp.period, bp.base_cents)
                          ),
          'pagado',       pg.id is not null,
          'pagado_el',    pg.paid_at,
          -- Sólo si fue hecho por el importe que hay que pagar hoy. Si no,
          -- vale nulo y la pantalla pide uno nuevo.
          'link', case
                    when bl.amount_cents
                       = app.importe_mes(v_tenant, bp.period, bp.base_cents)
                    then bl.url
                  end
        )
        order by bp.period desc
      )
      from app.billable_periods(v_tenant) bp
      left join public.billing_payments pg
        on pg.tenant_id = v_tenant and pg.period = bp.period
      left join public.billing_links bl
        on bl.tenant_id = v_tenant and bl.period = bp.period
      where bp.period < v_mes
    ), '[]'::jsonb)
  );
end;
$function$;

-- Los envíos ya cancelados con el motivo viejo también se ven en Avisos.
update public.message_jobs
set skip_reason = 'El cliente no vino.'
where skip_reason = 'La clienta no vino.';
