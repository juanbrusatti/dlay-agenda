/**
 * A real account's first month, in three numbers. Taken from the database by
 * hand and written here on purpose: the page stays static (free to serve),
 * and the numbers only change when we decide to update them.
 *
 * Without the business's name until they say it can go public.
 */
const CASO = {
  quien: "una estética de Río Cuarto",
  periodo: "del 29 de octubre al 25 de noviembre de 2026",
  datos: [
    ["250", "recordatorios enviados por WhatsApp, y ninguno falló"],
    ["53", "turnos que los clientes confirmaron solos, sin que ella tuviera que escribir"],
    ["12", "avisos de «no puedo ir» con tiempo, para darle el horario a otra persona"],
  ] as const,
};

export function CasoReal() {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {CASO.datos.map(([numero, texto]) => (
          <div key={numero} className="rounded-card border-[1.5px] border-line bg-surface p-5">
            <p className="text-[40px] font-bold leading-none tracking-[-0.04em] text-accent-text tabular-nums">
              {numero}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{texto}</p>
          </div>
        ))}
      </div>
      <p className="text-[12.5px] text-faint">
        Datos reales de la cuenta de {CASO.quien}, {CASO.periodo}.
      </p>
    </div>
  );
}

export const TITULO_CASO = `Así le fue a ${CASO.quien} en su primer mes.`;
