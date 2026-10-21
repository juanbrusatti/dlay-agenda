-- ============================================================================
-- Dlay Agenda · El emisor anota en $0 lo que sale por QR
--
-- En producción `service_role` no tiene permisos sobre las tablas que no los
-- recibieron explícitamente (en local sí, por los privilegios por defecto, y
-- por eso las pruebas no lo vieron). El emisor, después de mandar por QR,
-- pone `cost_cents = 0` en el envío: sin este permiso el cambio fallaba en
-- silencio y los informes mostraban el precio de Meta por algo que no costó.
-- ============================================================================

grant select, update (cost_cents) on public.message_jobs to service_role;
