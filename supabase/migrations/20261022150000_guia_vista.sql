-- ============================================================================
-- Dlay Agenda · Quién ya vio el recorrido de bienvenida
--
-- El recorrido se abre solo la primera vez que alguien entra a un negocio, y
-- no tiene que volver a aparecer cada vez que cambia de dispositivo. Por eso
-- se guarda en el perfil y no en el navegador.
--
-- Es por persona y no por negocio: cuando la titular invita a alguien del
-- equipo, esa persona también lo tiene que ver.
-- ============================================================================

alter table public.profiles add column guide_seen_at timestamptz;

comment on column public.profiles.guide_seen_at is
  'Cuándo terminó o salteó el recorrido de bienvenida. Null: todavía no lo vio.';

-- Quien ya venía usando el sistema no necesita que se le abra solo: lo puede
-- ver cuando quiera desde Ayuda.
update public.profiles p
set guide_seen_at = now()
where exists (select 1 from public.memberships m where m.user_id = p.id);
