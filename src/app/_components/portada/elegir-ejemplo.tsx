import Link from "next/link";
import { RUBROS, type Rubro } from "@/lib/rubros";
import { NOMBRE_EJEMPLO } from "./ejemplos";

/**
 * «Mirá el ejemplo más parecido a lo tuyo»: swaps the made-up business the
 * demos run on. Plain links (`/?para=…`), so it works without JavaScript, can
 * be shared, and keeps the page where it is.
 */
export function ElegirEjemplo({ actual }: { actual: Rubro }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Ejemplo de negocio">
      <span className="mr-1 text-[13.5px] text-muted">Ver el ejemplo de:</span>
      {RUBROS.map((r) => (
        <Link
          key={r}
          href={r === "estetica" ? "/" : `/?para=${r}`}
          scroll={false}
          replace
          aria-current={r === actual ? "true" : undefined}
          className={`rounded-pill border-[1.5px] px-3.5 py-1.5 text-[13px] font-medium ${
            r === actual
              ? "border-accent bg-accent text-on-accent"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          {NOMBRE_EJEMPLO[r]}
        </Link>
      ))}
    </div>
  );
}
