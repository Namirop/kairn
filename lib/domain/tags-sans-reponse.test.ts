import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { tagsSansReponse } from "./tags-sans-reponse";

describe("tagsSansReponse", () => {
  /** Le QCM servi en session : la bonne option était l'étiquette, en capitales. */
  it("retire l'étiquette qu'on lit dans la bonne option", () => {
    expect(
      tagsSansReponse(
        ["tennis", "effet-magnus"],
        ["Effet Magnus", "L'effet Magnus courbe la trajectoire vers le bas."],
      ),
    ).toEqual(["tennis"]);
  });

  it("garde celles qui ne disent rien de la réponse", () => {
    expect(
      tagsSansReponse(["postgres", "index"], ["Seul un préfixe de gauche est servi."]),
    ).toEqual(["postgres", "index"]);
  });

  it("ne se laisse pas tromper par la casse, les accents ni les traits d'union", () => {
    expect(
      tagsSansReponse(["dilatation-thermique"], ["La dilatation thermique du métal."]),
    ).toEqual([]);
    expect(tagsSansReponse(["ELECTRONEGATIVITE"], ["Son électronégativité."])).toEqual([]);
  });

  /** Les étiquettes très courtes se retrouvent partout sans rien trahir. */
  it("garde les étiquettes trop courtes pour prouver quoi que ce soit", () => {
    expect(tagsSansReponse(["js", "ui"], ["Un objet js dans une ui réactive."])).toEqual([
      "js",
      "ui",
    ]);
  });

  it("regarde toutes les réponses qu'on lui donne, pas seulement la première", () => {
    expect(
      tagsSansReponse(["symbiose"], [null, undefined, "Une symbiose entre deux espèces."]),
    ).toEqual([]);
  });

  it("ne compare que des mots entiers", () => {
    // « index » est dans « indexation », mais l'étiquette n'est pas dite pour autant.
    expect(tagsSansReponse(["index"], ["L'indexation du contenu composite."])).toEqual(["index"]);
  });

  it("ne rend jamais autre chose qu'un sous-ensemble des étiquettes reçues", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), fc.array(fc.string()), (tags, reponses) => {
        const gardes = tagsSansReponse(tags, reponses);

        return gardes.length <= tags.length && gardes.every((tag) => tags.includes(tag));
      }),
      { numRuns: 300 },
    );
  });

  it("garde l'ordre d'origine", () => {
    expect(tagsSansReponse(["alpha", "beta", "gamma"], ["beta"])).toEqual(["alpha", "gamma"]);
  });
});
