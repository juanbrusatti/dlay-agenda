-- ============================================================================
-- Dlay Agenda · El plazo para cancelar nace en 4 horas, no en 24
--
-- El recordatorio de fábrica sale 24 horas antes del turno, y el plazo para
-- cancelar o cambiar desde el enlace también era de 24 horas. Resultado:
-- cuando el cliente abría el enlace del recordatorio, el plazo ya había
-- pasado y sólo le quedaba «Confirmar». El botón de cancelar no aparecía
-- nunca en el momento en que más sirve.
--
-- Con 4 horas, quien recibe el aviso el día anterior todavía puede liberar
-- el horario solo. Sólo cambia cómo nacen las cuentas nuevas: las que ya
-- existen conservan lo que eligieron.
-- ============================================================================

alter table public.booking_settings
  alter column cancel_min_hours set default 4;
