-- ============================================================================
-- Dlay Agenda · Visits to the public home pages
--
-- A daily counter for the two pages people land on before having an account:
-- the home page (/) and the one for psychologists (/psicologos). One row per
-- page and day, so it stays tiny: a few hundred rows a year.
--
-- Counted from the browser once per visit (the page dedupes reloads in the
-- same tab session), which leaves out most bots. Only those two paths are
-- accepted, and nobody can read or change the table directly: anonymous
-- visitors can only add one, and only Dlay admins read the totals.
-- ============================================================================

create table public.visitas_portada (
  dia     date    not null,
  ruta    text    not null check (ruta in ('/', '/psicologos')),
  visitas integer not null default 0,
  primary key (dia, ruta)
);

comment on table public.visitas_portada is
  'Daily visit count of the public home pages. Written only through registrar_visita().';

-- RLS on and no policies: only the functions below touch it.
alter table public.visitas_portada enable row level security;
revoke all on public.visitas_portada from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Count a visit
-- ---------------------------------------------------------------------------
create or replace function public.registrar_visita(p_ruta text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_ruta not in ('/', '/psicologos') then
    return;
  end if;

  insert into public.visitas_portada (dia, ruta, visitas)
  values ((now() at time zone 'America/Argentina/Cordoba')::date, p_ruta, 1)
  on conflict (dia, ruta)
  do update set visitas = public.visitas_portada.visitas + 1;
end;
$$;

revoke all on function public.registrar_visita(text) from public;
grant execute on function public.registrar_visita(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Totals for the platform panel
-- ---------------------------------------------------------------------------
create or replace function public.platform_visitas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Argentina/Cordoba')::date;
begin
  if not (select app.is_platform_admin()) then
    raise exception 'Esto es del panel de Dlay.' using errcode = '42501';
  end if;

  return (
    select jsonb_agg(to_jsonb(t) order by t.ruta)
    from (
      select
        r.ruta,
        coalesce(sum(v.visitas) filter (where v.dia = v_hoy), 0)      as hoy,
        coalesce(sum(v.visitas) filter (where v.dia = v_hoy - 1), 0)  as ayer,
        coalesce(sum(v.visitas) filter (where v.dia > v_hoy - 7), 0)  as semana,
        coalesce(sum(v.visitas) filter (where v.dia > v_hoy - 30), 0) as mes,
        coalesce(sum(v.visitas), 0)                                   as total,
        min(v.dia)                                                    as desde
      from (values ('/'), ('/psicologos')) as r(ruta)
      left join public.visitas_portada v on v.ruta = r.ruta
      group by r.ruta
    ) t
  );
end;
$$;

revoke all on function public.platform_visitas() from public, anon;
grant execute on function public.platform_visitas() to authenticated;
