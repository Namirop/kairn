import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ECART_SANS_FONDU, hauteurDuFondu } from "./fondu-de-passage";
import { type Surface, VALEURS } from "./valeur-de-surface";

const SURFACES: Surface[] = ["papier", "ombre", "lichen", "roche"];

describe("hauteurDuFondu", () => {
  /**
   * Le cas de la production : ces deux-là se séparent par la seule strate
   * depuis le début, et personne ne l'a jamais trouvée brutale.
   */
  it("ne fond pas entre le papier et l'ombre", () => {
    expect(hauteurDuFondu("papier", "ombre")).toBe(0);
    expect(hauteurDuFondu("ombre", "papier")).toBe(0);
  });

  it("ne fond pas entre le papier et le lichen, ni entre l'ombre et le lichen", () => {
    expect(hauteurDuFondu("papier", "lichen")).toBe(0);
    expect(hauteurDuFondu("ombre", "lichen")).toBe(0);
  });

  /** L'écart qui a fait ouvrir ce module : douze fois celui du papier. */
  it("fond longuement vers la roche", () => {
    expect(hauteurDuFondu("ombre", "roche")).toBeGreaterThan(180);
    expect(hauteurDuFondu("papier", "roche")).toBeGreaterThan(180);
  });

  it("ne fond pas une surface avec elle-même", () => {
    for (const surface of SURFACES) expect(hauteurDuFondu(surface, surface)).toBe(0);
  });

  it("rend la même hauteur dans les deux sens", () => {
    fc.assert(
      fc.property(fc.constantFrom(...SURFACES), fc.constantFrom(...SURFACES), (de, vers) => {
        expect(hauteurDuFondu(de, vers)).toBe(hauteurDuFondu(vers, de));
      }),
    );
  });

  it("ne rend jamais une hauteur intermédiaire entre zéro et le minimum", () => {
    fc.assert(
      fc.property(fc.constantFrom(...SURFACES), fc.constantFrom(...SURFACES), (de, vers) => {
        const hauteur = hauteurDuFondu(de, vers);
        const ecart = Math.abs(VALEURS[de] - VALEURS[vers]);

        // Soit la strate suffit, soit le fondu a de quoi faire tourner une
        // couleur. Entre les deux, il n'y a rien d'utile.
        expect(hauteur === 0 || hauteur >= 72).toBe(true);
        expect(hauteur === 0).toBe(ecart <= ECART_SANS_FONDU);
      }),
    );
  });

  it("fond d'autant plus que l'écart est grand", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SURFACES),
        fc.constantFrom(...SURFACES),
        fc.constantFrom(...SURFACES),
        fc.constantFrom(...SURFACES),
        (a, b, c, d) => {
          const petit = Math.abs(VALEURS[a] - VALEURS[b]);
          const grand = Math.abs(VALEURS[c] - VALEURS[d]);

          if (petit > grand) return;

          expect(hauteurDuFondu(a, b)).toBeLessThanOrEqual(hauteurDuFondu(c, d));
        },
      ),
    );
  });
});
