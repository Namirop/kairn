import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { controlerQuestion, type VariantAControler } from "./controle-question";
import { TROU } from "./reponse-cloze";

function question(reglages: Partial<VariantAControler> = {}): VariantAControler {
  return {
    format: "SHORT_ANSWER",
    facet: "RECOGNITION",
    question: "Depuis quel bout du tableau un index négatif est-il compté ?",
    answerKey: "Depuis la fin. Un index de moins un désigne le dernier élément.",
    options: null,
    correctIndex: null,
    ...reglages,
  };
}

function texteATrou(reglages: Partial<VariantAControler["cloze"] & object> = {}) {
  return question({
    format: "CLOZE",
    question: "Complète la phrase.",
    answerKey: "symbiose",
    cloze: {
      sentence: `Le lichen est une ${TROU} entre un champignon et une algue.`,
      accepted: ["symbiose", "symbioses"],
      ...reglages,
    },
  });
}

describe("controlerQuestion", () => {
  it("ne reproche rien à une question bien formée", () => {
    expect(controlerQuestion(question())).toEqual([]);
  });

  it("signale un MCQ dont une option écrase les autres par sa longueur", () => {
    const posee = question({
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
    });

    expect(controlerQuestion(posee).map((m) => m.regle)).toContain("longueurs");
  });

  it("signale des options posées sur un format qui n'en prend pas", () => {
    const posee = question({ options: ["une", "deux", "trois", "quatre"], correctIndex: 0 });

    expect(controlerQuestion(posee).map((m) => m.regle)).toContain("options");
  });

  it("signale une réponse recopiée dans l'énoncé", () => {
    const posee = question({
      question: "L'index négatif est compté depuis la fin du tableau : que rend `at(-1)` ?",
      answerKey: "L'index négatif est compté depuis la fin du tableau",
    });

    expect(controlerQuestion(posee).map((m) => m.regle)).toContain("réponse citée");
  });

  it("ignore une réponse trop courte pour prouver quoi que ce soit", () => {
    const posee = question({
      question: "Combien de couches produit une instruction de Dockerfile ?",
      answerKey: "Une.",
    });

    expect(controlerQuestion(posee)).toEqual([]);
  });
});

describe("le trou d'un texte à trou", () => {
  it("ne reproche rien à un trou d'un seul mot", () => {
    expect(controlerQuestion(texteATrou())).toEqual([]);
  });

  it("accepte un trou de trois mots", () => {
    const posee = texteATrou({
      sentence: `La couche d'ozone arrête ${TROU} avant qu'ils n'atteignent le sol.`,
      accepted: ["les rayons ultraviolets", "ultraviolets", "UV"],
    });

    expect(controlerQuestion(posee)).toEqual([]);
  });

  it("signale un trou qui avale une proposition entière", () => {
    const posee = texteATrou({
      accepted: ["une association durable entre deux organismes vivants"],
    });
    const trou = controlerQuestion(posee).find((m) => m.regle === "trou");

    expect(trou?.detail).toContain("7 mots");
  });

  it("signale une phrase sans trou, et une phrase qui en porte deux", () => {
    const sansTrou = texteATrou({ sentence: "Le lichen est une association." });
    const deuxTrous = texteATrou({
      sentence: `Le ${TROU} est une ${TROU} entre un champignon et une algue.`,
    });

    expect(controlerQuestion(sansTrou).map((m) => m.regle)).toContain("trou");
    expect(controlerQuestion(deuxTrous).map((m) => m.regle)).toContain("trou");
  });

  it("signale un CLOZE sans phrase trouée, et une phrase trouée sur un autre format", () => {
    const nu = question({ format: "CLOZE" });
    const egare = question({
      cloze: { sentence: `Une ${TROU} entre deux espèces.`, accepted: ["symbiose"] },
    });

    expect(controlerQuestion(nu).map((m) => m.regle)).toContain("trou");
    expect(controlerQuestion(egare).map((m) => m.regle)).toContain("trou");
  });

  it("signale une liste de formes acceptées vide", () => {
    expect(controlerQuestion(texteATrou({ accepted: [] })).map((m) => m.regle)).toContain("trou");
  });
});

describe("propriétés", () => {
  it("ne reproche rien qu'à cause des accents ou de la ponctuation", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 200 }), (bruit) => {
        const posee = question({
          question: `Que rend cet appel : ${bruit} ?`,
          answerKey: "Le dernier élément du tableau.",
        });

        // Le contrôle de citation ne se déclenche que si la réponse est
        // effectivement dans la question, quels que soient les signes autour.
        const cite = controlerQuestion(posee).some((m) => m.regle === "réponse citée");

        return cite === posee.question.toLowerCase().includes("le dernier element du tableau");
      }),
      { numRuns: 200 },
    );
  });
});
