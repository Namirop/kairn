import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { HAUTEUR_STRATES, LARGEUR_STRATES, strates } from "./strates";

/** Les nombres d'un chemin SVG, dans l'ordre où ils y apparaissent. */
function nombres(chemin: string): number[] {
  return [...chemin.matchAll(/-?\d+(?:\.\d+)?/g)].map((trouve) => Number(trouve[0]));
}

/** Les ordonnées d'une courbe : un point sur deux, l'abscisse mise à part. */
function ordonnees(chemin: string): number[] {
  return nombres(chemin).filter((_, rang) => rang % 2 === 1);
}

describe("strates", () => {
  it("rend la même coupe pour la même graine", () => {
    expect(strates("accueil-1")).toEqual(strates("accueil-1"));
  });

  it("rend une coupe différente pour une autre graine", () => {
    expect(strates("accueil-1").coupe).not.toBe(strates("accueil-2").coupe);
  });

  it("part du bord gauche et arrive au bord droit", () => {
    const { coupe } = strates("bord");

    expect(coupe.startsWith("M 0 ")).toBe(true);
    expect(coupe).toContain(`L ${LARGEUR_STRATES} ${HAUTEUR_STRATES}`);
  });

  it("ferme chaque ligne sur le bas de la bande", () => {
    const { coupe, veines } = strates("fermeture");

    for (const chemin of [coupe, ...veines]) {
      expect(chemin.endsWith("Z")).toBe(true);
      expect(chemin).toContain(`L 0 ${HAUTEUR_STRATES}`);
    }
  });

  it("empile les veines au-dessus de la coupe", () => {
    const { coupe, veines } = strates("empilement");
    const profondeur = (chemin: string) => {
      const y = ordonnees(chemin);

      // La fermeture ramène deux fois la hauteur de bande : on l'écarte.
      return Math.max(...y.filter((valeur) => valeur !== HAUTEUR_STRATES));
    };

    expect(profondeur(veines[0])).toBeLessThan(profondeur(veines[1]));
    expect(profondeur(veines[1])).toBeLessThan(profondeur(coupe));
  });
});

describe("propriétés", () => {
  it("tient dans la bande, quelle que soit la graine", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (graine) => {
        const { coupe, veines } = strates(graine);

        return [coupe, ...veines].every((chemin) =>
          ordonnees(chemin).every((y) => y >= 0 && y <= HAUTEUR_STRATES),
        );
      }),
      { numRuns: 400 },
    );
  });

  it("ne sort jamais de la largeur", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (graine) => {
        const { coupe, veines } = strates(graine);
        const abscisses = (chemin: string) => nombres(chemin).filter((_, rang) => rang % 2 === 0);

        return [coupe, ...veines].every((chemin) =>
          abscisses(chemin).every((x) => x >= 0 && x <= LARGEUR_STRATES),
        );
      }),
      { numRuns: 400 },
    );
  });
});
