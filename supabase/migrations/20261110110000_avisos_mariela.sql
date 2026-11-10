-- ============================================================================
-- Dlay Agenda · Dejar a punto los avisos de Estetica Mariela Torres
--
-- Lo que la titular quiso armar y el sistema no le dejó claro cómo:
--
--   · Su aviso «2 horas antes» usaba el mensaje de la semana («ya tenés
--     agendado…»), y el texto que quería mandar lo había escrito en el
--     nombre de la regla. Ahora tiene su propio mensaje, con ese texto, y la
--     regla un nombre corto.
--   · Ese aviso tiene que salir a su hora, no dentro de la franja de 18 a 22
--     que ella eligió para los otros (a esa hora la gente está en su casa con
--     el teléfono, pero un turno de las diez se avisa a las ocho). Va con
--     franja propia, de 8 a 21. Lo pendiente se borra para que el
--     planificador lo vuelva a programar a la hora nueva.
--   · Las indicaciones que escribió en sus servicios («no te olvides la
--     toalla…») no salían: su mensaje del día anterior no tenía el lugar para
--     ellas. Se agrega, y se vacían las tres que tenían los datos sueltos
--     que quedaron de probar los botones.
--   · «a las{{hora}}»: le faltaba un espacio.
--
-- Todo atado a su negocio por id y, donde se toca un texto, al texto exacto
-- que tiene hoy: si ya lo cambió, no se pisa.
-- ============================================================================

do $$
declare
  v_tenant constant uuid := '403ce382-c946-449c-8dfa-da03c2c1f3ee';
  v_regla  constant uuid := 'e8ca5c9b-039f-4bc8-ad22-123ce4c236cb';
  v_tpl    uuid;
begin
  if not exists (select 1 from public.tenants where id = v_tenant) then
    return;
  end if;

  -- 1. El mensaje de las dos horas.
  -- `provider_name` lo exige la base para todo mensaje de WhatsApp (es el
  -- nombre que tendría en Meta); por QR no se usa.
  insert into public.message_templates
    (tenant_id, name, channel, category, body, provider_name)
  values (
    v_tenant, 'Aviso 2 horas antes · WhatsApp', 'whatsapp', 'utility',
    E'Hola {{cliente}}👋 te recuerdo que faltan 2 horitas para tu turno de las '
    || E'{{hora}} para {{servicio}} en {{estetica}}!\n\nNos vemos pronto 😉',
    'aviso_2_horas_antes'
  )
  returning id into v_tpl;

  update public.rule_templates
  set template_id = v_tpl
  where rule_id = v_regla
    and channel = 'whatsapp';

  -- 2. La regla: nombre corto y su propia franja. Lo pendiente se vuelve a
  --    programar en la próxima vuelta del planificador.
  --    También los que nacieron salteados por llegar tarde con la franja del
  --    negocio: con la franja propia sí llegan a tiempo.
  delete from public.message_jobs
  where rule_id = v_regla
    and (
      status = 'pending'
      or (status = 'skipped'
          and skip_reason = 'Con el horario de envío, el aviso llegaba tarde para este turno.')
    );

  update public.reminder_rules
  set name = 'Aviso 2 horas antes',
      send_window_start = '08:00',
      send_window_end = '21:00'
  where id = v_regla
    and tenant_id = v_tenant
    and offset_minutes = -120;

  -- 3. Las indicaciones de cada servicio van en el mensaje del día anterior,
  --    antes del enlace.
  update public.message_templates
  set body = replace(
        body,
        E'\nPuedes confirmar en el siguiente link',
        E'\n\n{{mensaje}}\n\nPuedes confirmar en el siguiente link'
      )
  where tenant_id = v_tenant
    and name = 'Recordatorio del día anterior · WhatsApp'
    and body not like '%{{mensaje}}%'
    and body like E'%\nPuedes confirmar en el siguiente link%';

  update public.services
  set preparation_note = null
  where tenant_id = v_tenant
    and preparation_note = '{{cliente}} {{cuando}} {{servicio}} {{estetica}}';

  -- 4. El espacio que faltaba.
  update public.message_templates
  set body = replace(body, 'a las{{hora}}', 'a las {{hora}}')
  where tenant_id = v_tenant
    and body like '%a las{{hora}}%';
end;
$$;
