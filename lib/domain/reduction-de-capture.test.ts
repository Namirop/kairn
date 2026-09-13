import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dimensionsReduites } from "./reduction-de-capture";

const BORD = 1568;

describe("dimensionsReduites", () => {
  it("laisse intacte une image plus petite que le bord", () => {
    expect(dimensionsReduites({ largeur: 800, hauteur: 600 }, BORD)).toEqual({
      largeur: 800,
      hauteur: 600,
    });
  });

  it("laisse intacte une image posée exactement sur le bord", () => {
    expect(dimensionsReduites({ largeur: BORD, hauteur: 900 }, BORD)).toEqual({
      largeur: BORD,
      hauteur: 900,
    });
  });

  it("ramène le bord long à la mesure, en portrait comme en paysage", () => {
    expect(dimensionsReduites({ largeur: 1179, hauteur: 2556 }, BORD).hauteur).toBe(BORD);
    expect(dimensionsReduites({ largeur: 3840, hauteur: 2160 }, BORD).largeur).toBe(BORD);
  });

  it("ne rend jamais un côté nul sur une image très allongée", () => {
    const rendu = dimensionsReduites({ largeur: 20000, hauteur: 3 }, BORD);

    expect(rendu.largeur).toBe(BORD);
    expect(rendu.hauteur).toBeGreaterThanOrEqual(1);
  });

  it("rend la mesure d'origine quand le décodeur n'a pas su la dire", () => {
    expect(dimensionsReduites({ largeur: 0, hauteur: 0 }, BORD)).toEqual({
      largeur: 0,
      hauteur: 0,
    });
    expect(dimensionsReduites({ largeur: Number.NaN, hauteur: 10 }, BORD)).toEqual({
      largeur: Number.NaN,
      hauteur: 10,
    });
  });

  it("ne grandit jamais et tient le bord, quelle que soit l'image", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30000 }),
        fc.integer({ min: 1, max: 30000 }),
        fc.integer({ min: 1, max: 4000 }),
        (largeur, hauteur, bord) => {
          const rendu = dimensionsReduites({ largeur, hauteur }, bord);

          expect(rendu.largeur).toBeLessThanOrEqual(largeur);
          expect(rendu.hauteur).toBeLessThanOrEqual(hauteur);
          expect(Math.max(rendu.largeur, rendu.hauteur)).toBeLessThanOrEqual(
            Math.max(largeur, hauteur),
          );
          expect(rendu.largeur).toBeGreaterThanOrEqual(1);
          expect(rendu.hauteur).toBeGreaterThanOrEqual(1);
        },
      ),
    );
  });

  it("pose le bord long sur la mesure et le petit côté à sa proportion", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: BORD + 1, max: 30000 }),
        fc.integer({ min: 1, max: 30000 }),
        (unCote, autreCote) => {
          const rendu = dimensionsReduites({ largeur: unCote, hauteur: autreCote }, BORD);
          const long = Math.max(unCote, autreCote);
          const court = Math.min(unCote, autreCote);

          // Le bord long tombe exactement sur la mesure : c'est ce qui borne le
          // poids de l'envoi, et un « à peu près » ne bornerait rien.
          expect(Math.max(rendu.largeur, rendu.hauteur)).toBe(BORD);

          // Le petit côté suit la proportion à l'arrondi près, et cet arrondi
          // ne peut que monter — jamais rendre un côté nul.
          const exact = (court * BORD) / long;

          expect(Math.min(rendu.largeur, rendu.hauteur)).toBeGreaterThanOrEqual(Math.min(1, exact));
          expect(Math.min(rendu.largeur, rendu.hauteur) - exact).toBeLessThan(1);
        },
      ),
    );
  });
});
