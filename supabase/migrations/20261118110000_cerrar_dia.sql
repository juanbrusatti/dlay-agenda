-- ============================================================================
-- Dlay Agenda · Close the day in one step
--
-- At the end of the day every appointment used to be marked one by one
-- («Vino y se atendió» / «No vino») and charged one by one. This function
-- does both for a list of appointments in a single transaction: it marks who
-- came and who did not, and charges the outstanding balance of the ones the
-- screen says to charge, with one payment method.
--
-- Safe to call twice: it only touches appointments that are still pending or
-- confirmed and have already started, it locks them first, and it computes
-- each balance here from what was already charged. A second call (a double
-- tap, two people at once) finds them closed and does nothing.
--
-- SECURITY INVOKER on purpose: the caller's own permissions apply, the same
-- as marking and charging from each appointment. Anyone on the team can mark
-- who came; only reception and above can charge (the cash RLS refuses
-- otherwise, and then nothing is written).
-- ============================================================================

create or replace function public.cerrar_dia(
  p_vinieron uuid[],
  p_faltaron uuid[],
  p_cobrar   uuid[],
  p_metodo   public.payment_method default 'cash'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_abiertos  uuid[];
  v_tenant    uuid;
  v_tenants   integer;
  v_branch    uuid;
  v_session   uuid;
  v_vinieron  integer := 0;
  v_faltaron  integer := 0;
  v_cobrados  integer := 0;
  v_total     bigint  := 0;
  r           record;
begin
  if v_uid is null then
    raise exception 'Hace falta entrar al sistema.' using errcode = '42501';
  end if;

  p_vinieron := coalesce(p_vinieron, '{}');
  p_faltaron := coalesce(p_faltaron, '{}');
  p_cobrar   := coalesce(p_cobrar, '{}');

  if p_vinieron && p_faltaron then
    raise exception 'Un turno no puede estar como que vino y que faltó a la vez.'
      using errcode = '22023';
  end if;

  -- Lock the ones still open, so two closes at once cannot both charge.
  perform 1
  from public.appointments a
  where a.id = any (p_vinieron || p_faltaron)
    and a.status in ('pending', 'confirmed')
    and a.starts_at <= now()
  for update;

  select coalesce(array_agg(a.id), '{}'), min(a.tenant_id::text)::uuid,
         count(distinct a.tenant_id)
    into v_abiertos, v_tenant, v_tenants
  from public.appointments a
  where a.id = any (p_vinieron || p_faltaron)
    and a.status in ('pending', 'confirmed')
    and a.starts_at <= now();

  if v_tenants > 1 then
    raise exception 'Los turnos son de negocios distintos.' using errcode = '22023';
  end if;

  if cardinality(v_abiertos) = 0 then
    return jsonb_build_object('vinieron', 0, 'faltaron', 0, 'cobrados', 0, 'total_cents', 0);
  end if;

  -- Charges first: if one fails (no open register for cash, no permission)
  -- the whole call fails and no status changes either.
  for r in
    select
      a.id,
      a.client_id,
      a.price_cents - coalesce((
        select sum(case when m.kind = 'income' then m.amount_cents else -m.amount_cents end)
        from public.cash_movements m
        where m.appointment_id = a.id
      ), 0) as saldo,
      -- Same description as charging from the appointment: up to two
      -- services, «+N» for the rest, and the client's name.
      left(
        concat_ws(' · ',
          -- concat, not ||: a missing «+N» must not blank the service names.
          nullif(concat(sv.primeros, case when sv.cuantos > 2 then ' +' || (sv.cuantos - 2) end), ''),
          nullif(trim(concat_ws(' ', c.first_name, c.last_name)), '')
        ),
        200
      ) as concepto
    from public.appointments a
    left join public.clients c on c.id = a.client_id
    left join lateral (
      select string_agg(x.name, ', ' order by x.position) filter (where x.orden <= 2) as primeros,
             count(*) as cuantos
      from (
        select s.name, aps.position,
               row_number() over (order by aps.position) as orden
        from public.appointment_services aps
        join public.services s on s.id = aps.service_id
        where aps.appointment_id = a.id
      ) x
    ) sv on true
    where a.id = any (v_abiertos)
      and a.id = any (p_vinieron)
      and a.id = any (p_cobrar)
      and a.price_cents is not null
  loop
    continue when r.saldo <= 0;

    if v_branch is null then
      select b.id into v_branch
      from public.branches b
      where b.tenant_id = v_tenant and b.is_default;

      select cs.id into v_session
      from public.cash_sessions cs
      where cs.tenant_id = v_tenant and cs.closed_at is null
      limit 1;

      if p_metodo = 'cash' and v_session is null then
        raise exception 'Abrí la caja antes de cobrar en efectivo.' using errcode = 'P0001';
      end if;
    end if;

    insert into public.cash_movements (
      tenant_id, branch_id, session_id, kind, method, amount_cents,
      concept, appointment_id, client_id, created_by
    )
    values (
      v_tenant, v_branch, v_session, 'income', p_metodo, r.saldo,
      coalesce(nullif(r.concepto, ''), 'Turno'), r.id, r.client_id, v_uid
    );

    v_cobrados := v_cobrados + 1;
    v_total := v_total + r.saldo;
  end loop;

  update public.appointments
  set status = 'attended'
  where id = any (v_abiertos) and id = any (p_vinieron);
  get diagnostics v_vinieron = row_count;

  update public.appointments
  set status = 'no_show'
  where id = any (v_abiertos) and id = any (p_faltaron);
  get diagnostics v_faltaron = row_count;

  return jsonb_build_object(
    'vinieron', v_vinieron,
    'faltaron', v_faltaron,
    'cobrados', v_cobrados,
    'total_cents', v_total
  );
end;
$$;

comment on function public.cerrar_dia(uuid[], uuid[], uuid[], public.payment_method) is
  'Marks who came and who did not and charges the outstanding balance, in one transaction.';

revoke all on function public.cerrar_dia(uuid[], uuid[], uuid[], public.payment_method) from public, anon;
grant execute on function public.cerrar_dia(uuid[], uuid[], uuid[], public.payment_method) to authenticated;
