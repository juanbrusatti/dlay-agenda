"use client";

import { createContext, useContext } from "react";
import { EJEMPLOS, type Ejemplos, type Rubro } from "@/lib/rubros";

/**
 * The current business's rubro, for client forms deep in the tree.
 *
 * Set once in the private layout, so no form has to receive it as a prop.
 * Outside the provider it reads as an estética, which is what every screen
 * showed before rubros existed.
 */
const RubroContext = createContext<Rubro>("estetica");

export function RubroProvider({
  rubro,
  children,
}: {
  rubro: Rubro;
  children: React.ReactNode;
}) {
  return <RubroContext.Provider value={rubro}>{children}</RubroContext.Provider>;
}

/** The examples that fit the current business. */
export function useEjemplos(): Ejemplos {
  return EJEMPLOS[useContext(RubroContext)];
}
