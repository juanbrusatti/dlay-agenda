"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createAppointment, type FormState } from "@/lib/actions/agenda";
import { linkAgendar } from "@/lib/agendar";
import type { ServiceWithCategory } from "@/lib/data/services";
import { ElegirHorario } from "./horarios-libres";
import { SelectorServicios, minutosOcupados } from "./selector-servicios";

const INITIAL: FormState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Agendando…" : "Agendar turno"}
    </Button>
  );
}

export function FormTurno({
  clientId,
  clientName,
  services,
  date,
  hora,
  deSiempre = [],
}: {
  clientId: string;
  clientName: string;
  services: ServiceWithCategory[];
  date: string;
  /** Time already chosen (a free gap, «el próximo turno»); 09:00 otherwise. */
  hora?: string;
  /** Services of the client's last appointment, pre-selected. */
  deSiempre?: string[];
}) {
  const [state, formAction] = useActionState(createAppointment, INITIAL);
  const sent = state.values;

  // Day, hour and services live here so the free times can follow them.
  const [fecha, setFecha] = useState(sent?.date ?? date);
  const [horaElegida, setHoraElegida] = useState(sent?.time ?? hora ?? "09:00");
  const [ids, setIds] = useState<string[]>(deSiempre);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="clientId" value={clientId} />

      <Card>
        <CardBody className="grid gap-2">
          <CardTitle>Para {clientName}</CardTitle>
          <Link
            href={linkAgendar({ dia: date, hora })}
            className="justify-self-start text-[13px] text-accent-text hover:underline"
          >
            Elegir otra persona
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4">
          <CardTitle>¿Qué se le hace?</CardTitle>
          {deSiempre.length > 0 && (
            <p className="-mt-2 text-[13px] leading-snug text-muted">
              Ya viene marcado lo de su último turno. Si hoy es otra cosa,
              tocalo para sacarlo y elegí lo que corresponda.
            </p>
          )}
          <SelectorServicios
            services={services}
            defaultSelected={deSiempre}
            onCambio={setIds}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4">
          <CardTitle>¿Cuándo?</CardTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="fecha" className="text-[13.5px] font-medium">
                Día
              </label>
              <input
                id="fecha"
                name="date"
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15px]"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="hora" className="text-[13.5px] font-medium">
                Hora
              </label>
              <input
                id="hora"
                name="time"
                type="time"
                step={300}
                required
                value={horaElegida}
                onChange={(e) => setHoraElegida(e.target.value)}
                className="h-11 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15px]"
              />
            </div>
          </div>

          <ElegirHorario
            fecha={fecha}
            minutos={minutosOcupados(services, ids)}
            elegida={horaElegida}
            onElegir={setHoraElegida}
          />

          <p className="text-[12.5px] leading-snug text-muted">
            Si el horario ya está completo para ese servicio, te lo avisamos al
            guardar y no se agenda nada.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Textarea
            label="Nota del turno"
            name="notes"
            maxLength={1000}
            defaultValue={sent?.notes ?? ""}
            placeholder="Viene con su hermana. Pidió que la llamemos antes."
            hint="Sólo para este turno. Lo que valga siempre va en la ficha del cliente."
          />
        </CardBody>
      </Card>

      {state.error && (
        <p
          role="alert"
          className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13.5px] text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Submit />
        <Button asChild variant="ghost" size="lg">
          <Link href={`/agenda?dia=${date}`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
