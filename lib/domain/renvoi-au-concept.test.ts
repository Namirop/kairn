import { describe, expect, it } from "vitest";
import { renvoiAuConcept } from "./renvoi-au-concept";

describe("renvoiAuConcept", () => {
  /** La question servie en session le 27/08, celle qui a lancé la correction. */
  it("relève la question qui cite un concept qu'on ne montre pas", () => {
    expect(
      renvoiAuConcept(
        "Quel effet, mentionné dans le concept, courbe la trajectoire de la balle vers le bas lors d'un lift ?",
      ),
    ).toBe("mentionne dans le concept");
  });

  it("relève les démonstratifs, qui ne peuvent désigner que du montré", () => {
    expect(renvoiAuConcept("Ce concept s'applique-t-il aux nombres négatifs ?")).toBe("ce concept");
    expect(renvoiAuConcept("D'après ce texte, que se passe-t-il en hiver ?")).toBe("ce texte");
    expect(renvoiAuConcept("Cet extrait décrit-il une cause ou une conséquence ?")).toBe(
      "cet extrait",
    );
  });

  it("relève les renvois par préposition", () => {
    expect(renvoiAuConcept("Selon le concept, que devient le métal en hiver ?")).toBe(
      "selon le concept",
    );
    expect(renvoiAuConcept("Dans le texte, quelle condition est posée ?")).toBe("dans le texte");
  });

  it("relève les renvois de position", () => {
    expect(renvoiAuConcept("La règle énoncée ci-dessus vaut-elle pour un index partiel ?")).toBe(
      "ci-dessus",
    );
  });

  it("relève l'anglais, sur les tournures qui pointent vraiment", () => {
    expect(renvoiAuConcept("Which effect, mentioned above, curves the ball downward?")).toBe(
      "mentioned above",
    );
    expect(renvoiAuConcept("Does this concept apply to negative numbers?")).toBe("this concept");
  });

  /**
   * Le faux positif qu'il faut éviter : « le concept de X » introduit son propre
   * sujet, il ne renvoie nulle part.
   */
  it("laisse passer « le concept de » suivi de ce dont il parle", () => {
    expect(renvoiAuConcept("Que décrit le concept de fermeture lexicale ?")).toBeNull();
    expect(renvoiAuConcept("En quoi le concept d'index partiel diffère-t-il ?")).toBeNull();
  });

  it("laisse passer une question qui se lit seule", () => {
    expect(
      renvoiAuConcept("Quel effet courbe la trajectoire d'une balle liftée vers le bas ?"),
    ).toBeNull();
    expect(renvoiAuConcept("Que rend `[10, 20, 30].at(-1)` ?")).toBeNull();
    expect(renvoiAuConcept("The concept of lexical scoping explains what, exactly?")).toBeNull();
  });

  it("ne se laisse pas tromper par les accents ni la casse", () => {
    expect(renvoiAuConcept("D'APRÈS LE CONCEPT, que se passe-t-il ?")).toBe("d'apres le concept");
    expect(renvoiAuConcept("Selon l’énoncé, quelle est la borne ?")).toBe("selon l'enonce");
  });

  it("rend null sur un texte vide", () => {
    expect(renvoiAuConcept("")).toBeNull();
  });
});
