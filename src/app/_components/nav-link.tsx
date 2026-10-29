"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export function NavLink({
  href,
  children,
  guia,
}: {
  href: string;
  children: ReactNode;
  /** Ancla para el recorrido de bienvenida. */
  guia?: string;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const ref = useRef<HTMLAnchorElement>(null);

  // En el teléfono las secciones se deslizan de costado: la que está abierta
  // tiene que quedar a la vista, no escondida detrás del borde.
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    const nav = el?.parentElement;
    if (!el || !nav || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2 });
  }, [active]);

  return (
    <Link
      ref={ref}
      href={href}
      aria-current={active ? "page" : undefined}
      data-guia={guia}
      className={`shrink-0 whitespace-nowrap rounded-pill px-3.5 py-1.5 text-[13.5px] font-medium ${
        active
          ? "bg-accent text-on-accent"
          : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
