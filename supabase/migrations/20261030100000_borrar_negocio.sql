-- ============================================================================
-- Dlay Agenda · Dar de baja un negocio desde el panel de Dlay
--
-- Borra el negocio con todo lo suyo: clientes, turnos, caja, avisos,
-- WhatsApp. No se puede deshacer (salvo desde el respaldo de la noche), así
-- que pide escribir el nombre del negocio como confirmación.
--
-- Casi todo cuelga de `tenants` con borrado en cascada, y las protecciones de
-- la caja y del titular ya dejan pasar la baja de un negocio entero. Los
-- turnos se borran antes a propósito: apuntan a las fichas de clientes con
-- una relación restrictiva, y así no depende del orden en que Postgres
-- recorre la cascada.
--
-- No borra las cuentas de acceso: devuelve cuáles quedaron sin ningún otro
-- negocio, y eso lo hace el panel con la API de Auth, que es la que sabe.
-- ============================================================================

create or replace function public.platform_delete_tenant(
  p_tenant  uuid,
  p_confirm text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slug     text;
  v_nombre   text;
  v_clientes integer;
  v_turnos   integer;
  v_usuarios uuid[];
begin
  if not (select app.is_platform_admin()) then
    raise exception 'Esto es del panel de Dlay.' using errcode = '42501';
  end if;

  select t.slug, t.name into v_slug, v_nombre
  from public.tenants t
  where t.id = p_tenant;

  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'Ese negocio ya no existe.');
  end if;

  -- Vale el nombre o la dirección, sin importar mayúsculas: lo que importa es
  -- que quien borra haya mirado cuál está borrando.
  if lower(trim(coalesce(p_confirm, ''))) not in (lower(v_slug), lower(trim(v_nombre))) then
    return jsonb_build_object(
      'ok', false,
      'error', format('Para confirmar escribí el nombre del negocio: «%s».', v_nombre)
    );
  end if;

  -- La cuenta desde la que se maneja Dlay no se borra desde acá: el panel
  -- quedaría sin nadie que lo use.
  if exists (
    select 1
    from public.memberships m
    join public.platform_admins pa on pa.user_id = m.user_id
    where m.tenant_id = p_tenant
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'Ese negocio es de una cuenta de Dlay. No se borra desde acá.'
    );
  end if;

  select count(*) into v_clientes from public.clients c where c.tenant_id = p_tenant;
  select count(*) into v_turnos from public.appointments a where a.tenant_id = p_tenant;

  -- Las personas del negocio que no tienen otro: sus cuentas quedarían
  -- vacías, sin nada para ver.
  select coalesce(array_agg(distinct m.user_id), '{}')
    into v_usuarios
  from public.memberships m
  where m.tenant_id = p_tenant
    and not exists (
      select 1 from public.memberships otra
      where otra.user_id = m.user_id and otra.tenant_id <> p_tenant
    );

  delete from public.appointments a where a.tenant_id = p_tenant;
  delete from public.tenants t where t.id = p_tenant;

  return jsonb_build_object(
    'ok', true,
    'nombre', v_nombre,
    'clientes', v_clientes,
    'turnos', v_turnos,
    'usuarios', to_jsonb(v_usuarios)
  );
end;
$$;

comment on function public.platform_delete_tenant(uuid, text) is
  'Da de baja un negocio con todo lo suyo. Sólo desde el panel de Dlay, y '
  'con la dirección del negocio escrita como confirmación.';

revoke all on function public.platform_delete_tenant(uuid, text) from public, anon;
grant execute on function public.platform_delete_tenant(uuid, text) to authenticated;
