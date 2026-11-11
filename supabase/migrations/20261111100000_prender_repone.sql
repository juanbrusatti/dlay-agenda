-- ============================================================================
-- Dlay Agenda · Volver a prender un aviso repone lo que se había cancelado
--
-- Apagar un aviso (la regla entera desde el listado, o un servicio) cancela
-- sus envíos pendientes. Volver a prenderlo desde el listado no los reponía:
-- cada envío existe una sola vez por turno y regla (`dedupe_key`), el
-- cancelado seguía ocupando su lugar y el planificador ya no podía programar
-- otro. Así una cuenta se quedó una noche sin los recordatorios del día
-- anterior, con las reglas prendidas.
--
-- Ahora, cada vez que una regla queda prendida (o cambia a qué servicios, cuándo
-- o en qué franja avisa), se borran sus envíos cancelados por haberla apagado
-- de turnos que todavía no pasaron. Nunca salieron, así que no se pierde nada:
-- el planificador, en su próxima vuelta, programa lo que corresponda con la
-- regla como quedó. Borrar en vez de devolver a la cola es a propósito: la
-- hora vieja ya no sirve, y la regla puede cubrir otros turnos que antes.
--
-- El panel tenía su propio «revivir» al prender un servicio. Corre después de
-- guardar la regla, así que ya no encuentra nada que revivir: no duplica.
-- ============================================================================

create or replace function app.reponer_al_prender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.enabled and (
       not old.enabled
       or new.service_ids is distinct from old.service_ids
       or new.offset_minutes is distinct from old.offset_minutes
       or new.send_window_start is distinct from old.send_window_start
       or new.send_window_end is distinct from old.send_window_end
     ) then
    delete from public.message_jobs j
    using public.appointments a
    where j.rule_id = new.id
      and j.status = 'cancelled'
      and j.skip_reason in (
        'Se apagó este aviso para el servicio.',
        'Se apagó la regla.'
      )
      and a.id = j.appointment_id
      and a.starts_at > now();
  end if;

  return new;
end;
$$;

revoke all on function app.reponer_al_prender() from public, anon, authenticated;

create trigger reminder_rules_reponer_al_prender
  after update on public.reminder_rules
  for each row execute function app.reponer_al_prender();

-- Los que ya quedaron trabados así, en reglas que hoy están prendidas.
delete from public.message_jobs j
using public.reminder_rules r, public.appointments a
where r.id = j.rule_id
  and a.id = j.appointment_id
  and j.status = 'cancelled'
  and j.skip_reason in ('Se apagó este aviso para el servicio.', 'Se apagó la regla.')
  and r.enabled
  and a.starts_at > now();
