import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { linkAgendar } from "@/lib/agendar";
import { SEMANAS, diaSugerido, semanasSugeridas } from "@/lib/proximo";
import type { Rubro } from "@/lib/rubros";
import { conMayuscula, longDateIn, todayIn } from "@/lib/tz";

/**
 * «¿Le agendamos el próximo?», right after marking that the client came.
 *
 * The moment to book the next visit is while the client is still there. The
 * suggestion is the same weekday and time, at the client's own rhythm, and it
 * opens the booking screen with everything filled in (who, when and «lo de
 * siempre»): one more tap to save it. Nothing is booked from here.
 */
export function ProximoTurno({
  clientId,
  dia,
  hora,
  diasDesdeAnterior,
  rubro,
  timeZone,
}: {
  clientId: string;
  /** Day of the visit that was just closed. */
  dia: string;
  hora: string;
  diasDesdeAnterior: number | null;
  rubro: Rubro;
  timeZone: string;
}) {
  const hoy = todayIn(timeZone);
  const sugeridas = semanasSugeridas(diasDesdeAnterior, rubro);
  const fecha = diaSugerido(dia, sugeridas, hoy);
  const otras = SEMANAS.filter((s) => s !== sugeridas);

  return (
    <Card>
      <CardBody className="grid justify-items-start gap-3">
        <div className="grid gap-1">
          <CardTitle>¿Le agendamos el próximo?</CardTitle>
          <p className="text-[14px] leading-relaxed text-muted">
            {diasDesdeAnterior !== null && diasDesdeAnterior >= 4
              ? `Viene cada ${sugeridas === 1 ? "semana" : `${sugeridas} semanas`}, más o menos.`
              : "Todavía no tiene otro turno."}{" "}
            Se abre con el mismo horario y lo de hoy ya marcado; sólo falta
            guardarlo.
          </p>
        </div>

        <Button asChild>
          <Link href={linkAgendar({ dia: fecha, hora, cliente: clientId })}>
            {conMayuscula(longDateIn(fecha, timeZone))} a las {hora}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] text-muted">Otra fecha:</span>
          {otras.map((s) => (
            <Link
              key={s}
              href={linkAgendar({
                dia: diaSugerido(dia, s, hoy),
                hora,
                cliente: clientId,
              })}
              className="rounded-pill border-[1.5px] border-line bg-surface px-3 py-1 text-[12.5px] font-medium text-muted hover:border-accent hover:text-ink"
            >
              {s === 1 ? "1 semana" : `${s} semanas`}
            </Link>
          ))}
          <Link
            href={linkAgendar({ dia: hoy, cliente: clientId })}
            className="rounded-pill border-[1.5px] border-line bg-surface px-3 py-1 text-[12.5px] font-medium text-muted hover:border-accent hover:text-ink"
          >
            Elegir día
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
