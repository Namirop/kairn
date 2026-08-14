import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { conceptsAQuestionner, NATURES_DE_DEPOT } from "./nature-du-depot";

const concept = (nom: string, uncertain: boolean) => ({ nom, uncertain });

const concepts = fc.array(
  fc.record({ nom: fc.string({ minLength: 1 }), uncertain: fc.boolean() }),
  { maxLength: 12 },
);

describe("conceptsAQuestionner", () => {
  it("écarte les concepts douteux d'un dépôt factuel", () => {
    const tous = [concept("sûr", false), concept("douteux", true), concept("autre", false)];

    expect(conceptsAQuestionner(tous, "FACTUEL").map((c) => c.nom)).toEqual(["sûr", "autre"]);
  });

  it("garde les concepts douteux d'un dépôt de fiction", () => {
    const tous = [concept("règle du jeu", true), concept("autre règle", true)];

    expect(conceptsAQuestionner(tous, "FICTION")).toHaveLength(2);
  });

  it("garde les concepts douteux d'un dépôt personnel", () => {
    const tous = [concept("procédure maison", true)];

    expect(conceptsAQuestionner(tous, "PERSONNEL")).toHaveLength(1);
  });

  it("retient le comportement factuel quand la nature manque", () => {
    const tous = [concept("sûr", false), concept("douteux", true)];

    for (const nature of [null, undefined]) {
      expect(conceptsAQuestionner(tous, nature).map((c) => c.nom)).toEqual(["sûr"]);
    }
  });

  it("ne rend jamais un concept qui n'était pas dans l'entrée", () => {
    fc.assert(
      fc.property(concepts, fc.constantFrom(...NATURES_DE_DEPOT), (tous, nature) => {
        for (const retenu of conceptsAQuestionner(tous, nature)) {
          expect(tous).toContain(retenu);
        }
      }),
    );
  });

  it("ne garde que le doute en moins, et seulement sur du factuel", () => {
    fc.assert(
      fc.property(concepts, fc.constantFrom(...NATURES_DE_DEPOT), (tous, nature) => {
        const retenus = conceptsAQuestionner(tous, nature);
        const douteux = tous.filter((concept) => concept.uncertain).length;

        expect(retenus).toHaveLength(nature === "FACTUEL" ? tous.length - douteux : tous.length);
      }),
    );
  });

  it("conserve l'ordre d'origine", () => {
    fc.assert(
      fc.property(concepts, fc.constantFrom(...NATURES_DE_DEPOT), (tous, nature) => {
        const retenus = conceptsAQuestionner(tous, nature);
        const rangs = retenus.map((retenu) => tous.indexOf(retenu));

        expect(rangs).toEqual([...rangs].sort((un, deux) => un - deux));
      }),
    );
  });
});
