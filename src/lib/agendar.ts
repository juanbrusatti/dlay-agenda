/**
 * Links into «Agendar turno» with part of the answer already filled in: the
 * day, the time and who it is for. Several screens send people there (a free
 * gap in the agenda, «el próximo turno», a new record) and they all build the
 * link here, so the booking screen only has one format to read.
 *
 * No `server-only`: client components build these links too.
 */

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function esDia(valor: unknown): valor is string {
  return typeof valor === "string" && DIA.test(valor);
}

/**
 * A time the booking form takes as it is. Its field moves in steps of five
 * minutes and the browser refuses anything in between, so «09:01» is left out
 * and the form falls back to its own default.
 */
export function esHoraAgendable(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    HORA.test(valor) &&
    Number(valor.slice(3)) % 5 === 0
  );
}

export function linkAgendar({
  dia,
  hora,
  cliente,
}: {
  dia: string;
  hora?: string | null;
  cliente?: string | null;
}): string {
  const params = new URLSearchParams({ dia });
  if (esHoraAgendable(hora)) params.set("hora", hora);
  if (cliente) params.set("cliente", cliente);
  return `/agenda/nuevo?${params}`;
}
