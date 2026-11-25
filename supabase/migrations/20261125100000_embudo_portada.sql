-- ============================================================================
-- Dlay Agenda · Where home page visitors drop off
--
-- The panel already counts visits. This adds the steps after that, to know
-- where people stop between landing and having an account:
--
--   visits → tapped «Crear mi cuenta» (or «Escribinos por WhatsApp»)
--          → signed up → created their business
--
-- Taps are a daily counter per button, like the visits: one row per button
-- and day, a few hundred rows a year. Sign-ups and businesses are not stored
-- again: they are counted from the accounts that already exist.
--
-- Additive only: one new table and three functions.
-- ============================================================================

create table public.clics_portada (
  dia   date    not null,
  boton text    not null check (boton in ('crear_cuenta', 'whatsapp')),
  clics integer not null default 0,
  primary key (dia, boton)
);

comment on table public.clics_portada is
  'Daily taps on the home page buttons. Written only through registrar_clic().';

-- RLS on and no policies: only the functions below touch it.
alter table public.clics_portada enable row level security;
revoke all on public.clics_portada from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Count a tap
-- ---------------------------------------------------------------------------
create or replace function public.registrar_clic(p_boton text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_boton not in ('crear_cuenta', 'whatsapp') then
    return;
  end if;

  insert into public.clics_portada (dia, boton, clics)
  values ((now() at time zone 'America/Argentina/Cordoba')::date, p_boton, 1)
  on conflict (dia, boton)
  do update set clics = public.clics_portada.clics + 1;
end;
$$;

revoke all on function public.registrar_clic(text) from public;
grant execute on function public.registrar_clic(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The funnel for the platform panel, for the last 7 and 30 days
-- ---------------------------------------------------------------------------
create or replace function public.platform_embudo()
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
    select jsonb_agg(to_jsonb(t) order by t.dias)
    from (
      select
        p.dias,
        (select coalesce(sum(v.visitas), 0)
           from public.visitas_portada v where v.dia > v_hoy - p.dias) as visitas,
        (select coalesce(sum(c.clics), 0)
           from public.clics_portada c
          where c.dia > v_hoy - p.dias and c.boton = 'crear_cuenta') as crear_cuenta,
        (select coalesce(sum(c.clics), 0)
           from public.clics_portada c
          where c.dia > v_hoy - p.dias and c.boton = 'whatsapp') as whatsapp,
        (select count(*)
           from auth.users u
          where (u.created_at at time zone 'America/Argentina/Cordoba')::date > v_hoy - p.dias) as registros,
        (select count(*)
           from public.tenants tn
          where (tn.created_at at time zone 'America/Argentina/Cordoba')::date > v_hoy - p.dias) as negocios
      from (values (7), (30)) as p(dias)
    ) t
  );
end;
$$;

revoke all on function public.platform_embudo() from public, anon;
grant execute on function public.platform_embudo() to authenticated;
