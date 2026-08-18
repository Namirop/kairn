import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { eprouverParAblation } from "./ablation";
import type { Vecteur } from "./espace";

/**
 * Un espace jouet à deux dimensions, où l'on place les points à la main.
 *
 * Le cosinus n'y dépend que de l'angle : `[1, 0]` et `[0, 1]` sont à 0, et deux
 * points au même endroit sont à 1. Ça suffit à éprouver la logique de l'ablation
 * sans dépendre d'un modèle d'embedding — c'est justement ce qu'on veut isoler.
 */
function espaceJouet(positions: Record<string, Vecteur>): (texte: string) => Vecteur {
  return (texte) => {
    const point = positions[texte];

    if (!point) throw new Error(`Texte hors de l'espace jouet : ${texte}`);

    return point;
  };
}

describe("eprouverParAblation", () => {
  it("découvre la phrase que seul le concept retiré couvrait", () => {
    // La phrase A colle au concept 1 ; le concept 2 pointe ailleurs. Retirer le
    // concept 1 doit faire tomber A sous le plancher.
    const vecteur = espaceJouet({
      "phrase A": [1, 0],
      "concept 1": [1, 0],
      "concept 2": [0, 1],
    });

    const rendu = eprouverParAblation(
      "jouet",
      ["phrase A"],
      ["concept 1", "concept 2"],
      vecteur,
      0.5,
    );

    expect(rendu.retraits[0]?.concept).toBe("concept 1");
    expect(rendu.retraits[0]?.decouvertes).toHaveLength(1);
    expect(rendu.retraits[0]?.decouvertes[0]?.avant).toBeCloseTo(1, 6);
    expect(rendu.retraits[0]?.decouvertes[0]?.apres).toBeCloseTo(0, 6);

    // Retirer le concept 2 ne change rien : il ne couvrait pas la phrase.
    expect(rendu.retraits[1]?.decouvertes).toHaveLength(0);
  });

  it("ne découvre rien quand un jumeau couvre les mêmes phrases", () => {
    // Le contrôle négatif de la fiche : deux concepts au même endroit, retirer
    // l'un laisse l'autre couvrir. C'est le comportement attendu sur `15`.
    const vecteur = espaceJouet({
      "phrase A": [1, 0],
      "jumeau 1": [1, 0],
      "jumeau 2": [1, 0],
    });

    const rendu = eprouverParAblation(
      "jouet",
      ["phrase A"],
      ["jumeau 1", "jumeau 2"],
      vecteur,
      0.5,
    );

    expect(rendu.retraits.every((retrait) => retrait.decouvertes.length === 0)).toBe(true);
  });

  it("ne compte pas une phrase déjà sous le plancher avant tout retrait", () => {
    // Elle n'y tombe pas du fait du retrait : elle y était. La compter ferait
    // croire à une sensibilité que la mesure n'a pas.
    const vecteur = espaceJouet({
      "phrase perdue": [0, 1],
      "concept 1": [1, 0],
    });

    const rendu = eprouverParAblation("jouet", ["phrase perdue"], ["concept 1"], vecteur, 0.5);

    expect(rendu.dejaSous).toBe(1);
    expect(rendu.retraits[0]?.decouvertes).toHaveLength(0);
  });

  it("ne découvre rien en retirant le seul concept d'un dépôt", () => {
    // Il ne reste aucune cible : la phrase n'a pas perdu sa couverture, elle a
    // perdu l'espace où la mesurer. Compter ça serait un faux positif garanti.
    const vecteur = espaceJouet({ "phrase A": [1, 0], "concept 1": [1, 0] });

    const rendu = eprouverParAblation("jouet", ["phrase A"], ["concept 1"], vecteur, 0.5);

    expect(rendu.retraits[0]?.decouvertes).toHaveLength(0);
  });

  it("rend un retrait par concept, dans l'ordre des concepts", () => {
    const vecteur = espaceJouet({
      "phrase A": [1, 0],
      "concept 1": [1, 0],
      "concept 2": [0, 1],
      "concept 3": [1, 1],
    });

    const rendu = eprouverParAblation(
      "jouet",
      ["phrase A"],
      ["concept 1", "concept 2", "concept 3"],
      vecteur,
      0.5,
    );

    expect(rendu.retraits.map((retrait) => retrait.concept)).toEqual([
      "concept 1",
      "concept 2",
      "concept 3",
    ]);
  });

  it("trie les découvertes de la plus basse à la plus haute", () => {
    const vecteur = espaceJouet({
      "phrase proche": [1, 0.05],
      "phrase collee": [1, 0],
      "concept 1": [1, 0],
      "concept 2": [0, 1],
    });

    const rendu = eprouverParAblation(
      "jouet",
      ["phrase proche", "phrase collee"],
      ["concept 1", "concept 2"],
      vecteur,
      0.5,
    );

    const apres = rendu.retraits[0]?.decouvertes.map((d) => d.apres) ?? [];

    expect(apres).toEqual([...apres].sort((a, b) => a - b));
  });

  it("ne découvre jamais une phrase qui était déjà sous le plancher", () => {
    const point = fc
      .array(fc.double({ min: -5, max: 5, noNaN: true }), { minLength: 2, maxLength: 2 })
      .filter((valeurs) => valeurs.some((valeur) => Math.abs(valeur) > 1e-6));

    fc.assert(
      fc.property(
        fc.array(point, { minLength: 1, maxLength: 5 }),
        fc.array(point, { minLength: 2, maxLength: 5 }),
        fc.double({ min: -0.9, max: 0.9, noNaN: true }),
        (phrases, concepts, plancher) => {
          const positions: Record<string, Vecteur> = {};

          phrases.forEach((p, rang) => (positions[`p${rang}`] = p));
          concepts.forEach((c, rang) => (positions[`c${rang}`] = c));

          const rendu = eprouverParAblation(
            "jouet",
            phrases.map((_, rang) => `p${rang}`),
            concepts.map((_, rang) => `c${rang}`),
            espaceJouet(positions),
            plancher,
          );

          for (const retrait of rendu.retraits) {
            for (const decouverte of retrait.decouvertes) {
              // La définition même d'une découverte : au-dessus avant, dessous après.
              expect(decouverte.avant).toBeGreaterThanOrEqual(plancher);
              expect(decouverte.apres).toBeLessThan(plancher);
            }
          }
        },
      ),
    );
  });
});
