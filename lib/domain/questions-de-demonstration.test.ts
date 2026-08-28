import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  QUESTIONS_DE_DEMONSTRATION,
  questionDeDemonstration,
  type QuestionDeDemonstration,
} from "./questions-de-demonstration";

/**
 * Le tableau est figé par `as const` pour que la fonction de tirage n'ait pas à
 * se demander s'il est vide. Ici, on veut le lire comme une liste de questions
 * et non comme trois littéraux distincts.
 */
const TOUTES: readonly QuestionDeDemonstration[] = QUESTIONS_DE_DEMONSTRATION;

describe("questionDeDemonstration", () => {
  it("rend la première question au tirage nul et la dernière au tirage haut", () => {
    expect(questionDeDemonstration(0)).toBe(QUESTIONS_DE_DEMONSTRATION[0]);
    expect(questionDeDemonstration(0.999)).toBe(
      QUESTIONS_DE_DEMONSTRATION[QUESTIONS_DE_DEMONSTRATION.length - 1],
    );
  });

  /** `Math.random()` rend [0, 1) : le 1 exclu ne doit pas sortir du tableau. */
  it("ne sort jamais du tableau, même aux bornes et au-delà", () => {
    fc.assert(
      fc.property(fc.double({ min: -2, max: 3, noNaN: true }), (tirage) =>
        TOUTES.includes(questionDeDemonstration(tirage)),
      ),
      { numRuns: 500 },
    );
  });

  it("rend la même question pour le même tirage", () => {
    expect(questionDeDemonstration(0.42)).toBe(questionDeDemonstration(0.42));
  });

  it("couvre toutes les questions sur l'intervalle", () => {
    const tirees = new Set(
      Array.from({ length: 300 }, (_, rang) => questionDeDemonstration(rang / 300)),
    );

    expect(tirees.size).toBe(QUESTIONS_DE_DEMONSTRATION.length);
  });
});

/**
 * Le contenu se relit ici, parce qu'une faute dedans ne casse rien : la page
 * s'affiche, la question se pose, et elle est fausse. C'est du contenu servi en
 * production, et le seul filet qu'il puisse avoir est un test qui le regarde.
 */
describe("les questions elles-mêmes", () => {
  it("désignent toutes une réponse qui existe", () => {
    for (const question of QUESTIONS_DE_DEMONSTRATION) {
      expect(question.bonne).toBeGreaterThanOrEqual(0);
      expect(question.bonne).toBeLessThan(question.reponses.length);
    }
  });

  it("proposent deux ou trois réponses, jamais une seule", () => {
    for (const question of QUESTIONS_DE_DEMONSTRATION) {
      expect(question.reponses.length).toBeGreaterThanOrEqual(2);
      expect(question.reponses.length).toBeLessThanOrEqual(3);
    }
  });

  it("posent un vrai ou faux avec exactement « Vrai » et « Faux »", () => {
    for (const question of QUESTIONS_DE_DEMONSTRATION) {
      if (question.format !== "TRUE_FALSE") continue;

      expect(question.reponses).toEqual(["Vrai", "Faux"]);
    }
  });

  it("ne répètent pas deux fois la même proposition", () => {
    for (const question of QUESTIONS_DE_DEMONSTRATION) {
      expect(new Set(question.reponses).size).toBe(question.reponses.length);
    }
  });

  /** Le registre du produit : pas de point d'exclamation, pas de félicitation. */
  it("gardent le registre calme des écrans", () => {
    for (const question of QUESTIONS_DE_DEMONSTRATION) {
      expect(`${question.enonce} ${question.precision}`).not.toMatch(/[!]/);
    }
  });
});
