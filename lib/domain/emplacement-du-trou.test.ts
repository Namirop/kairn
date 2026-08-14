import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { emplacementDuTexteATrou, FACETTES_DU_LOT } from "./emplacement-du-trou";
import { cibleDuVraiOuFaux } from "./vrai-ou-faux";

const TIRAGES = 1000;

describe("emplacementDuTexteATrou", () => {
  it("rend toujours une facette du lot", () => {
    fc.assert(
      fc.property(fc.string(), (graine) => {
        expect(FACETTES_DU_LOT).toContain(emplacementDuTexteATrou(graine));
      }),
    );
  });

  it("rend le même emplacement pour la même graine", () => {
    fc.assert(
      fc.property(fc.string(), (graine) => {
        expect(emplacementDuTexteATrou(graine)).toBe(emplacementDuTexteATrou(graine));
      }),
    );
  });

  it("répartit les quatre facettes, sans en oublier ni en privilégier une", () => {
    // Sans ça, une facette pourrait ne jamais porter de trou — le défaut que le
    // tirage existe pour éviter, transposé d'un cran.
    const tires = Array.from({ length: TIRAGES }, (_, rang) =>
      emplacementDuTexteATrou(`atome-${rang}`),
    );

    // Trois écarts-types d'une binomiale(1000, 0,25) : ~41.
    for (const facette of FACETTES_DU_LOT) {
      const compte = tires.filter((tire) => tire === facette).length;

      expect(compte).toBeGreaterThan(TIRAGES / 4 - 41);
      expect(compte).toBeLessThan(TIRAGES / 4 + 41);
    }
  });

  it("ne suit pas la cible du vrai ou faux, qui part de la même graine", () => {
    // Les deux tirages dérivent du même identifiant. S'ils étaient corrélés,
    // une facette porterait le trou exactement quand l'affirmation doit être
    // vraie, et deux propriétés indépendantes n'en feraient plus qu'une.
    const tires = Array.from({ length: TIRAGES }, (_, rang) => {
      const graine = `atome-${rang}`;

      return { facette: emplacementDuTexteATrou(graine), vraie: cibleDuVraiOuFaux(graine) };
    });

    for (const facette of FACETTES_DU_LOT) {
      const sousFacette = tires.filter((tire) => tire.facette === facette);
      const vraies = sousFacette.filter((tire) => tire.vraie).length;

      // Quatre écarts-types d'une binomiale(~250, 0,5) : ~32.
      expect(Math.abs(vraies - sousFacette.length / 2)).toBeLessThan(32);
    }
  });
});
