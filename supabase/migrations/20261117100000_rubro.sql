-- ============================================================================
-- Dlay Agenda · What each business does (rubro)
--
-- A business can now say what it does: estética (every account so far),
-- psicología, or another rubro that works with appointments. The app uses it
-- for examples and default texts only; nothing else depends on it.
--
-- The one change in behaviour: a psychology practice gets discreet default
-- reminders. A preview on a locked phone that reads «tu turno de terapia en
-- Lic. Paula Ríos» tells whoever is holding the phone more than the patient
-- may want, so those texts name neither the service nor the practice.
--
-- The swap only touches reminder texts that are still exactly the factory
-- ones, in both directions: if the business wrote its own, it is kept.
-- Existing accounts default to 'estetica' and nothing of theirs changes.
-- ============================================================================

alter table public.tenants
  add column rubro text not null default 'estetica'
    constraint tenants_rubro_valido check (rubro in ('estetica', 'psicologia', 'general'));

comment on column public.tenants.rubro is
  'What the business does. Drives examples and default reminder texts.';

-- ---------------------------------------------------------------------------
-- Factory reminder texts by rubro
-- ---------------------------------------------------------------------------
-- Same bodies as app.seed_messaging() for every rubro but psicología.
create or replace function app.texto_de_fabrica(p_rubro text, p_offset integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_rubro = 'psicologia' and p_offset = -1440 then
      E'Hola {{cliente}}! Te recuerdo nuestro encuentro de mañana {{cuando}}.\n\n'
      || E'{{mensaje}}\n\n'
      || E'Para confirmar o avisarme que no vas a poder venir: {{link}}\n\n¡Gracias!'
    when p_rubro = 'psicologia' and p_offset = -10080 then
      E'Hola {{cliente}}! Te recuerdo que tenemos un encuentro el {{cuando}}.\n\n'
      || E'{{mensaje}}\n\n'
      || E'Si ya sabés que no vas a poder, avisame desde acá así le doy el '
      || E'horario a otra persona: {{link}}\n\n¡Gracias!'
    when p_offset = -1440 then
      E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte tu '
      || E'turno de mañana {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
      || E'Para confirmar el turno o avisarnos que no vas a venir: {{link}}\n\n'
      || E'¡Te esperamos!'
    when p_offset = -10080 then
      E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte '
      || E'que tenés turno el {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
      || E'Si ya sabés que no vas a poder, avisanos desde acá así le damos el '
      || E'lugar a otra persona: {{link}}\n\n¡Gracias!'
  end;
$$;

revoke all on function app.texto_de_fabrica(text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Swap the factory reminder texts when the rubro changes
-- ---------------------------------------------------------------------------
create or replace function app.textos_del_rubro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.message_templates m
  set body = app.texto_de_fabrica(new.rubro, r.offset_minutes)
  from public.rule_templates rt
  join public.reminder_rules r on r.id = rt.rule_id
  where rt.template_id = m.id
    and m.tenant_id = new.id
    and m.channel = 'whatsapp'
    and r.trigger = 'before_appointment'
    and r.offset_minutes in (-1440, -10080)
    and m.body = app.texto_de_fabrica(old.rubro, r.offset_minutes);

  return new;
end;
$$;

revoke all on function app.textos_del_rubro() from public, anon, authenticated;

create trigger tenants_textos_del_rubro
  after update of rubro on public.tenants
  for each row
  when (old.rubro is distinct from new.rubro)
  execute function app.textos_del_rubro();
