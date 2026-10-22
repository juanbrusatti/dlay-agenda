-- ============================================================================
-- Dlay Agenda · Avisar cuando se cae el WhatsApp del negocio
--
-- Si el teléfono desvincula el dispositivo, o WhatsApp corta la sesión, los
-- recordatorios dejan de salir y nadie se entera hasta que entra a mirar
-- Ajustes. Este trigger le manda una notificación al equipo en el momento.
--
-- Sólo cuando estaba conectado y se cae con un motivo. Desvincular a mano
-- desde el panel también pasa a «disconnected», pero sin mensaje de error:
-- eso lo hizo alguien a propósito y no hace falta avisarle.
-- ============================================================================

create or replace function app.alert_on_baileys_down()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'connected'
     and new.status in ('disconnected', 'error')
     and new.error_message is not null then
    perform app.notify_team(
      new.tenant_id, 'whatsapp_caido',
      'Se desconectó tu WhatsApp',
      'Los recordatorios no están saliendo. Entrá a Ajustes → WhatsApp y '
        || 'escaneá el código de nuevo.',
      '/configuracion/whatsapp'
    );
  end if;
  return null;
end;
$$;

create trigger baileys_sessions_alert_down
  after update of status on public.baileys_sessions
  for each row execute function app.alert_on_baileys_down();
