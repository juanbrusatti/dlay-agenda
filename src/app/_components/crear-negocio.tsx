"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { createTenant, type FormState } from "@/lib/actions/tenant";
import { EJEMPLOS, RUBROS, type Rubro } from "@/lib/rubros";

const INITIAL: FormState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Creando…" : "Crear mi negocio"}
    </Button>
  );
}

/**
 * Primer paso de quien entra sin ninguna negocio. Se pide un solo dato: el
 * nombre. Todo lo demás (dirección, horarios, servicios) se completa después,
 * cuando ya hay algo que mirar.
 *
 * Plus what the business does, so its examples and default reminders fit
 * from the first screen. Nothing is preselected: a psychologist who skims
 * past a default «Estética» would get the wrong reminder texts.
 */
export function CrearNegocio() {
  const [state, action] = useActionState(createTenant, INITIAL);
  const [rubro, setRubro] = useState<Rubro | null>(null);
  const ejemplos = EJEMPLOS[rubro ?? "general"];

  return (
    <Card className="max-w-lg">
      <CardBody className="grid gap-5">
        <div className="grid gap-2">
          <p className="font-hand text-[38px] leading-none text-accent-text">
            Empecemos
          </p>
          <CardTitle>¿Cómo se llama tu negocio?</CardTitle>
          <p className="text-[14.5px] leading-relaxed text-muted">
            Es el nombre que van a ver tus clientes cuando reserven un turno.
            Después se puede cambiar.
          </p>
        </div>

        <form action={action} className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[13.5px] font-medium text-ink">
              ¿A qué te dedicás?
            </legend>
            {RUBROS.map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-center gap-3 rounded-[16px] border-[1.5px] px-3.5 py-3 ${
                  rubro === r ? "border-accent bg-accent-wash" : "border-line bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="rubro"
                  value={r}
                  required
                  checked={rubro === r}
                  onChange={() => setRubro(r)}
                  className="h-5 w-5 accent-[var(--color-accent)]"
                />
                <span className="text-[14.5px] font-medium">{EJEMPLOS[r].etiqueta}</span>
              </label>
            ))}
          </fieldset>

          <Field
            label="Nombre"
            name="name"
            required
            minLength={2}
            placeholder={ejemplos.negocio}
            hint={ejemplos.negocioPista}
          />

          {state.error && (
            <p
              role="alert"
              className="rounded-[14px] bg-danger-wash px-3.5 py-2.5 text-[13.5px] text-danger"
            >
              {state.error}
            </p>
          )}

          <div className="flex">
            <Submit />
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
