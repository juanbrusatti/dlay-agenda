-- ============================================================================
-- Dlay Agenda · Devolver a la cola los avisos cancelados al apagar un servicio
--
-- Apagar el aviso de un servicio cancelaba los envíos pendientes de sus
-- turnos, pero volver a prenderlo no los reponía: cada envío existe una sola
-- vez por turno y regla (dedupe_key), y el cancelado seguía ocupando su
-- lugar. Esos turnos quedaban sin recordatorio aunque el aviso estuviera
-- prendido. El panel ya los repone al prender; esto arregla los que quedaron
-- de antes.
--
-- Sólo los cancelados por ese motivo, de turnos que todavía no pasaron y
-- siguen en pie, y sólo si hoy la regla vuelve a cubrir alguno de sus
-- servicios.
-- ============================================================================

update public.message_jobs j
set status = 'pending',
    skip_reason = null
from public.appointments a, public.reminder_rules r
where j.status = 'cancelled'
  and j.skip_reason = 'Se apagó este aviso para el servicio.'
  and a.id = j.appointment_id
  and a.status in ('pending', 'confirmed')
  and a.starts_at > now()
  and r.id = j.rule_id
  and r.enabled
  and exists (
    select 1
    from public.appointment_services aps
    where aps.appointment_id = a.id
      and (cardinality(r.service_ids) = 0 or aps.service_id = any (r.service_ids))
  );
