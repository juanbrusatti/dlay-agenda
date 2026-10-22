"use client";

import { useActionState, useState } from "react";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { saveReservas, type FormState } from "@/lib/actions/configuracion";
import type { BookingSettings } from "@/lib/configuracion";
import { Guardar, Resultado } from "../_components/guardar";
import { useRefrescarAlGuardar } from "../_components/refrescar";

const INITIAL: FormState = { error: null };

export function FormReservas({
  settings,
  link,
}: {
  settings: BookingSettings;
  link: string;
}) {
  const [state, action] = useActionState(saveReservas, INITIAL);
  useRefrescarAlGuardar(state.notice);

  /**
   * Un interruptor parece que se guarda solo, y este no: el botón está al pie
   * de un formulario largo. Sin este aviso, quien lo toca y recarga la página
   * lo ve volver atrás y concluye —con razón— que está roto.
   */
  const [abierta, setAbierta] = useState(settings.enabled);

  // Antes había un solo interruptor para todo el enlace; un negocio que lo
  // tenía apagado arranca con los tres botones apagados.
  const [botones, setBotones] = useState({
    linkConfirm: settings.self_manage && settings.link_confirm,
    linkCancel: settings.self_manage && settings.link_cancel,
    linkReschedule: settings.self_manage && settings.link_reschedule,
  });
  const sinGuardar = abierta !== settings.enabled;

  return (
    <form action={action} className="grid gap-4">
      <Card>
        <CardBody className="grid gap-4">
          <Toggle
            name="enabled"
            label="Agenda abierta al público"
            hint="Con esto apagado, el link de reservas no muestra nada. Podés dejar todo configurado y abrirlo cuando quieras."
            defaultChecked={settings.enabled}
            onChange={setAbierta}
          />

          {sinGuardar && (
            <p
              role="status"
              className="rounded-[14px] bg-warn-wash px-3.5 py-2.5 text-[13px] leading-snug text-ink"
            >
              {abierta
                ? "Vas a abrir tu agenda al público."
                : "Vas a cerrar tu agenda al público."}{" "}
              Todavía no está guardado: tocá <strong className="font-semibold">
              Guardar cambios</strong> al final de la página.
            </p>
          )}

          <div className="grid gap-1.5">
            <span className="text-[12.5px] font-medium text-muted">
              Tu link
            </span>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all rounded-[14px] bg-surface-2 px-3.5 py-2.5 font-mono text-[13px] text-accent-text hover:underline"
            >
              {link}
            </a>
            <p className="text-[12.5px] leading-snug text-muted">
              Ponelo en tu perfil de Instagram o mandáselo a tus clientes.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <CardTitle>Con cuánta anticipación</CardTitle>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Anticipación mínima"
              name="minAdvanceHours"
              type="number"
              min={0}
              max={720}
              defaultValue={settings.min_advance_hours}
              hint="En horas. Con 2, nadie puede sacar turno para dentro de un rato."
            />
            <Field
              label="Hasta cuántos días adelante"
              name="maxDaysAhead"
              type="number"
              min={1}
              max={365}
              defaultValue={settings.max_days_ahead}
              hint="Cuánto se puede reservar hacia el futuro."
            />
          </div>

          <Select
            label="Cada cuánto se ofrece un horario"
            name="slotMinutes"
            defaultValue={String(settings.slot_minutes)}
            hint="Con 15 se ofrecen las 9:00, 9:15, 9:30… Cuanto más chico, más opciones pero más huecos sueltos."
          >
            {[5, 10, 15, 20, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </Select>

          <Field
            label="Turnos a futuro por persona"
            name="maxOpenPerClient"
            type="number"
            min={1}
            max={20}
            defaultValue={settings.max_open_per_client}
            className="w-32"
            hint="El freno contra quien reserva media agenda y después no viene."
          />

          <Field
            label="Clientes nuevos por hora"
            name="maxNewClientsPerHour"
            type="number"
            min={1}
            max={200}
            defaultValue={settings.max_new_clients_per_hour}
            className="w-32"
            hint="El tope de arriba es por persona, y con un teléfono nuevo vuelve a cero. Este frena a quien cambia de número en cada reserva. A quien ya es cliente tuyo no lo afecta nunca. Subilo si hacés una promoción."
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <CardTitle>Qué ven tus clientes</CardTitle>

          <Toggle
            name="showPrices"
            label="Mostrar los precios"
            hint="Si lo apagás, el precio ni siquiera se manda al navegador."
            defaultChecked={settings.show_prices}
          />

          <Textarea
            label="Texto de bienvenida"
            name="welcomeText"
            maxLength={400}
            defaultValue={settings.welcome_text ?? ""}
            placeholder="Depilación definitiva, tratamientos faciales y masajes."
            hint="Un par de líneas, arriba de todo. Opcional."
          />

          <Field
            label="Cómo llegar"
            name="addressNote"
            maxLength={200}
            defaultValue={settings.address_note ?? ""}
            placeholder="Santiago del Estero 1130, Río Cuarto. Timbre 2."
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <CardTitle>Que se manejen solos</CardTitle>

          <p className="-mt-2 max-w-prose text-[13.5px] leading-relaxed text-muted">
            Cada turno tiene su propio enlace, que viaja en los recordatorios.
            Elegí qué puede hacer tu cliente desde ahí, sin que vos tengas que
            contestar ni cambiar nada a mano.
          </p>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[13.5px] font-medium text-ink">
              Qué botones ve en el enlace
            </legend>
            {(
              [
                ["linkConfirm", "Confirmar que voy", "Marca el turno como confirmado en tu agenda."],
                ["linkReschedule", "Cambiar el día o el horario", "Elige otro horario libre y el turno se mueve solo."],
                ["linkCancel", "No voy a poder ir", "Cancela el turno y el horario queda libre para otra persona."],
              ] as const
            ).map(([name, titulo, detalle]) => (
              <label
                key={name}
                className={`flex cursor-pointer items-start gap-3 rounded-[16px] border-[1.5px] px-3.5 py-3 ${
                  botones[name] ? "border-accent bg-accent-wash" : "border-line bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  name={name}
                  checked={botones[name]}
                  onChange={(e) => setBotones((b) => ({ ...b, [name]: e.target.checked }))}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block text-[14.5px] font-medium">{titulo}</span>
                  <span className="block text-[12.5px] leading-snug text-muted">{detalle}</span>
                </span>
              </label>
            ))}
            <p className="text-[12.5px] leading-snug text-muted">
              {!botones.linkConfirm && !botones.linkCancel && !botones.linkReschedule
                ? "Sin ninguno, el enlace muestra el turno y tu teléfono para que te escriban."
                : !botones.linkCancel
                  ? "Si no puede ir, el enlace le muestra tu teléfono para que te avise."
                  : "Los cambios que haga aparecen solos en tu agenda."}
            </p>
          </fieldset>

          {(botones.linkCancel || botones.linkReschedule) && (
            <Field
              label="Hasta cuántas horas antes puede cancelar o cambiar"
              name="cancelMinHours"
              type="number"
              inputMode="numeric"
              min={0}
              max={168}
              required
              className="w-32"
              defaultValue={settings.cancel_min_hours}
              hint="Pasado ese plazo se le muestra tu teléfono en vez del botón. Ojo: el recordatorio del día anterior sale 24 horas antes, así que con 24 o más ya no le aparece el botón cuando lo recibe."
            />
          )}

          {botones.linkReschedule && (
            <Field
              label="Cuántas veces puede mover el mismo turno"
              name="maxReschedules"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              required
              className="w-32"
              defaultValue={Math.max(settings.max_reschedules, 1)}
              hint="Sin tope, un mismo turno se pasea por la agenda toda la semana."
            />
          )}

          <Field
            label="Teléfono de contacto"
            name="contactPhone"
            type="tel"
            inputMode="tel"
            maxLength={30}
            defaultValue={settings.contact_phone ?? ""}
            placeholder="0358 15 412-3456"
            hint="Adónde escribirte cuando ya es tarde para cambiarlo por su cuenta. Sin esto, el corte es una puerta cerrada sin timbre."
          />
        </CardBody>
      </Card>

      <Resultado state={state} />

      <div className="flex">
        <Guardar />
      </div>
    </form>
  );
}
