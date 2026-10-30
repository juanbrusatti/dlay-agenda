-- ============================================================================
-- Dlay Agenda · «Conectado desde» con la fecha del escaneo, también en el panel
--
-- El panel de Dlay mostraba `last_connected_at`, que se pisa cada vez que el
-- servidor de WhatsApp se reinicia: un número escaneado a las cinco de la
-- tarde figuraba «conectado desde» la medianoche. Ahora devuelve también
-- `linked_at`, que es el momento del escaneo.
--
-- Y completa `linked_at` donde quedó vacío. El servidor no lo guardaba: justo
-- después de escanear, WhatsApp pide reiniciar la conexión, y la conexión
-- nueva ya no sabía que venía de un escaneo (arreglado en el servidor). La
-- fila nace al pedir el QR, que es minutos antes de escanearlo: es lo más
-- cerca que hay.
-- ============================================================================

update public.baileys_sessions
set linked_at = created_at
where linked_at is null
  and phone_number is not null;

create or replace function public.platform_baileys_sessions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select app.is_platform_admin()) then
    raise exception 'Esto es del panel de Dlay.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'tenant_id',            s.tenant_id,
      'negocio',              t.name,
      'status',               s.status,
      'phone_number',         s.phone_number,
      'linked_at',            s.linked_at,
      'last_connected_at',    s.last_connected_at,
      'last_message_sent_at', s.last_message_sent_at,
      'error_message',        s.error_message,
      'updated_at',           s.updated_at
    ) order by t.name)
    from public.baileys_sessions s
    join public.tenants t on t.id = s.tenant_id
  ), '[]'::jsonb);
end;
$$;
