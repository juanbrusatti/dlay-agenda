-- ============================================================================
-- Dlay Agenda · Seasonal look per account
--
-- A business can wear a seasonal look for a while: for now, «fiestas» at the
-- end of the year (Christmas red, a little snow, Santa passing by now and
-- then). It is per account and only Dlay turns it on or off from the
-- platform panel, so it can be tried on one account without the rest seeing
-- anything.
--
-- Additive only: one nullable column (null = the usual look, which is what
-- every account keeps) and two functions for the panel.
-- ============================================================================

alter table public.tenants
  add column tema text
    constraint tenants_tema_valido check (tema in ('fiestas'));

comment on column public.tenants.tema is
  'Seasonal look of the app for this account. Null is the usual one.';

-- ---------------------------------------------------------------------------
-- Which accounts have which look, for the panel
-- ---------------------------------------------------------------------------
create or replace function public.platform_temas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select app.is_platform_admin()) then
    raise exception 'Esto es del panel de Dlay.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object('tenant_id', t.id, 'nombre', t.name, 'tema', t.tema)
      order by t.name
    )
    from public.tenants t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.platform_temas() from public, anon;
grant execute on function public.platform_temas() to authenticated;

-- ---------------------------------------------------------------------------
-- Turn a look on or off for one account
-- ---------------------------------------------------------------------------
create or replace function public.platform_set_tema(p_tenant uuid, p_tema text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select app.is_platform_admin()) then
    raise exception 'Esto es del panel de Dlay.' using errcode = '42501';
  end if;

  if p_tema is not null and p_tema not in ('fiestas') then
    return jsonb_build_object('ok', false, 'error', 'Ese tema no existe.');
  end if;

  update public.tenants set tema = p_tema where id = p_tenant;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No encontramos ese negocio.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.platform_set_tema(uuid, text) from public, anon;
grant execute on function public.platform_set_tema(uuid, text) to authenticated;
