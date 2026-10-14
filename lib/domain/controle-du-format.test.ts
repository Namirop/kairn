import { describe, expect, it } from "vitest";
import { controlerLeFormat } from "./controle-du-format";
import type { VariantAControler } from "./controle-question";
import { TROU } from "./reponse-cloze";

function question(reglages: Partial<VariantAControler> = {}): VariantAControler {
  return {
    format: "SHORT_ANSWER",
    facet: "RECOGNITION",
    question: "Depuis quel bout du tableau un index négatif est-il compté ?",
    answerKey: "Depuis la fin.",
    options: null,
    correctIndex: null,
    ...reglages,
  };
}

describe("controlerLeFormat", () => {
  it("ne reproche rien à une question sans charge sur un format qui n'en prend pas", () => {
    expect(controlerLeFormat(question())).toEqual([]);
  });

  it("ne regarde pas l'énoncé : une réponse recopiée ne le concerne pas", () => {
    const recopiee = question({
      question: "Un index négatif se compte depuis la fin du tableau, vrai ?",
      answerKey: "Depuis la fin du tableau.",
    });

    expect(controlerLeFormat(recopiee)).toEqual([]);
  });

  it("rend les manquements dans l'ordre options, trou, vrai ou faux, charge", () => {
    const tout = question({
      format: "SHORT_ANSWER",
      options: ["a", "b"],
      correctIndex: 0,
      cloze: { sentence: `Un ${TROU}.`, accepted: ["trou"] },
      estVraie: true,
      chargeIgnoree: true,
    });

    expect(controlerLeFormat(tout).map((m) => m.regle)).toEqual([
      "options",
      "trou",
      "vrai ou faux",
      "charge",
    ]);
  });
});
