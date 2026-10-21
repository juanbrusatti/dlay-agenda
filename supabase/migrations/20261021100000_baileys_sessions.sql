-- ============================================================================
-- Dlay Agenda · WhatsApp como dispositivo vinculado (Baileys)
--
-- La otra forma de conectar WhatsApp: en vez de la Cloud API de Meta, el
-- número del negocio se vincula escaneando un QR, como WhatsApp Web. No hay
-- plantillas que aprobar, no hay ventana de 24 horas y no cuesta nada por
-- mensaje. El riesgo de bloqueo es del negocio y está asumido.
--
-- Quien mantiene la conexión abierta es un servidor aparte
-- (`whatsapp-server/`), que entra con `service_role`. El panel nunca escribe
-- en estas tablas: pide «vinculá» o «desvinculá» al servidor y después mira.
--
-- Una sola sesión por negocio. Volver a vincular pisa la anterior.
-- ============================================================================

create table public.baileys_sessions (
  tenant_id            uuid primary key references public.tenants(id) on delete cascade,
  status               text not null default 'disconnected'
                         check (status in ('connecting', 'connected', 'disconnected', 'error')),
  phone_number         text,
  qr_code              text,
  last_connected_at    timestamptz,
  last_message_sent_at timestamptz,
  error_message        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.baileys_sessions is
  'Estado de la conexión de WhatsApp por QR de cada negocio. La escribe sólo '
  'el servidor de WhatsApp; el panel la lee por baileys_sessions_view.';

comment on column public.baileys_sessions.qr_code is
  'El texto del QR que hay que escanear, mientras está en «connecting». '
  'WhatsApp lo cambia cada unos veinte segundos y el servidor lo va pisando.';

-- ---------------------------------------------------------------------------
-- Las llaves del dispositivo
-- ---------------------------------------------------------------------------
-- Con esto cualquiera puede mandar mensajes en nombre del negocio. Va en una
-- tabla aparte, sin vista y sin ningún permiso más que el de service_role.
create table public.baileys_auth (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key       text not null,
  value     jsonb not null,
  primary key (tenant_id, key)
);

comment on table public.baileys_auth is
  'Credenciales y llaves de cifrado de WhatsApp de cada negocio. Equivalen a '
  'la sesión abierta del teléfono: nadie más que el servidor las lee.';

alter table public.baileys_sessions enable row level security;
alter table public.baileys_sessions force row level security;
alter table public.baileys_auth enable row level security;
alter table public.baileys_auth force row level security;

-- Sin políticas y sin permisos: igual que whatsapp_accounts.
revoke all on public.baileys_sessions from anon, authenticated;
revoke all on public.baileys_auth from anon, authenticated;
grant all on public.baileys_sessions to service_role;
grant all on public.baileys_auth to service_role;

-- ---------------------------------------------------------------------------
-- Lo que ve el panel
-- ---------------------------------------------------------------------------
-- `security_invoker = false` para poder leer la tabla sin darle permisos, y
-- el filtro por rol porque el QR vincula el número: lo ve quien puede
-- vincular, que es la titular y administración.
create view public.baileys_sessions_view
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
    updated_at
  from public.baileys_sessions
  where (select app.has_role(tenant_id, 'owner', 'admin'));

revoke all on public.baileys_sessions_view from anon, authenticated;
grant select on public.baileys_sessions_view to authenticated;

-- ---------------------------------------------------------------------------
-- El panel de Dlay
-- ---------------------------------------------------------------------------
create function public.platform_baileys_sessions()
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

comment on function public.platform_baileys_sessions() is
  'Todas las conexiones de WhatsApp por QR. Sólo para platform_admins.';

revoke all on function public.platform_baileys_sessions() from public, anon;
grant execute on function public.platform_baileys_sessions() to authenticated;
