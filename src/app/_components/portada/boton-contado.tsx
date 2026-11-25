"use client";

import Link from "next/link";
import { contarClic, type BotonPortada } from "./contar-clic";

/**
 * A home page link that also counts the tap. Internal links stay Next links;
 * WhatsApp opens in a new tab.
 */
export function EnlaceContado({
  boton,
  href,
  className,
  externo = false,
  children,
  ...props
}: {
  boton: BotonPortada;
  href: string;
  className?: string;
  externo?: boolean;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"a">, "href" | "onClick">) {
  if (externo) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => contarClic(boton)}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={() => contarClic(boton)} {...props}>
      {children}
    </Link>
  );
}
