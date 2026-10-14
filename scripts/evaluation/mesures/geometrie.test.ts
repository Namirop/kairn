import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { cosinus, deciles, mediane, pairesTriees, plusProche } from "./geometrie";

/** Des vecteurs non nuls, de dimension fixe : le cas que la mesure rencontre. */
const vecteur = (dimension = 4) =>
  fc
    .array(fc.double({ min: -10, max: 10, noNaN: true }), {
      minLength: dimension,
      maxLength: dimension,
    })
    .filter((valeurs) => valeurs.some((valeur) => Math.abs(valeur) > 1e-6));

describe("cosinus", () => {
  it("rend 1 sur deux vecteurs identiques", () => {
    expect(cosinus([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 12);
  });

  it("rend 1 sur deux vecteurs colinéaires de normes différentes", () => {
    // La similarité porte sur la direction, jamais sur la longueur.
    expect(cosinus([1, 2, 3], [10, 20, 30])).toBeCloseTo(1, 12);
  });

  it("rend 0 sur deux vecteurs orthogonaux", () => {
    expect(cosinus([1, 0], [0, 1])).toBeCloseTo(0, 12);
  });

  it("rend −1 sur deux vecteurs opposés", () => {
    expect(cosinus([1, 2], [-1, -2])).toBeCloseTo(-1, 12);
  });

  it("rend NaN quand un vecteur est nul : sans direction, pas de similarité", () => {
    expect(cosinus([0, 0], [1, 1])).toBeNaN();
  });

  it("refuse deux dimensions différentes plutôt que de comparer n'importe quoi", () => {
    expect(() => cosinus([1, 2], [1, 2, 3])).toThrow(/dimensions différentes/);
  });

  it("est symétrique", () => {
    fc.assert(
      fc.property(vecteur(), vecteur(), (un, deux) => {
        expect(cosinus(un, deux)).toBeCloseTo(cosinus(deux, un), 12);
      }),
    );
  });

  it("reste toujours dans [−1, 1]", () => {
    fc.assert(
      fc.property(vecteur(), vecteur(), (un, deux) => {
        const valeur = cosinus(un, deux);

        expect(valeur).toBeGreaterThanOrEqual(-1);
        expect(valeur).toBeLessThanOrEqual(1);
      }),
    );
  });

  it("ne change pas quand on multiplie un vecteur par un facteur positif", () => {
    fc.assert(
      fc.property(
        vecteur(),
        vecteur(),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (un, deux, facteur) => {
          expect(
            cosinus(
              un.map((v) => v * facteur),
              deux,
            ),
          ).toBeCloseTo(cosinus(un, deux), 9);
        },
      ),
    );
  });
});

describe("plusProche", () => {
  it("trouve le candidat le mieux orienté", () => {
    const trouve = plusProche(
      [1, 0],
      [
        [0, 1],
        [0.9, 0.1],
        [-1, 0],
      ],
    );

    expect(trouve?.rang).toBe(1);
    expect(trouve?.proximite).toBeGreaterThan(0.9);
  });

  it("rend null sur un ensemble vide : l'absence n'est pas une proximité de zéro", () => {
    expect(plusProche([1, 0], [])).toBe(null);
  });

  it("ignore un candidat nul plutôt que de le compter orthogonal", () => {
    const trouve = plusProche(
      [1, 0],
      [
        [0, 0],
        [0, 1],
      ],
    );

    expect(trouve?.rang).toBe(1);
  });

  it("rend toujours la proximité maximale de l'ensemble", () => {
    fc.assert(
      fc.property(
        vecteur(),
        fc.array(vecteur(), { minLength: 1, maxLength: 8 }),
        (cible, candidats) => {
          const trouve = plusProche(cible, candidats);
          const toutes = candidats.map((candidat) => cosinus(cible, candidat));

          expect(trouve?.proximite).toBeCloseTo(Math.max(...toutes), 12);
        },
      ),
    );
  });
});

describe("pairesTriees", () => {
  it("rend chaque paire une fois, jamais un élément avec lui-même", () => {
    const paires = pairesTriees([
      [1, 0],
      [0, 1],
      [1, 1],
    ]);

    expect(paires).toHaveLength(3);
    expect(paires.every((paire) => paire.un < paire.deux)).toBe(true);
  });

  it("trie de la plus proche à la plus lointaine", () => {
    fc.assert(
      fc.property(fc.array(vecteur(), { minLength: 2, maxLength: 7 }), (vecteurs) => {
        const proximites = pairesTriees(vecteurs).map((paire) => paire.proximite);

        expect(proximites).toEqual([...proximites].sort((a, b) => b - a));
      }),
    );
  });

  it("rend n(n−1)/2 paires quand aucun vecteur n'est nul", () => {
    fc.assert(
      fc.property(fc.array(vecteur(), { minLength: 0, maxLength: 8 }), (vecteurs) => {
        const attendu = (vecteurs.length * (vecteurs.length - 1)) / 2;

        expect(pairesTriees(vecteurs)).toHaveLength(attendu);
      }),
    );
  });

  it("rend une liste vide sous deux vecteurs", () => {
    expect(pairesTriees([])).toEqual([]);
    expect(pairesTriees([[1, 0]])).toEqual([]);
  });
});

describe("mediane", () => {
  it("prend la valeur du milieu sur une série impaire", () => {
    expect(mediane([3, 1, 2])).toBe(2);
  });

  it("prend la moyenne des deux du milieu sur une série paire", () => {
    expect(mediane([1, 2, 3, 4])).toBe(2.5);
  });

  it("rend null sur une série vide", () => {
    expect(mediane([])).toBe(null);
  });

  it("rend un zéro sans signe, quel que soit l'ordre de 0 et -0", () => {
    expect(mediane([0, -0])).toBe(0);
    expect(mediane([-0, 0])).toBe(0);
    expect(mediane([-0])).toBe(0);
  });

  it("ne dépend pas de l'ordre d'entrée", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1 }),
        (valeurs) => {
          expect(mediane([...valeurs].reverse())).toBe(mediane(valeurs));
        },
      ),
    );
  });

  it("tombe toujours entre le minimum et le maximum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1 }),
        (valeurs) => {
          const valeur = mediane(valeurs) ?? 0;

          expect(valeur).toBeGreaterThanOrEqual(Math.min(...valeurs));
          expect(valeur).toBeLessThanOrEqual(Math.max(...valeurs));
        },
      ),
    );
  });
});

describe("deciles", () => {
  it("rend onze bornes, du minimum au maximum", () => {
    const rendus = deciles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    expect(rendus).toHaveLength(11);
    expect(rendus[0]).toBe(1);
    expect(rendus[10]).toBe(11);
  });

  it("rend une liste vide sur une série vide", () => {
    expect(deciles([])).toEqual([]);
  });

  it("reste croissant, quelles que soient les valeurs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1 }),
        (valeurs) => {
          const rendus = deciles(valeurs);

          for (let rang = 1; rang < rendus.length; rang += 1) {
            expect(rendus[rang]).toBeGreaterThanOrEqual(rendus[rang - 1] ?? 0);
          }
        },
      ),
    );
  });

  it("encadre toujours la série entre son minimum et son maximum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1 }),
        (valeurs) => {
          const rendus = deciles(valeurs);

          expect(rendus[0]).toBe(Math.min(...valeurs));
          expect(rendus[10]).toBe(Math.max(...valeurs));
        },
      ),
    );
  });
});
