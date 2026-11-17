import { Card, CardBody } from "@/components/ui/card";
import type { VisitasPortada } from "@/lib/data/cuenta";

const PAGINA: Record<VisitasPortada["ruta"], string> = {
  "/": "Inicio",
  "/psicologos": "Psicólogos",
};

const COLUMNAS: [keyof Omit<VisitasPortada, "ruta" | "desde">, string][] = [
  ["hoy", "Hoy"],
  ["ayer", "Ayer"],
  ["semana", "7 días"],
  ["mes", "30 días"],
  ["total", "Total"],
];

/**
 * Visits to the public home pages: how many people land before signing up.
 * Counted once per tab session, and only by people who are not signed in.
 */
export function Visitas({ filas }: { filas: VisitasPortada[] }) {
  const desde = filas
    .map((f) => f.desde)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return (
    <Card>
      <CardBody className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[13px] uppercase tracking-wider text-faint">
            Visitas a la página
          </p>
          <p className="text-[12.5px] text-faint">
            {desde
              ? `Contando desde el ${new Date(`${desde}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}`
              : "Todavía no entró nadie desde que se empezó a contar."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-[14px] tabular-nums">
            <thead>
              <tr className="text-[12px] text-faint">
                <th className="py-1.5 pr-3 text-left font-medium">Página</th>
                {COLUMNAS.map(([k, t]) => (
                  <th key={k} className="px-2 py-1.5 text-right font-medium">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.ruta} className="border-t-[1.5px] border-line-soft">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{PAGINA[f.ruta] ?? f.ruta}</span>
                    <span className="block text-[12px] text-faint">dlay-agenda.vercel.app{f.ruta === "/" ? "" : f.ruta}</span>
                  </td>
                  {COLUMNAS.map(([k]) => (
                    <td
                      key={k}
                      className={`px-2 py-2 text-right ${k === "total" ? "font-semibold" : ""}`}
                    >
                      {f[k].toLocaleString("es-AR")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
