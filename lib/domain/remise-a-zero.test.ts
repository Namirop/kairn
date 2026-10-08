import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { joursAvantLaBascule, quandRepartLeCompteur } from "./remise-a-zero";

describe("joursAvantLaBascule", () => {
  it("compte les jours pleins jusqu'au basculement", () => {
    expect(joursAvantLaBascule("2026-09-01", "2026-09-12")).toBe(11);
  });

  it("rend zéro le jour du basculement", () => {
    expect(joursAvantLaBascule("2026-09-12", "2026-09-12")).toBe(0);
  });

  it("ne rend jamais de négatif sur une période déjà passée", () => {
    expect(joursAvantLaBascule("2026-09-20", "2026-09-12")).toBe(0);
  });

  /**
   * Les journées locales font 23 ou 25 heures aux changements d'heure. Le calcul
   * passe par minuit UTC des étiquettes de jour, pas par des heures locales :
   * l'étiquette avance toujours d'un cran.
   */
  it("enjambe les changements d'heure sans perdre ni gagner un jour", () => {
    expect(joursAvantLaBascule("2026-03-28", "2026-03-30")).toBe(2);
    expect(joursAvantLaBascule("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("enjambe un changement d'année", () => {
    expect(joursAvantLaBascule("2026-12-28", "2027-01-04")).toBe(7);
  });
});

describe("quandRepartLeCompteur", () => {
  it("dit demain à un jour", () => {
    expect(quandRepartLeCompteur("2026-09-11", "2026-09-12")).toEqual({
      quand: "jours",
      nombre: 1,
    });
  });

  it("compte en jours tant que c'est proche", () => {
    expect(quandRepartLeCompteur("2026-09-08", "2026-09-12")).toEqual({
      quand: "jours",
      nombre: 4,
    });
  });

  /** Au-delà d'une semaine, « dans 26 jours » se convertit de tête : on nomme. */
  it("nomme la date quand elle est lointaine", () => {
    expect(quandRepartLeCompteur("2026-08-17", "2026-09-12")).toEqual({
      quand: "date",
      jour: "2026-09-12",
    });
  });

  it("ne promet rien de faux le jour même", () => {
    expect(quandRepartLeCompteur("2026-09-12", "2026-09-12")).toEqual({ quand: "instant" });
  });

  it("ne compte jamais en jours au-delà d'une semaine, ni à zéro jour", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2025-01-01"), max: new Date("2028-12-31"), noInvalidDate: true }),
        fc.integer({ min: -400, max: 400 }),
        (jour, ecart) => {
          const aujourdhui = jour.toISOString().slice(0, 10);
          const fin = new Date(jour.getTime() + ecart * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);

          const remise = quandRepartLeCompteur(aujourdhui, fin);

          return remise.quand !== "jours" || (remise.nombre >= 1 && remise.nombre <= 7);
        },
      ),
      { numRuns: 300 },
    );
  });
});
