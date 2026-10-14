import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { debutDuJourUtc, ilYA } from "./fenetre-utc";
import { jourLocal } from "./jour-local";

describe("ilYA", () => {
  it("recule du nombre de jours demandé", () => {
    expect(ilYA(new Date("2026-08-13T10:30:00.000Z"), 7).toISOString()).toBe(
      "2026-08-06T10:30:00.000Z",
    );
  });

  it("enjambe un changement de mois et une année bissextile", () => {
    expect(ilYA(new Date("2026-03-03T00:00:00.000Z"), 5).toISOString()).toBe(
      "2026-02-26T00:00:00.000Z",
    );
    expect(ilYA(new Date("2028-03-01T12:00:00.000Z"), 1).toISOString()).toBe(
      "2028-02-29T12:00:00.000Z",
    );
  });

  it("ne bouge pas pour zéro jour", () => {
    const instant = new Date("2026-08-13T10:30:00.000Z");

    expect(ilYA(instant, 0).getTime()).toBe(instant.getTime());
  });
});

describe("debutDuJourUtc", () => {
  it("ramène à minuit UTC, quelle que soit l'heure", () => {
    expect(debutDuJourUtc(new Date("2026-08-13T23:59:59.999Z")).toISOString()).toBe(
      "2026-08-13T00:00:00.000Z",
    );
    expect(debutDuJourUtc(new Date("2026-08-13T00:00:00.000Z")).toISOString()).toBe(
      "2026-08-13T00:00:00.000Z",
    );
  });

  /**
   * Le piège que cette fonction existe pour éviter : un instant du soir en UTC
   * appartient déjà au lendemain dans les fuseaux à l'est, et à la veille dans
   * ceux à l'ouest. Le résultat ne doit dépendre que de l'instant.
   */
  it("ne dépend pas du fuseau, seulement de l'instant", () => {
    const veilleAlOuest = new Date("2026-08-13T02:00:00.000Z");
    const lendemainALEst = new Date("2026-08-13T22:00:00.000Z");

    expect(debutDuJourUtc(veilleAlOuest).toISOString()).toBe("2026-08-13T00:00:00.000Z");
    expect(debutDuJourUtc(lendemainALEst).toISOString()).toBe("2026-08-13T00:00:00.000Z");
  });

  it("est idempotente : le début d'un début est le même début", () => {
    const debut = debutDuJourUtc(new Date("2026-08-13T17:45:12.345Z"));

    expect(debutDuJourUtc(debut).getTime()).toBe(debut.getTime());
  });

  /**
   * Un instant invalide n'est pas un instant : la fonction lève plutôt que de
   * rendre une date invalide de plus.
   *
   * Ce cas a été trouvé par la propriété ci-dessous, qui tirait des `Invalid
   * Date` sans qu'on l'ait demandé. La propriété a été resserrée à son vrai
   * domaine, et le cas qu'elle avait exhibé gardé ici : c'est l'échec bruyant
   * qui compte, parce qu'une date invalide propagée jusqu'à une requête SQL n'y
   * ressemblerait plus à rien.
   */
  it("lève sur un instant invalide plutôt que de propager le NaN", () => {
    expect(() => debutDuJourUtc(new Date(Number.NaN))).toThrow();
  });

  /**
   * Deux propriétés qui tiennent ensemble : le début du jour tombe toujours dans
   * le passé ou sur l'instant lui-même, et il porte la même étiquette de jour.
   * Prises séparément, chacune se satisfait d'une fonction fausse.
   */
  it("reste dans le même jour UTC, jamais après l'instant", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2000-01-01"),
          max: new Date("2100-01-01"),
          // `fc.date()` tire des `Invalid Date` par défaut, bornes comprises. Le
          // domaine de la fonction, ce sont les instants — l'invalide a son
          // propre cas plus haut.
          noInvalidDate: true,
        }),
        (quand) => {
          const debut = debutDuJourUtc(quand);

          expect(debut.getTime()).toBeLessThanOrEqual(quand.getTime());
          expect(jourLocal(debut, "UTC")).toBe(jourLocal(quand, "UTC"));
          expect(quand.getTime() - debut.getTime()).toBeLessThan(24 * 60 * 60 * 1000);
        },
      ),
      { numRuns: 300 },
    );
  });
});
