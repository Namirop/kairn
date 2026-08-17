import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { etalonLisible } from "./etalon-lisible";

describe("etalonLisible", () => {
  it("retire l'étiquette que la génération met devant", () => {
    expect(etalonLisible("Réponse attendue : au-delà d'un certain volume, le corps sature.")).toBe(
      "Au-delà d'un certain volume, le corps sature.",
    );
    expect(etalonLisible("Reponse attendue: le muscle grossit au repos.")).toBe(
      "Le muscle grossit au repos.",
    );
    expect(etalonLisible("La réponse attendue : trois séries.")).toBe("Trois séries.");
    expect(etalonLisible("Réponse : trois séries.")).toBe("Trois séries.");
    expect(etalonLisible("Attendu — la fatigue dépasse le seuil.")).toBe(
      "La fatigue dépasse le seuil.",
    );
  });

  it("laisse la phrase commencer par son code plutôt que de le capitaliser", () => {
    expect(etalonLisible("Réponse attendue : `at(-1)` sur un tableau de longueur inconnue.")).toBe(
      "`at(-1)` sur un tableau de longueur inconnue.",
    );
    expect(etalonLisible("Réponse : 42 séries par semaine.")).toBe("42 séries par semaine.");
  });

  it("ne touche pas un étalon qui commence par sa réponse", () => {
    expect(etalonLisible("Faux. Un excès de volume nuit à la progression.")).toBe(
      "Faux. Un excès de volume nuit à la progression.",
    );
    expect(etalonLisible("`valeurs.at(-1)`. Attendu : une expression sûre.")).toBe(
      "`valeurs.at(-1)`. Attendu : une expression sûre.",
    );
    expect(etalonLisible("La réponse dépend du volume tenu sur la semaine.")).toBe(
      "La réponse dépend du volume tenu sur la semaine.",
    );
  });

  it("garde l'étiquette quand il n'y a rien derrière", () => {
    expect(etalonLisible("Réponse attendue :")).toBe("Réponse attendue :");
    expect(etalonLisible("Réponse :")).toBe("Réponse :");
  });

  it("laisse un étalon vide tel quel", () => {
    expect(etalonLisible("")).toBe("");
    expect(etalonLisible("   ")).toBe("   ");
  });

  it("ne rend jamais un texte plus long que celui qu'on lui donne", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), (texte) => {
        return etalonLisible(texte).length <= texte.length;
      }),
      { numRuns: 400 },
    );
  });

  it("n'enlève qu'une étiquette : appliquer deux fois ne retire pas plus", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), (texte) => {
        const une = etalonLisible(texte);

        return etalonLisible(une) === une || etalonLisible(une).length < une.length;
      }),
      { numRuns: 300 },
    );
  });
});
