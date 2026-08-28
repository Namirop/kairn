import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { questionServable } from "./question-servable";

describe("questionServable", () => {
  it("accepte une formulation qui porte un texte et une réponse", () => {
    expect(questionServable({ question: "Que fait `at(-1)` ?", answerKey: "Le dernier." })).toBe(
      true,
    );
  });

  /** Le cas vu en production : carte blanche, et « Voir la réponse » muet. */
  it("refuse une question sans texte", () => {
    expect(questionServable({ question: "", answerKey: "Le dernier." })).toBe(false);
  });

  it("refuse une question sans réponse", () => {
    expect(questionServable({ question: "Que fait `at(-1)` ?", answerKey: "" })).toBe(false);
  });

  /** Des espaces ne sont pas un texte : l'écran afficherait le même vide. */
  it("ne prend pas des blancs pour du contenu", () => {
    expect(questionServable({ question: "   \n\t ", answerKey: "Le dernier." })).toBe(false);
    expect(questionServable({ question: "Que fait `at(-1)` ?", answerKey: " " })).toBe(false);
  });

  it("ne rend vrai que si les deux champs portent quelque chose", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (question, answerKey) =>
          questionServable({ question, answerKey }) ===
          (question.trim().length > 0 && answerKey.trim().length > 0),
      ),
      { numRuns: 500 },
    );
  });
});
