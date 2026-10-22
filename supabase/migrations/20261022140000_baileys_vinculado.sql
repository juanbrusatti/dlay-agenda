-- ============================================================================
-- Dlay Agenda · Cuándo se escaneó el QR, aparte de cuándo se reconectó
--
-- `last_connected_at` se pisa cada vez que el servidor se reconecta, y en un
-- hosting gratis eso pasa seguido (Render reinicia el servidor de madrugada).
-- La pantalla decía «Conectado desde: 1:38» cuando el número se había
-- escaneado días antes. `linked_at` es el momento del escaneo y sólo cambia
-- cuando se vincula de nuevo.
-- ============================================================================

alter table public.baileys_sessions add column linked_at timestamptz;

comment on column public.baileys_sessions.linked_at is
  'Cuándo se escaneó el QR. A diferencia de last_connected_at, no cambia con '
  'las reconexiones del servidor.';

-- Lo más cerca que tenemos para las que ya existían: la fila nace al pedir
-- el primer QR y volver a vincular no la recrea.
update public.baileys_sessions
set linked_at = created_at
where status = 'connected';

create or replace view public.baileys_sessions_view
with (security_invoker = false)
as
  select
    tenant_id,
    status,
    phone_number,
    qr_code,
    last_connected_at,
    last_message_sent_at,
    error_message,
    updated_at,
    linked_at
  from public.baileys_sessions
  where (select app.has_role(tenant_id, 'owner', 'admin'));
