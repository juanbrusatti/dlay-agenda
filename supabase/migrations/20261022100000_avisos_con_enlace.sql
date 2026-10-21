-- ============================================================================
-- Dlay Agenda · Los recordatorios hablan del enlace, no de botones
--
-- Por QR no hay botones de respuesta rápida: lo que confirma, cancela o mueve
-- el turno es el enlace de autogestión. Los textos de fábrica todavía decían
-- «Con los botones de acá abajo…», que el cliente lee y no encuentra.
--
-- Sólo se tocan los cuerpos que siguen IDÉNTICOS al de fábrica. Si alguien
-- escribió el suyo, se respeta: desde acá no se puede saber qué quiso decir.
--
-- De paso el mensaje del servicio va en su propio párrafo. Por QR los saltos
-- de línea llegan tal cual, y un texto de quinientos caracteres metido en el
-- medio de una oración se lee como un bloque.
-- ============================================================================

update public.message_templates
set body = E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte tu '
        || E'turno de mañana {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
        || E'Para confirmar el turno o avisarnos que no vas a venir: {{link}}\n\n'
        || E'¡Te esperamos!',
    updated_at = now()
where channel = 'whatsapp'
  and body = 'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte tu '
          || 'turno de mañana {{cuando}}, para {{servicio}}. {{mensaje}} '
          || 'Con los botones de acá abajo podés confirmar el turno o avisarnos '
          || 'que no vas a venir. ¡Te esperamos!';

update public.message_templates
set body = E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte '
        || E'que tenés turno el {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
        || E'Si ya sabés que no vas a poder, avisanos desde acá así le damos el '
        || E'lugar a otra persona: {{link}}\n\n¡Gracias!',
    updated_at = now()
where channel = 'whatsapp'
  and body = 'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte '
          || 'que tenés turno el {{cuando}}, para {{servicio}}. {{mensaje}} '
          || 'Con los botones de acá abajo podés confirmar el turno o avisarnos '
          || 'que no vas a venir. ¡Gracias!';

-- ---------------------------------------------------------------------------
-- Las cuentas nuevas nacen con los textos nuevos
-- ---------------------------------------------------------------------------
create or replace function app.seed_messaging(p_tenant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_regla uuid;
begin
  -- La guarda mira las REGLAS y no las plantillas. Un negocio con plantillas
  -- sueltas y ninguna regla es precisamente el que no funciona: mirando las
  -- plantillas lo saltearíamos y lo dejaríamos roto para siempre.
  if exists (select 1 from public.reminder_rules where tenant_id = p_tenant)
  then
    return;
  end if;

  -- =========================================================================
  -- 1. El recordatorio del día anterior. La única encendida.
  -- =========================================================================
  insert into public.reminder_rules (
    tenant_id, name, enabled, trigger, offset_minutes,
    channel_order, send_window_start, send_window_end
  )
  values (
    p_tenant, 'Recordatorio del día anterior', true, 'before_appointment',
    -1440, '{whatsapp}', '09:00', '20:00'
  )
  returning id into v_regla;

  insert into public.message_templates
      (tenant_id, name, channel, category, subject, body,
       provider_name, quick_replies)
    values
      (p_tenant, 'Recordatorio del día anterior · WhatsApp', 'whatsapp',
       'utility', null,
       E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte tu '
       || E'turno de mañana {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
       || E'Para confirmar el turno o avisarnos que no vas a venir: {{link}}\n\n'
       || E'¡Te esperamos!',
       'recordatorio_dia_anterior', '{confirmar,cancelar,reprogramar}')
  -- Si alguna ya existía con ese nombre, se respeta la que está.
  on conflict do nothing;

  insert into public.rule_templates (rule_id, channel, template_id, tenant_id)
  select v_regla, m.channel, m.id, p_tenant
  from public.message_templates m
  where m.tenant_id = p_tenant
    and m.name = 'Recordatorio del día anterior · WhatsApp'
  on conflict do nothing;

  -- =========================================================================
  -- 2. El aviso de la semana. Apagada.
  --
  -- Es justo lo que el sistema anterior no podía hacer: avisar de un turno
  -- que está a más de una semana. Nace apagada porque duplica los mensajes
  -- por turno, y esa es una decisión de plata que le toca a cada negocio.
  -- =========================================================================
  insert into public.reminder_rules (
    tenant_id, name, enabled, trigger, offset_minutes,
    channel_order, send_window_start, send_window_end
  )
  values (
    p_tenant, 'Aviso una semana antes', false, 'before_appointment',
    -10080, '{whatsapp}', '09:00', '20:00'
  )
  returning id into v_regla;

  insert into public.message_templates
      (tenant_id, name, channel, category, subject, body,
       provider_name, quick_replies)
    values
      (p_tenant, 'Aviso una semana antes · WhatsApp', 'whatsapp',
       'utility', null,
       E'Hola {{cliente}}! Te escribimos de {{estetica}} para recordarte '
       || E'que tenés turno el {{cuando}}, para {{servicio}}.\n\n{{mensaje}}\n\n'
       || E'Si ya sabés que no vas a poder, avisanos desde acá así le damos el '
       || E'lugar a otra persona: {{link}}\n\n¡Gracias!',
       'aviso_una_semana_antes', '{confirmar,cancelar,reprogramar}')
  on conflict do nothing;

  insert into public.rule_templates (rule_id, channel, template_id, tenant_id)
  select v_regla, m.channel, m.id, p_tenant
  from public.message_templates m
  where m.tenant_id = p_tenant
    and m.name = 'Aviso una semana antes · WhatsApp'
  on conflict do nothing;
end;
$$;
