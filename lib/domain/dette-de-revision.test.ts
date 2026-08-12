import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  doitSignalerLaDette,
  joursDArriere,
  JOURS_AVANT_SIGNAL,
  suiviApresObservation,
} from "./dette-de-revision";

describe("suiviApresObservation", () => {
  it("ouvre le suivi le jour où l'arriéré s'installe", () => {
    expect(suiviApresObservation({ depuis: null }, true, "2026-04-01")).toEqual({
      depuis: "2026-04-01",
    });
  });

  it("ne réécrit rien tant que l'arriéré dure", () => {
    const suivi = { depuis: "2026-04-01" };

    expect(suiviApresObservation(suivi, true, "2026-04-05")).toBe(suivi);
  });

  it("referme le suivi dès que l'arriéré redescend", () => {
    expect(suiviApresObservation({ depuis: "2026-04-01" }, false, "2026-04-05")).toEqual({
      depuis: null,
    });
  });

  it("reste fermé quand il n'y a pas d'arriéré", () => {
    expect(suiviApresObservation({ depuis: null }, false, "2026-04-05")).toEqual({ depuis: null });
  });
});

describe("joursDArriere", () => {
  it("ne compte rien sans suivi ouvert", () => {
    expect(joursDArriere({ depuis: null }, "2026-04-05")).toBe(0);
  });

  it("compte le jour d'ouverture comme le premier", () => {
    expect(joursDArriere({ depuis: "2026-04-05" }, "2026-04-05")).toBe(1);
  });

  it("compte les jours bornes comprises", () => {
    expect(joursDArriere({ depuis: "2026-04-01" }, "2026-04-03")).toBe(3);
  });

  it("enjambe un changement de mois", () => {
    expect(joursDArriere({ depuis: "2026-03-30" }, "2026-04-02")).toBe(4);
  });

  it("ignore un suivi posé dans le futur", () => {
    expect(joursDArriere({ depuis: "2026-04-10" }, "2026-04-02")).toBe(0);
  });
});

describe("doitSignalerLaDette", () => {
  it("se tait sous le seuil", () => {
    expect(doitSignalerLaDette({ depuis: "2026-04-01" }, true, "2026-04-02")).toBe(false);
  });

  it("parle au seuil pile", () => {
    expect(doitSignalerLaDette({ depuis: "2026-04-01" }, true, "2026-04-03")).toBe(true);
  });

  it("se tait dès que l'arriéré redescend, si ancien soit-il", () => {
    expect(doitSignalerLaDette({ depuis: "2026-01-01" }, false, "2026-04-03")).toBe(false);
  });

  it("ne parle jamais sans arriéré du jour", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom("2026-01-01", "2026-04-01", "2026-04-03"), { nil: null }),
        (depuis) => !doitSignalerLaDette({ depuis }, false, "2026-04-03"),
      ),
      { numRuns: 100 },
    );
  });

  /**
   * La règle qui compte pour l'écran : un arriéré qui vient de commencer ne se
   * dit pas, et ce qu'on a dit hier se redit tant que rien n'a changé.
   */
  it("ne parle qu'à partir du jour de seuil, puis ne se dédit pas", () => {
    const suivi = { depuis: "2026-04-01" };
    const jours = ["2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05"];
    const dits = jours.map((jour) => doitSignalerLaDette(suivi, true, jour));

    expect(dits).toEqual([false, false, true, true, true]);
    expect(JOURS_AVANT_SIGNAL).toBe(3);
  });
});
