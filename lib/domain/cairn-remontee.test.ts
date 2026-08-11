import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { avancer, cairnRenverse, initialiser, renverser, toutEstPose } from "./cairn-physique";
import { remonter } from "./cairn-remontee";
import { empiler } from "./cairn-stack";

const PIERRES = empiler(6).pierres;

/** Un éboulis complet, mené jusqu'à l'immobilité. */
function eboulis() {
  let etat = renverser(initialiser(PIERRES), 0, { vx: 60, vy: 0 });

  for (let i = 0; i < 900 && !toutEstPose(etat); i += 1) {
    etat = avancer(etat, PIERRES, 1 / 60);
  }

  return etat;
}

describe("remonter", () => {
  it("ramène les pierres à leur place et les remet au repos", () => {
    let corps = eboulis();

    for (let i = 0; i < 600 && cairnRenverse(corps); i += 1) {
      corps = remonter(corps, PIERRES, 1 / 60);
    }

    expect(cairnRenverse(corps)).toBe(false);
    expect(corps).toEqual(initialiser(PIERRES));
  });

  it("ne touche pas à ce qui n'est jamais tombé", () => {
    const debout = initialiser(PIERRES);

    expect(remonter(debout, PIERRES, 1 / 60)).toEqual(debout);
  });

  it("ne déplace rien sur un pas de temps négatif", () => {
    const tombe = eboulis();
    const apres = remonter(tombe, PIERRES, -3);

    // Les vitesses, elles, sont bien remises à zéro : dès qu'on remonte, une
    // pierre n'a plus d'élan propre, elle suit le rappel.
    apres.forEach((solide, index) => {
      expect(solide.x).toBe(tombe[index]!.x);
      expect(solide.y).toBe(tombe[index]!.y);
      expect(solide.rotation).toBe(tombe[index]!.rotation);
    });
  });

  /**
   * La propriété qui compte : le retour rapproche, toujours. Une interpolation
   * dont le facteur dépasserait un ferait dépasser la cible, et le cairn se
   * reconstruirait en oscillant autour de sa forme.
   */
  it("rapproche chaque pierre de sa place à chaque pas, sans jamais la dépasser", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), (millisecondes) => {
        const avant = eboulis();
        const apres = remonter(avant, PIERRES, millisecondes / 1000);

        apres.forEach((solide, index) => {
          const pierre = PIERRES[index]!;
          const ecartAvant = Math.hypot(avant[index]!.x - pierre.x, avant[index]!.y - pierre.y);
          const ecartApres = Math.hypot(solide.x - pierre.x, solide.y - pierre.y);

          expect(ecartApres).toBeLessThanOrEqual(ecartAvant + 1e-9);
        });
      }),
      { numRuns: 40 },
    );
  });
});
