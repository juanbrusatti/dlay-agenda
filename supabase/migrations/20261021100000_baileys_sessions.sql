-- ============================================================================
-- Dlay Agenda · Sesiones de WhatsApp con Baileys
--
-- Baileys es una librería que imita a WhatsApp Web, permitiendo conectar un
-- número como "dispositivo vinculado" sin la ventana de 24 horas. Esta tabla
-- guarda las sesiones activas de Baileys para cada negocio.
--
-- Las sesiones se guardan en Supabase para que el servidor Baileys sea
-- descartable y pueda migrarse entre hosting (Northflank, Fly.io, etc).
-- ============================================================================

-- Tabla para guardar las sesiones de Baileys
create table if not exists public.baileys_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id text not null unique, -- ID único de la sesión de Baileys
  phone_number text, -- Número de teléfono conectado
  status text not null default 'pending' check (status in ('pending', 'connecting', 'connected', 'disconnected', 'error')),
  session_data jsonb, -- Datos de la sesión de Baileys (credenciales, tokens, etc)
  qr_code text, -- QR code para vincular (solo mientras está pendiente)
  last_connected_at timestamptz,
  last_message_sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para búsquedas rápidas
create index idx_baileys_sessions_tenant on public.baileys_sessions(tenant_id);
create index idx_baileys_sessions_status on public.baileys_sessions(status);
create index idx_baileys_sessions_session_id on public.baileys_sessions(session_id);

-- Comentarios
comment on table public.baileys_sessions is
  'Sesiones de WhatsApp conectadas con Baileys (modo dispositivo vinculado). '
  'Permite enviar mensajes sin la ventana de 24 horas.';

comment on column public.baileys_sessions.session_id is
  'ID único de la sesión de Baileys, generado por el servidor externo.';

comment on column public.baileys_sessions.session_data is
  'Datos de la sesión de Baileys (auth state, keys, etc) necesarios para reconectar. '
  'Esta información es sensible y no debe exponerse al navegador.';

comment on column public.baileys_sessions.qr_code is
  'QR code en formato base64 para vincular el dispositivo. Se limpia después de conectar.';

-- Políticas de seguridad (RLS)
alter table public.baileys_sessions enable row level security;

-- Sólo el dueño/admin del negocio puede ver y editar sus sesiones
create policy "Los titulares y admins pueden ver sus sesiones"
  on public.baileys_sessions for select
  using (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = baileys_sessions.tenant_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('owner', 'admin')
    )
  );

create policy "Los titulares y admins pueden insertar sesiones"
  on public.baileys_sessions for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = baileys_sessions.tenant_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('owner', 'admin')
    )
  );

create policy "Los titulares y admins pueden actualizar sus sesiones"
  on public.baileys_sessions for update
  using (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = baileys_sessions.tenant_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('owner', 'admin')
    )
  );

create policy "Los titulares y admins pueden borrar sus sesiones"
  on public.baileys_sessions for delete
  using (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = baileys_sessions.tenant_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('owner', 'admin')
    )
  );

-- Vista para el panel (sin datos sensibles)
create or replace view public.baileys_sessions_view
with (security_invoker = false)
as
  select
    id,
    tenant_id,
    session_id,
    phone_number,
    status,
    qr_code,
    last_connected_at,
    last_message_sent_at,
    error_message,
    created_at,
    updated_at
  from public.baileys_sessions
  where (select app.has_tenant(tenant_id));

comment on view public.baileys_sessions_view is
  'Vista de sesiones de Baileys sin datos sensibles (session_data). '
  'Usada por el panel para mostrar el estado de conexión.';

revoke all on public.baileys_sessions_view from anon, authenticated;
grant select on public.baileys_sessions_view to authenticated;

-- Función para obtener la sesión activa del negocio
create or replace function public.get_baileys_session()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_session record;
begin
  select m.tenant_id into v_tenant
  from public.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.role in ('owner', 'admin')
  limit 1;

  if v_tenant is null then
    return jsonb_build_object('ok', false, 'error', 'No encontramos tu negocio.');
  end if;

  select * into v_session
  from public.baileys_sessions
  where tenant_id = v_tenant
    and status in ('connecting', 'connected')
  order by created_at desc
  limit 1;

  if v_session is null then
    return jsonb_build_object('ok', false, 'error', 'No hay sesión activa.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session.session_id,
    'phone_number', v_session.phone_number,
    'status', v_session.status,
    'qr_code', v_session.qr_code,
    'last_connected_at', v_session.last_connected_at
  );
end;
$$;

revoke all on function public.get_baileys_session() from public, anon;
grant execute on function public.get_baileys_session() to authenticated;
