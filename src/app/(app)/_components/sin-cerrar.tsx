import Link from "next/link";
import { conMayuscula, longDateIn } from "@/lib/tz";

/**
 * «Quedaron turnos sin cerrar», on the home page.
 *
 * Closing the day is what feeds the no-show count and the register, and the
 * button for it lives in the agenda, on the day itself: easy to miss once the
 * day is over. This lists the days that were left open, each one straight to
 * «Cerrar el día». It goes away by itself when they are all closed.
 */
export function SinCerrar({
  dias,
  timeZone,
}: {
  dias: Array<{ dia: string; cuantos: number }>;
  timeZone: string;
}) {
  if (dias.length === 0) return null;

  const total = dias.reduce((suma, d) => suma + d.cuantos, 0);

  return (
    <section className="grid gap-3 rounded-card border-[1.5px] border-warn bg-warn-wash px-4 py-4 sm:px-5">
      <div className="grid gap-1">
        <h2 className="text-[16px] font-semibold text-ink">
          {total === 1
            ? "Quedó un turno sin cerrar"
            : `Quedaron ${total} turnos sin cerrar`}
        </h2>
        <p className="text-[13.5px] leading-snug text-muted">
          Marcá quién vino y cobrá lo que falta, todo junto. Tocá el día:
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {dias.slice(0, 7).map(({ dia, cuantos }) => (
          <li key={dia}>
            <Link
              href={`/agenda/cerrar?dia=${dia}`}
              className="inline-flex items-center gap-1.5 rounded-pill border-[1.5px] border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink hover:border-accent"
            >
              <span>{conMayuscula(longDateIn(dia, timeZone))}</span>
              <span className="tabular-nums text-muted">· {cuantos}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
