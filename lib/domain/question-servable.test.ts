import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { porteDuTexte, questionServable } from "./question-servable";

describe("porteDuTexte", () => {
  it("accepte une lettre, accentuée ou non", () => {
    expect(porteDuTexte("a")).toBe(true);
    expect(porteDuTexte("é")).toBe(true);
  });

  /** Une réponse de texte à trou peut n'être qu'un nombre : « 52 semaines ». */
  it("accepte un chiffre seul", () => {
    expect(porteDuTexte("52")).toBe(true);
  });

  /** Le cas servi le 23/09 : le modèle a abrégé le lot en trois points. */
  it("refuse une suite de ponctuation", () => {
    expect(porteDuTexte("...")).toBe(false);
    expect(porteDuTexte("…")).toBe(false);
    expect(porteDuTexte("— ?!")).toBe(false);
    expect(porteDuTexte("___")).toBe(false);
  });

  it("refuse le vide et les blancs", () => {
    expect(porteDuTexte("")).toBe(false);
    expect(porteDuTexte("   \n\t ")).toBe(false);
  });
});

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

  /** Le lot abrégé : l'énoncé et l'étalon disent la même absence. */
  it("refuse une question abrégée en trois points", () => {
    expect(questionServable({ question: "...", answerKey: "..." })).toBe(false);
    expect(questionServable({ question: "...", answerKey: "Le dernier." })).toBe(false);
  });

  it("ne rend vrai que si les deux champs portent quelque chose à lire", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (question, answerKey) =>
          questionServable({ question, answerKey }) ===
          (porteDuTexte(question) && porteDuTexte(answerKey)),
      ),
      { numRuns: 500 },
    );
  });
});
