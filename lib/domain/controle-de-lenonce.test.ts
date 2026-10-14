import { describe, expect, it } from "vitest";
import { controlerLEnonce } from "./controle-de-lenonce";
import type { VariantAControler } from "./controle-question";

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

describe("controlerLEnonce", () => {
  it("ne reproche rien à un énoncé qui pose vraiment sa question", () => {
    expect(controlerLEnonce(question())).toEqual([]);
  });

  it("ne regarde pas le format : des options sur une question ouverte ne le concernent pas", () => {
    expect(controlerLEnonce(question({ options: ["a", "b"], correctIndex: 0 }))).toEqual([]);
  });

  it("signale une coquille à la place de la question", () => {
    expect(controlerLEnonce(question({ question: "placeholder" })).map((m) => m.regle)).toEqual([
      "question coquille",
    ]);
  });

  it("lit la phrase trouée d'un CLOZE, pas son texte de question", () => {
    const cloze = question({
      format: "CLOZE",
      question: "Complète la phrase.",
      cloze: { sentence: "placeholder", accepted: ["fin"] },
    });

    expect(controlerLEnonce(cloze).map((m) => m.regle)).toEqual(["question coquille"]);
  });

  it("signale la réponse recopiée dans l'énoncé", () => {
    const recopiee = question({
      question: "Un index négatif se compte depuis la fin du tableau, pourquoi ?",
      answerKey: "Depuis la fin du tableau.",
    });

    expect(controlerLEnonce(recopiee).map((m) => m.regle)).toEqual(["réponse citée"]);
  });
});
