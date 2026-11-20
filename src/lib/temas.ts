/**
 * Seasonal looks an account can wear for a while. Dlay turns them on per
 * account from the platform panel; null is the usual look.
 *
 * No `server-only`: the decorations are client components.
 */

export const TEMAS = ["fiestas"] as const;

export type Tema = (typeof TEMAS)[number];

/** Anything unknown, or nothing, is the usual look. */
export function temaDe(valor: string | null | undefined): Tema | null {
  return (TEMAS as readonly string[]).includes(valor ?? "") ? (valor as Tema) : null;
}
