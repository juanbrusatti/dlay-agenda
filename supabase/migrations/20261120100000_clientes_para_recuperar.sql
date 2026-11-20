-- ============================================================================
-- Dlay Agenda · Clients who did not come back
--
-- The list behind «Para recuperar»: clients who came at least once, have not
-- been back for a while and have nothing booked. The screen offers to write
-- to each one on WhatsApp, so a client who drifted away gets a nudge before
-- they are gone for good.
--
-- Read only. It adds this one function and changes nothing else.
--
-- SECURITY INVOKER on purpose: the caller's own row security applies, so a
-- business only ever sees its own clients, the same as on «Clientes». The
-- tenant is also passed explicitly, so a person in two businesses gets the
-- list of the one they are looking at.
--
-- A visit counts if the client came (attended), or, for clients imported
-- from another system, the last visit that system recorded.
-- ============================================================================

create or replace function public.clientes_para_recuperar(
  p_tenant uuid,
  p_dias   integer default 45
)
returns table (
  id              uuid,
  first_name      text,
  last_name       text,
  phone_e164      text,
  ultima_visita   date,
  ultimo_servicio text,
  visitas         integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with negocio as (
    select t.id, (now() at time zone t.timezone)::date as hoy, t.timezone
    from public.tenants t
    where t.id = p_tenant
  ),
  vino as (
    select a.client_id, max(a.starts_at) as ultima, count(*)::integer as cuantas
    from public.appointments a
    where a.tenant_id = p_tenant
      and a.status = 'attended'
    group by a.client_id
  ),
  lista as (
    select
      c.id, c.first_name, c.last_name, c.phone_e164,
      greatest((v.ultima at time zone n.timezone)::date, c.legacy_last_visit_on) as ultima_visita,
      coalesce(v.cuantas, 0) + coalesce(c.legacy_visits_count, 0) as visitas,
      n.hoy
    from public.clients c
    join negocio n on n.id = c.tenant_id
    left join vino v on v.client_id = c.id
    where c.tenant_id = p_tenant
      and c.is_active
      and (v.ultima is not null or c.legacy_last_visit_on is not null)
      -- Already coming back: anything booked from now on that is still on.
      and not exists (
        select 1
        from public.appointments f
        where f.client_id = c.id
          and f.starts_at >= now()
          and f.status in ('pending', 'confirmed')
      )
  )
  select
    l.id, l.first_name, l.last_name, l.phone_e164, l.ultima_visita,
    (
      select s.name
      from public.appointments a
      join public.appointment_services aps on aps.appointment_id = a.id
      join public.services s on s.id = aps.service_id
      where a.client_id = l.id and a.status = 'attended'
      order by a.starts_at desc, aps.position
      limit 1
    ) as ultimo_servicio,
    l.visitas
  from lista l
  where l.ultima_visita < l.hoy - greatest(coalesce(p_dias, 45), 1)
  order by l.ultima_visita desc
  limit 200;
$$;

comment on function public.clientes_para_recuperar(uuid, integer) is
  'Clients who came before, have not been back in p_dias days and have nothing booked.';

revoke all on function public.clientes_para_recuperar(uuid, integer) from public, anon;
grant execute on function public.clientes_para_recuperar(uuid, integer) to authenticated;
