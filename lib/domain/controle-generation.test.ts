import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  controlerConcept,
  controlerVariants,
  FACETTES_ATTENDUES,
  type VariantAControler,
} from "./controle-generation";

const CONCEPT_PROPRE =
  "`Array.prototype.at()` accepte un index négatif, compté depuis la fin du tableau.";

/** Un format par facette, distincts : c'est ce que le prompt demande. */
const FORMATS_PAR_DEFAUT = ["SHORT_ANSWER", "EXPLAIN", "TRUE_FALSE", "CODE"];

function variante(reglages: Partial<VariantAControler> = {}, rang = 0): VariantAControler {
  return {
    format: FORMATS_PAR_DEFAUT[rang] ?? "SHORT_ANSWER",
    facet: FACETTES_ATTENDUES[rang] ?? "RECOGNITION",
    question: "Depuis quel bout du tableau un index négatif est-il compté ?",
    answerKey: "Depuis la fin. Un index de moins un désigne le dernier élément.",
    options: null,
    correctIndex: null,
    ...reglages,
  };
}

function quatreVariantes(): VariantAControler[] {
  return FACETTES_ATTENDUES.map((facet, rang) => variante({ facet }, rang));
}

describe("controlerConcept", () => {
  it("laisse passer un concept autoportant", () => {
    expect(controlerConcept(CONCEPT_PROPRE)).toEqual([]);
  });

  it("repère un renvoi au texte d'origine", () => {
    const manquements = controlerConcept(
      "Comme vu plus haut dans l'article, l'index part de la fin.",
    );

    expect(manquements.map((m) => m.regle)).toContain("renvoi");
  });

  it("repère une ouverture qui reprend un antécédent absent", () => {
    const manquements = controlerConcept("Cette méthode accepte un index négatif.");

    expect(manquements.map((m) => m.regle)).toEqual(["antécédent"]);
  });

  it("laisse passer un « il » impersonnel", () => {
    expect(controlerConcept("Il faut supprimer l'index invalide avant de relancer.")).toEqual([]);
  });
});

describe("controlerVariants", () => {
  it("ne reproche rien à quatre variantes bien formées", () => {
    expect(controlerVariants(quatreVariantes())).toEqual([]);
  });

  it("signale une facette répétée", () => {
    const variantes = quatreVariantes();
    variantes[3] = variante({ facet: "RECOGNITION" }, 3);

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("facettes");
  });

  it("signale les quatre facettes servies dans le désordre", () => {
    const variantes = [...quatreVariantes()].reverse();
    const regles = controlerVariants(variantes).map((m) => m.regle);

    expect(regles).toContain("ordre");
    expect(regles).not.toContain("facettes");
  });

  it("signale un MCQ dont une option écrase les autres par sa longueur", () => {
    const variantes = quatreVariantes();
    variantes[3] = variante(
      {
        format: "MCQ",
        question: "Quelle expression rend le dernier élément d'un tableau de longueur inconnue ?",
        answerKey: "`valeurs.at(-1)`, parce qu'un index négatif part de la fin du tableau",
        options: [
          "`valeurs.at(-1)`, parce qu'un index négatif part de la fin",
          "`a[-1]`",
          "`a[0]`",
          "`a.at(0)`",
        ],
        correctIndex: 0,
      },
      3,
    );

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("longueurs");
  });

  it("signale une réponse recopiée dans l'énoncé", () => {
    const variantes = quatreVariantes();
    variantes[0] = variante({
      question: "L'index négatif est compté depuis la fin du tableau : que rend `at(-1)` ?",
      answerKey: "L'index négatif est compté depuis la fin du tableau",
    });

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("réponse citée");
  });

  it("ignore une réponse trop courte pour prouver quoi que ce soit", () => {
    const variantes = quatreVariantes();
    variantes[0] = variante({
      question: "Combien de couches produit une instruction de Dockerfile ?",
      answerKey: "Une.",
    });

    expect(controlerVariants(variantes)).toEqual([]);
  });

  it("signale un lot où deux formats seulement se partagent quatre questions", () => {
    const variantes = FACETTES_ATTENDUES.map((facet, rang) =>
      variante({ facet, format: rang < 2 ? "SHORT_ANSWER" : "MCQ" }, rang),
    );

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("formats");
  });

  it("situe le manquement sur la variante qu'il vise", () => {
    const variantes = quatreVariantes();
    variantes[2] = variante(
      {
        facet: "BOUNDARY",
        question: "L'index négatif est compté depuis la fin du tableau : vrai ou faux ?",
        answerKey: "L'index négatif est compté depuis la fin du tableau",
      },
      2,
    );
    const cite = controlerVariants(variantes).find((m) => m.regle === "réponse citée");

    expect(cite?.rang).toBe(2);
  });
});

describe("propriétés", () => {
  it("ne reproche rien qu'à cause des accents ou de la ponctuation", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 200 }), (bruit) => {
        const question = `Que rend cet appel : ${bruit} ?`;
        const variantes = quatreVariantes();
        variantes[0] = variante({ question, answerKey: "Le dernier élément du tableau." });

        // Le contrôle de citation ne se déclenche que si la réponse est
        // effectivement dans la question, quels que soient les signes autour.
        const cite = controlerVariants(variantes).some((m) => m.regle === "réponse citée");
        return cite === question.toLowerCase().includes("le dernier element du tableau");
      }),
      { numRuns: 200 },
    );
  });

  it("rend toujours autant de manquements de facette que de désordre introduit", () => {
    fc.assert(
      fc.property(fc.shuffledSubarray([0, 1, 2, 3], { minLength: 4, maxLength: 4 }), (ordre) => {
        const variantes = ordre.map((rang, position) =>
          variante({ facet: FACETTES_ATTENDUES[rang] }, position),
        );
        const regles = controlerVariants(variantes).map((m) => m.regle);
        const trie = ordre.every((rang, position) => rang === position);

        return trie ? !regles.includes("ordre") : regles.includes("ordre");
      }),
      { numRuns: 100 },
    );
  });
});
