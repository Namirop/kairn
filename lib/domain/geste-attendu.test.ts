import { describe, expect, it } from "vitest";
import { demandeUneProduction, type FormeDeQuestion } from "./geste-attendu";

const OUVERTE: FormeDeQuestion = { options: null, correctIndex: null, cloze: null };
const QCM: FormeDeQuestion = { options: ["a", "b"], correctIndex: 0, cloze: null };
const TROU: FormeDeQuestion = {
  options: null,
  correctIndex: null,
  cloze: { sentence: "Une phrase à ___.", accepted: ["trou"], leurres: [] },
};

describe("demandeUneProduction", () => {
  it("demande de produire sur un QCM et sur un texte à trou", () => {
    expect(demandeUneProduction(QCM)).toBe(true);
    expect(demandeUneProduction(TROU)).toBe(true);
  });

  it("ne demande rien à produire sur une question ouverte", () => {
    // Le cas qui a motivé la règle : sur une question ouverte, « Voir la
    // réponse » est déjà la sortie, et renoncer ferait doublon avec elle.
    expect(demandeUneProduction(OUVERTE)).toBe(false);
  });

  it("suit le repli quand la charge utile d'un QCM est abîmée", () => {
    // Sans index de bonne réponse, l'écran retombe sur la question ouverte :
    // proposer de renoncer y annoncerait un geste qui n'est plus demandé.
    expect(demandeUneProduction({ options: ["a", "b"], correctIndex: null, cloze: null })).toBe(
      false,
    );
  });

  it("tient le texte à trou même quand des options traînent", () => {
    expect(demandeUneProduction({ ...TROU, options: ["a"], correctIndex: null })).toBe(true);
  });

  it("ne se laisse pas prendre par une charge utile absente sous une autre forme", () => {
    expect(demandeUneProduction({ ...OUVERTE, cloze: undefined })).toBe(false);
  });
});
