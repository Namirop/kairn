import { describe, expect, it } from "vitest";
import {
  conceptsLisibles,
  etatDuDepot,
  libelleEtat,
  redecoupable,
  type AvancementDepot,
} from "./etat-depot";

function avancement(reglages: Partial<AvancementDepot> = {}): AvancementDepot {
  return { status: "PROCESSING", travaux: [], concepts: 0, ...reglages };
}

describe("etatDuDepot", () => {
  it("annonce la lecture tant que la capture n'est pas lue", () => {
    expect(etatDuDepot(avancement({ travaux: [{ kind: "OCR" }] }))).toBe("lecture");
  });

  it("annonce le découpage avant que les concepts existent", () => {
    expect(etatDuDepot(avancement({ travaux: [{ kind: "ATOMS" }] }))).toBe("decoupage");
  });

  it("annonce l'écriture des questions une fois les concepts là", () => {
    const enCours = avancement({ travaux: [{ kind: "VARIANTS" }], concepts: 3 });

    expect(etatDuDepot(enCours)).toBe("questions");
  });

  it("distingue des questions qui s'écrivent de questions qui attendent leur date", () => {
    const differe = avancement({ travaux: [{ kind: "VARIANTS", differe: true }], concepts: 3 });

    expect(etatDuDepot(differe)).toBe("questions-differees");
    expect(conceptsLisibles(etatDuDepot(differe))).toBe(true);
  });

  it("laisse un travail qui part passer devant un travail qui attend", () => {
    const melange = avancement({
      travaux: [{ kind: "VARIANTS", differe: true }, { kind: "VARIANTS" }],
      concepts: 3,
    });

    expect(etatDuDepot(melange)).toBe("questions");
  });

  it("prend l'étape la plus en amont quand plusieurs travaux attendent", () => {
    const melange = avancement({ travaux: [{ kind: "VARIANTS" }, { kind: "OCR" }] });

    expect(etatDuDepot(melange)).toBe("lecture");
  });

  it("tient compte de la clôture qui n'a pas encore eu lieu", () => {
    expect(etatDuDepot(avancement({ concepts: 4 }))).toBe("questions");
    expect(etatDuDepot(avancement({ concepts: 0 }))).toBe("decoupage");
  });

  it("laisse l'état final l'emporter sur les travaux restants", () => {
    const fini = avancement({ status: "READY", travaux: [{ kind: "VARIANTS" }], concepts: 2 });
    const rate = avancement({ status: "FAILED", travaux: [{ kind: "ATOMS" }] });

    expect(etatDuDepot(fini)).toBe("pret");
    expect(etatDuDepot(rate)).toBe("echec");
  });

  /**
   * Les trois fins sans concept, qui se confondaient toutes en une. Un dépôt
   * vidé par son auteur annonçait « découpage en cours » indéfiniment, et un
   * dépôt sans matière annonçait « échec » comme si le produit avait planté.
   */
  it("sépare le dépôt vidé, le dépôt rejeté et le dépôt en panne", () => {
    expect(etatDuDepot(avancement({ status: "READY", concepts: 0 }))).toBe("vide");
    expect(etatDuDepot(avancement({ status: "REJECTED" }))).toBe("rejete");
    expect(etatDuDepot(avancement({ status: "FAILED" }))).toBe("echec");
  });

  it("ne prend un dépôt prêt pour vidé que s'il ne reste aucun concept", () => {
    expect(etatDuDepot(avancement({ status: "READY", concepts: 1 }))).toBe("pret");
  });
});

describe("libelleEtat", () => {
  it("nomme chaque étape du point de vue de l'utilisateur", () => {
    expect(libelleEtat("lecture")).toBe("Lecture de la capture");
    expect(libelleEtat("questions")).toBe("Écriture des questions");
  });

  it("ne parle d'échec que pour une vraie panne", () => {
    expect(libelleEtat("rejete")).toBe("Rien à retenir");
    expect(libelleEtat("echec")).toBe("Échec");
  });
});

describe("conceptsLisibles", () => {
  it("montre les concepts dès qu'ils existent, sans attendre les questions", () => {
    expect(conceptsLisibles("questions")).toBe(true);
    expect(conceptsLisibles("pret")).toBe(true);
    expect(conceptsLisibles("decoupage")).toBe(false);
  });
});

describe("redecoupable", () => {
  it("propose de retenter là où le texte peut encore donner quelque chose", () => {
    expect(redecoupable("vide")).toBe(true);
    expect(redecoupable("echec")).toBe(true);
  });

  it("ne propose pas de repayer un appel pour la même réponse", () => {
    expect(redecoupable("rejete")).toBe(false);
  });

  it("ne propose rien tant que le dépôt travaille ou porte ses concepts", () => {
    expect(redecoupable("decoupage")).toBe(false);
    expect(redecoupable("pret")).toBe(false);
  });
});
