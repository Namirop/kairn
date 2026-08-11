import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Mobile } from "./cairn-impulsions";
import { resoudre } from "./cairn-resolution";

const CADRE = { gauche: -100, droite: 200 };

/** Un mobile de quarante par dix, aux mêmes masses que celles d'une pierre. */
function mobile(reglages: Partial<Mobile> & { x?: number; y?: number } = {}): Mobile {
  const { x = 0, y = -5, ...reste } = reglages;
  const masse = 400;

  return {
    boite: { x, y, rotation: 0, largeur: 40, hauteur: 10 },
    vx: 0,
    vy: 0,
    vr: 0,
    masseInverse: 1 / masse,
    inertieInverse: 12 / (masse * (40 * 40 + 10 * 10)),
    ...reste,
  };
}

function mur(x: number, y: number): Mobile {
  return { ...mobile({ x, y }), masseInverse: 0, inertieInverse: 0 };
}

describe("resoudre", () => {
  it("ne signale aucun appui quand rien ne se touche", () => {
    const appuis = resoudre([mobile({ y: -60 }), mobile({ x: 120, y: -60 })], CADRE);

    expect(appuis.every((appui) => !appui.touche)).toBe(true);
  });

  it("arrête une pierre qui arrive sur le sol", () => {
    const tombe = mobile({ y: -4, vy: 120 });
    const appuis = resoudre([tombe], CADRE);

    expect(appuis[0]!.touche).toBe(true);
    // Un rebond très faible est admis, mais plus de descente.
    expect(tombe.vy).toBeLessThan(1e-6);
    expect(tombe.vy).toBeGreaterThan(-20);
  });

  /** Le cœur du sujet : sans ça, chaque pierre tombait au travers des autres. */
  it("arrête une pierre qui arrive sur une autre", () => {
    const dessous = mobile({ y: -5 });
    const dessus = mobile({ y: -14, vy: 120 });
    const appuis = resoudre([dessous, dessus], CADRE);

    expect(appuis[1]!.touche).toBe(true);
    expect(dessus.vy).toBeLessThan(120);
  });

  it("ne fait pas bouger un mur, quelle que soit la charge", () => {
    const socle = mur(0, -5);
    const dessus = mobile({ y: -14, vy: 300 });

    resoudre([socle, dessus], CADRE);

    expect(socle.vx).toBe(0);
    expect(socle.vy).toBe(0);
    expect(socle.boite.y).toBe(-5);
  });

  it("écarte deux pierres enfoncées l'une dans l'autre", () => {
    const dessous = mobile({ y: -5 });
    const dessus = mobile({ y: -11 });
    const avant = dessus.boite.y - dessous.boite.y;

    resoudre([dessous, dessus], CADRE);

    expect(Math.abs(dessus.boite.y - dessous.boite.y)).toBeGreaterThan(Math.abs(avant));
  });

  it("repousse à l'intérieur ce qui a franchi un bord", () => {
    const dehors = mobile({ x: CADRE.droite + 5 });
    const appuis = resoudre([dehors], CADRE);

    expect(appuis[0]!.touche).toBe(true);
    expect(dehors.boite.x).toBeLessThan(CADRE.droite + 5);
  });

  /**
   * Une résolution ne rend jamais de la vitesse : la seule source d'énergie de
   * la scène est le geste, et un solveur qui en ajoute finit par tout envoyer
   * en l'air. Le rebond, très faible, borne ce que le contact peut rendre.
   */
  it("ne rend jamais plus d'énergie qu'elle n'en reçoit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -300, max: 300 }),
        fc.integer({ min: 0, max: 300 }),
        fc.integer({ min: -12, max: -3 }),
        (vx, vy, y) => {
          const solide = mobile({ y, vx, vy });
          const avant = Math.hypot(vx, vy);

          resoudre([solide, mur(0, -1)], CADRE);

          expect(Math.hypot(solide.vx, solide.vy)).toBeLessThanOrEqual(avant + 1e-6);
        },
      ),
      { numRuns: 120 },
    );
  });

  it("rend le même résultat pour la même image", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: 200 }),
        fc.integer({ min: -30, max: 30 }),
        (vx, ecart) => {
          const jouer = () => {
            const bas = mobile({ y: -5 });
            const haut = mobile({ x: ecart, y: -13, vx, vy: 90 });
            resoudre([bas, haut], CADRE);
            return [bas, haut];
          };

          expect(jouer()).toEqual(jouer());
        },
      ),
      { numRuns: 60 },
    );
  });
});
