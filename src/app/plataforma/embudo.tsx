import { Card, CardBody } from "@/components/ui/card";
import type { Embudo as FilaEmbudo } from "@/lib/data/cuenta";

const PASOS: [keyof Omit<FilaEmbudo, "dias">, string][] = [
  ["visitas", "Entraron a la página"],
  ["crear_cuenta", "Tocaron «Crear mi cuenta»"],
  ["whatsapp", "Tocaron «Escribinos por WhatsApp»"],
  ["registros", "Se registraron"],
  ["negocios", "Crearon su negocio"],
];

/** «12 %» of the step before, or nothing when there is nothing to compare. */
function porcentaje(valor: number, base: number): string {
  if (base <= 0) return "";
  return `${Math.round((valor / base) * 100)} %`;
}

/**
 * Where home page visitors stop: from landing to having a business. Each
 * step shows its share of the visits, so a change to the page can be judged
 * by numbers. WhatsApp is a side door, so its share is of the visits too.
 */
export function Embudo({ filas }: { filas: FilaEmbudo[] }) {
  return (
    <Card>
      <CardBody className="grid gap-3">
        <p className="text-[13px] uppercase tracking-wider text-faint">
          De la visita a la cuenta
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-[14px] tabular-nums">
            <thead>
              <tr className="text-[12px] text-faint">
                <th className="py-1.5 pr-3 text-left font-medium">Paso</th>
                {filas.map((f) => (
                  <th key={f.dias} className="px-2 py-1.5 text-right font-medium">
                    {f.dias} días
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PASOS.map(([k, texto]) => (
                <tr key={k} className="border-t-[1.5px] border-line-soft">
                  <td className="py-2 pr-3">{texto}</td>
                  {filas.map((f) => (
                    <td key={f.dias} className="px-2 py-2 text-right">
                      <span className="font-medium">{Number(f[k]).toLocaleString("es-AR")}</span>
                      {k !== "visitas" && (
                        <span className="block text-[11.5px] text-faint">
                          {porcentaje(Number(f[k]), Number(f.visitas))}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12.5px] leading-snug text-faint">
          Los toques se cuentan desde el 25 de noviembre. Los porcentajes son
          sobre las visitas del mismo período.
        </p>
      </CardBody>
    </Card>
  );
}
