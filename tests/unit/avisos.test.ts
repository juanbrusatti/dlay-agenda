import { describe, expect, it } from "vitest";
import { incluye, nuevoAlcance } from "@/lib/avisos";

const ACTIVOS = ["depi", "masaje", "cutis"];
const TODOS = { id: "r", enabled: true, service_ids: [] };
const APAGADA = { id: "r", enabled: false, service_ids: [] };

describe("incluye", () => {
  it("una regla con la lista vacía avisa a todos", () => {
    expect(incluye(TODOS, "depi")).toBe(true);
  });

  it("una regla apagada no avisa a nadie, aunque nombre el servicio", () => {
    expect(incluye({ ...APAGADA, service_ids: ["depi"] }, "depi")).toBe(false);
  });

  it("sin regla no hay aviso", () => {
    expect(incluye(null, "depi")).toBe(false);
  });
});

describe("nuevoAlcance", () => {
  it("apagar uno de «todos» deja la lista con los demás", () => {
    expect(nuevoAlcance(TODOS, ACTIVOS, ["masaje"], false)).toEqual({
      enabled: true,
      service_ids: ["depi", "cutis"],
    });
  });

  it("prender uno en una regla apagada la prende sólo para ese", () => {
    expect(nuevoAlcance(APAGADA, ACTIVOS, ["depi"], true)).toEqual({
      enabled: true,
      service_ids: ["depi"],
    });
  });

  it("apagar el último apaga la regla en vez de dejarla en «todos»", () => {
    const una = { enabled: true, service_ids: ["depi"] };
    expect(nuevoAlcance(una, ACTIVOS, ["depi"], false)).toEqual({
      enabled: false,
      service_ids: [],
    });
  });

  it("cuando quedan todos prendidos vuelve a «todos», así entran los nuevos", () => {
    const dos = { enabled: true, service_ids: ["depi", "masaje"] };
    expect(nuevoAlcance(dos, ACTIVOS, ["cutis"], true)).toEqual({
      enabled: true,
      service_ids: [],
    });
  });

  it("prender todos de una vez en una regla apagada", () => {
    expect(nuevoAlcance(APAGADA, ACTIVOS, ACTIVOS, true)).toEqual({
      enabled: true,
      service_ids: [],
    });
  });

  it("un servicio desactivado que estaba en la lista no impide llegar a «todos»", () => {
    const conViejo = { enabled: true, service_ids: ["viejo", "depi", "masaje"] };
    expect(nuevoAlcance(conViejo, ACTIVOS, ["cutis"], true)).toEqual({
      enabled: true,
      service_ids: [],
    });
  });
});
