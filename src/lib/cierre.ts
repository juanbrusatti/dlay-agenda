/**
 * Which appointments of a day are still open: pending or confirmed, and
 * already started. Those are the ones «Cerrar el día» marks and charges.
 *
 * Pure on purpose, so the agenda (to show the button) and the closing screen
 * agree on the same list.
 */

type ConEstado = { status: string; starts_at: string };

export function porCerrar<T extends ConEstado>(appointments: T[], ahora: Date): T[] {
  return appointments.filter(
    (a) =>
      (a.status === "pending" || a.status === "confirmed") &&
      new Date(a.starts_at).getTime() <= ahora.getTime(),
  );
}
