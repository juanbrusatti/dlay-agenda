import { describe, expect, it } from "vitest";
import { esHoraAgendable, linkAgendar } from "@/lib/agendar";
import { aHora, aMinutos, horasDeInicio, huecosLibres, minutoDelDia } from "@/lib/huecos";
import { diaSugerido, semanasSugeridas } from "@/lib/proximo";
import { mensajeRecuperar, plazoDe } from "@/lib/recuperar";

const h = (desde: string, hasta: string) => ({ desde: aMinutos(desde), hasta: aMinutos(hasta) });
const texto = (t: { desde: number; hasta: number }[]) =>
  t.map((x) => `${aHora(x.desde)}-${aHora(x.hasta)}`);

describe("huecosLibres", () => {
  it("leaves the gaps around what is booked", () => {
    expect(
      texto(huecosLibres({ abierto: [h("09:00", "19:00")], ocupado: [h("12:00", "13:00")] })),
    ).toEqual(["09:00-12:00", "13:00-19:00"]);
  });

  it("respects split opening hours and blocks", () => {
    expect(
      texto(
        huecosLibres({
          abierto: [h("10:00", "11:30"), h("14:00", "17:00")],
          ocupado: [h("10:00", "11:00"), h("15:00", "15:45"), h("15:30", "16:00")],
        }),
      ),
    ).toEqual(["11:00-11:30", "14:00-15:00", "16:00-17:00"]);
  });

  it("skips gaps shorter than half an hour and starts from now, rounded to five", () => {
    expect(
      texto(
        huecosLibres({
          abierto: [h("09:00", "19:00")],
          ocupado: [h("09:00", "12:00"), h("12:20", "18:40")],
          desde: aMinutos("11:03"),
        }),
      ),
    ).toEqual([]);
    expect(
      texto(huecosLibres({ abierto: [h("09:00", "12:00")], ocupado: [], desde: aMinutos("11:03") })),
    ).toEqual(["11:05-12:00"]);
  });

  it("offers nothing on a closed day", () => {
    expect(huecosLibres({ abierto: [], ocupado: [] })).toEqual([]);
  });
});

describe("minutoDelDia", () => {
  const tz = "America/Argentina/Cordoba";
  it("places instants inside the business day", () => {
    expect(minutoDelDia("2026-11-20T15:00:00Z", "2026-11-20", tz)).toBe(12 * 60);
    expect(minutoDelDia("2026-11-20T02:00:00Z", "2026-11-20", tz)).toBe(0); // 23:00 the day before
    expect(minutoDelDia("2026-11-21T03:30:00Z", "2026-11-20", tz)).toBe(24 * 60); // 00:30 next day
  });
});

describe("próximo turno", () => {
  it("follows the client's own rhythm", () => {
    expect(semanasSugeridas(28, "estetica")).toBe(4);
    expect(semanasSugeridas(15, "estetica")).toBe(2);
    expect(semanasSugeridas(200, "estetica")).toBe(12);
  });

  it("uses what is usual for the rubro on a first visit", () => {
    expect(semanasSugeridas(null, "estetica")).toBe(4);
    expect(semanasSugeridas(null, "psicologia")).toBe(1);
    expect(semanasSugeridas(0, "estetica")).toBe(4);
  });

  it("never suggests a day that already passed", () => {
    expect(diaSugerido("2026-10-30", 4, "2026-11-20")).toBe("2026-11-27");
    expect(diaSugerido("2026-10-01", 1, "2026-11-20")).toBe("2026-11-26");
    expect(diaSugerido("2026-11-13", 1, "2026-11-20")).toBe("2026-11-27");
  });
});

describe("links into «Agendar turno»", () => {
  it("only carries times the form accepts", () => {
    expect(esHoraAgendable("13:00")).toBe(true);
    expect(esHoraAgendable("09:01")).toBe(false);
    expect(esHoraAgendable("25:00")).toBe(false);
    expect(linkAgendar({ dia: "2026-11-20", hora: "09:01", cliente: "x" })).toBe(
      "/agenda/nuevo?dia=2026-11-20&cliente=x",
    );
    expect(linkAgendar({ dia: "2026-11-20", hora: "13:00" })).toBe(
      "/agenda/nuevo?dia=2026-11-20&hora=13%3A00",
    );
  });
});

describe("para recuperar", () => {
  it("falls back to 45 days on anything unexpected", () => {
    expect(plazoDe("60")).toBe(60);
    expect(plazoDe("7")).toBe(45);
    expect(plazoDe(undefined)).toBe(45);
  });

  it("keeps the psychology message discreet", () => {
    const m = mensajeRecuperar("psicologia", "Sofía", "Lic. Paula Ríos");
    expect(m).not.toContain("Paula");
    expect(m).not.toMatch(/terapia|sesión|psic/i);
    expect(mensajeRecuperar("estetica", "Sofía", "Estudio Malva")).toContain("Estudio Malva");
  });
});

describe("horasDeInicio", () => {
  const h2 = (desde: string, hasta: string) => ({ desde: aMinutos(desde), hasta: aMinutos(hasta) });

  it("offers each gap's start and then every half hour that still fits", () => {
    expect(horasDeInicio([h2("09:00", "11:00")], 60)).toEqual(["09:00", "09:30", "10:00"]);
    expect(horasDeInicio([h2("10:10", "12:00")], 60)).toEqual(["10:10", "10:30", "11:00"]);
  });

  it("skips gaps too short for the booking", () => {
    expect(horasDeInicio([h2("09:00", "09:40"), h2("14:00", "15:00")], 60)).toEqual(["14:00"]);
  });
});
