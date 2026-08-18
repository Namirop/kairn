import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { seuilAtteint } from "./seuil-de-plafond";

describe("seuilAtteint", () => {
  it("ne dit rien tant que la journée n'a rien de remarquable", () => {
    expect(seuilAtteint(0, 50)).toBe(null);
    expect(seuilAtteint(34, 50)).toBe(null);
  });

  /**
   * Le cas qu'une comparaison en pourcentage rate : trente-cinq sur cinquante
   * fait exactement soixante-dix pour cent, et vaut 69,99999999999999 en virgule
   * flottante. C'est le seul test de ce fichier qui ait trouvé un vrai bug.
   */
  it("part pile au seuil, y compris là où le flottant se trompe", () => {
    expect(seuilAtteint(35, 50)).toBe(70);
    expect(seuilAtteint(7, 10)).toBe(70);
    expect(seuilAtteint(21, 30)).toBe(70);
    expect(seuilAtteint(63, 90)).toBe(70);
  });

  it("monte de seuil quand le compteur monte", () => {
    expect(seuilAtteint(35, 50)).toBe(70);
    expect(seuilAtteint(44, 50)).toBe(70);
    expect(seuilAtteint(45, 50)).toBe(90);
    expect(seuilAtteint(49, 50)).toBe(90);
    expect(seuilAtteint(50, 50)).toBe(100);
  });

  it("rend le plus haut seuil atteint, pas le premier franchi", () => {
    // Un envoi groupé peut sauter des seuils : celui de quatre-vingt-dix porte
    // les mêmes chiffres que celui de soixante-dix, et il est plus urgent.
    expect(seuilAtteint(48, 50)).toBe(90);
  });

  it("reste à cent au-delà du plafond", () => {
    // La réservation refuse de dépasser, mais rien n'interdit qu'un plafond soit
    // abaissé en cours de journée sous ce qui est déjà consommé.
    expect(seuilAtteint(80, 50)).toBe(100);
  });

  it("ne rend rien sur un plafond absurde", () => {
    expect(seuilAtteint(10, 0)).toBe(null);
    expect(seuilAtteint(10, -5)).toBe(null);
  });

  it("ne rend jamais un seuil que la proportion n'atteint pas", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 1, max: 10_000 }),
        (utilisees, plafond) => {
          const seuil = seuilAtteint(utilisees, plafond);

          if (seuil === null) {
            expect(utilisees * 100).toBeLessThan(70 * plafond);
            return;
          }

          expect(utilisees * 100).toBeGreaterThanOrEqual(seuil * plafond);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("ne redescend jamais quand le compteur monte", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000 }),
        fc.integer({ min: 0, max: 5_000 }),
        fc.integer({ min: 0, max: 5_000 }),
        (plafond, a, b) => {
          const bas = Math.min(a, b);
          const haut = Math.max(a, b);
          // Le seuil est sa propre gravité : soixante-dix, quatre-vingt-dix,
          // cent. Rien à traduire, et l'absence de seuil vaut zéro.
          const gravite = (seuil: number | null) => seuil ?? 0;

          expect(gravite(seuilAtteint(haut, plafond))).toBeGreaterThanOrEqual(
            gravite(seuilAtteint(bas, plafond)),
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
