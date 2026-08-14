import { describe, expect, it } from "vitest";
import { PLAFOND_CONCEPTS_PAR_DEPOT } from "@/lib/domain/plafond-de-concepts";
import { EXTRACT_ATOMS } from "./extract-atoms";

/**
 * La validation de l'extraction, sans appel modèle.
 *
 * Ce qui se joue ici n'est pas la forme mais le refus de rejeter : une sortie
 * trop généreuse a déjà coûté son appel, et la perdre est le pire des résultats.
 */

const concept = (rang: number) => ({
  concept: `Un concept autoportant, numéro ${rang}, assez long pour ressembler à un vrai.`,
  tags: ["etiquette"],
  uncertain: false,
});

const sortie = (combien: number, reste: Record<string, unknown> = {}) => ({
  nature: "FACTUEL",
  langue: "fr",
  atoms: Array.from({ length: combien }, (_, rang) => concept(rang)),
  rejected: combien === 0 ? "Rien à retenir ici." : null,
  ...reste,
});

describe("validation de extract_atoms", () => {
  it("garde les vingt premiers concepts d'une sortie qui en rend vingt-cinq, sans lever", () => {
    const lu = EXTRACT_ATOMS.validation.parse(sortie(25));

    expect(lu.atoms).toHaveLength(PLAFOND_CONCEPTS_PAR_DEPOT);
    expect(lu.rendus).toBe(25);
    expect(lu.tronque).toBe(true);
  });

  it("garde la tête de la liste, celle que le prompt fait classer en premier", () => {
    const lu = EXTRACT_ATOMS.validation.parse(sortie(25));

    expect(lu.atoms[0]?.concept).toContain("numéro 0");
    expect(lu.atoms.at(-1)?.concept).toContain(`numéro ${PLAFOND_CONCEPTS_PAR_DEPOT - 1}`);
  });

  it("ne tronque pas une sortie ordinaire", () => {
    const lu = EXTRACT_ATOMS.validation.parse(sortie(5));

    expect(lu.atoms).toHaveLength(5);
    expect(lu.rendus).toBe(5);
    expect(lu.tronque).toBe(false);
  });

  it("accepte un concept plus long que ce que la forme annonçait", () => {
    const long = { ...concept(1), concept: "a".repeat(2000) };
    const lu = EXTRACT_ATOMS.validation.parse(sortie(0, { atoms: [long], rejected: null }));

    expect(lu.atoms).toHaveLength(1);
  });

  it("ramène les étiquettes à trois plutôt que de refuser la sortie", () => {
    const trop = { ...concept(1), tags: ["une", "deux", "trois", "quatre", "cinq"] };
    const lu = EXTRACT_ATOMS.validation.parse(sortie(0, { atoms: [trop], rejected: null }));

    expect(lu.atoms[0]?.tags).toEqual(["une", "deux", "trois"]);
  });

  it("normalise la langue déclarée", () => {
    expect(EXTRACT_ATOMS.validation.parse(sortie(1, { langue: " EN " })).langue).toBe("en");
  });

  it("ignore un motif de rejet posé à côté de concepts extraits", () => {
    // Ce désaccord jetait l'extraction entière. Le compte tranche : s'il reste
    // des concepts, il n'y a pas de rejet, quoi que le modèle ait écrit.
    const lu = EXTRACT_ATOMS.validation.parse(sortie(3, { rejected: "Rien à retenir." }));

    expect(lu.atoms).toHaveLength(3);
    expect(lu.rejected).toBeNull();
  });

  it("accepte une liste vide sans motif, que l'appelant sait remplacer", () => {
    const lu = EXTRACT_ATOMS.validation.parse(sortie(0, { rejected: null }));

    expect(lu.atoms).toHaveLength(0);
    expect(lu.rejected).toBeNull();
  });

  it("refuse une nature que la base ne saurait pas écrire", () => {
    expect(() => EXTRACT_ATOMS.validation.parse(sortie(1, { nature: "ROMANCE" }))).toThrow();
  });
});

/**
 * `deriveDe` se mesure et ne coupe pas.
 *
 * Il a coupé le temps d'un passage de banc, et le corpus est tombé de 129
 * concepts à 85. Ces tests disent que le champ traverse la relecture sans rien
 * retirer : c'est la propriété qu'on ne veut plus jamais perdre par distraction.
 */
describe("les concepts qui se déclarent dérivés d'un voisin", () => {
  const avecRenvois = (renvois: (number | null)[]) =>
    sortie(0, {
      atoms: renvois.map((deriveDe, rang) => ({ ...concept(rang), deriveDe })),
      rejected: null,
    });

  it("les compte sans en écarter un seul", () => {
    const lu = EXTRACT_ATOMS.validation.parse(avecRenvois([null, 1, null, 3]));

    expect(lu.atoms).toHaveLength(4);
    expect(lu.derives).toBe(2);
    expect(lu.rendus).toBe(4);
  });

  it("ne laisse pas `deriveDe` arriver jusqu'à la base", () => {
    const lu = EXTRACT_ATOMS.validation.parse(avecRenvois([null, 1]));

    expect(lu.atoms[0]).toEqual({
      concept: expect.stringContaining("numéro 0"),
      tags: ["etiquette"],
      uncertain: false,
    });
  });

  it("accepte une sortie qui ne renseigne pas le champ du tout", () => {
    const lu = EXTRACT_ATOMS.validation.parse(sortie(3));

    expect(lu.atoms).toHaveLength(3);
    expect(lu.derives).toBe(0);
  });

  it("garde tout un dépôt dont chaque concept se déclare dérivé", () => {
    const lu = EXTRACT_ATOMS.validation.parse(avecRenvois([2, 1]));

    expect(lu.atoms).toHaveLength(2);
    expect(lu.derives).toBe(2);
  });

  it("laisse le plafond faire seul son travail", () => {
    // Vingt-cinq rendus dont les cinq premiers se déclarent dérivés : ce sont
    // bien les vingt premiers qui restent, dans l'ordre d'importance rendu.
    const renvois = Array.from({ length: 25 }, (_, rang) => (rang < 5 ? 25 : null));
    const lu = EXTRACT_ATOMS.validation.parse(avecRenvois(renvois));

    expect(lu.derives).toBe(5);
    expect(lu.atoms).toHaveLength(PLAFOND_CONCEPTS_PAR_DEPOT);
    expect(lu.atoms[0]?.concept).toContain("numéro 0");
    expect(lu.tronque).toBe(true);
  });
});
