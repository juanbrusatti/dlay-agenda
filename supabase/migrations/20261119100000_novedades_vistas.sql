-- ============================================================================
-- Dlay Agenda · Remember which «what's new» notice each person already saw
--
-- A short notice opens once after an update that changes how the day is
-- worked. This column keeps the key of the last one the person closed, so it
-- does not open again on any device. Nothing else reads it.
-- ============================================================================

alter table public.profiles add column novedades_vistas text;

comment on column public.profiles.novedades_vistas is
  'Key of the last «what''s new» notice this person closed.';
