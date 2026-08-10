import { describe, expect, it } from "vitest";
import { conceptsLisibles, etatDuDepot, libelleEtat, type AvancementDepot } from "./etat-depot";

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

  it("prend l'étape la plus en amont quand plusieurs travaux attendent", () => {
    const melange = avancement({ travaux: [{ kind: "VARIANTS" }, { kind: "OCR" }] });

    expect(etatDuDepot(melange)).toBe("lecture");
  });

  it("tient compte de la clôture qui n'a pas encore eu lieu", () => {
    expect(etatDuDepot(avancement({ concepts: 4 }))).toBe("questions");
    expect(etatDuDepot(avancement({ concepts: 0 }))).toBe("decoupage");
  });

  it("laisse l'état final l'emporter sur les travaux restants", () => {
    const fini = avancement({ status: "READY", travaux: [{ kind: "VARIANTS" }] });
    const rate = avancement({ status: "FAILED", travaux: [{ kind: "ATOMS" }] });

    expect(etatDuDepot(fini)).toBe("pret");
    expect(etatDuDepot(rate)).toBe("echec");
  });
});

describe("libelleEtat", () => {
  it("nomme chaque étape du point de vue de l'utilisateur", () => {
    expect(libelleEtat("lecture")).toBe("Lecture de la capture");
    expect(libelleEtat("questions")).toBe("Écriture des questions");
  });
});

describe("conceptsLisibles", () => {
  it("montre les concepts dès qu'ils existent, sans attendre les questions", () => {
    expect(conceptsLisibles("questions")).toBe(true);
    expect(conceptsLisibles("pret")).toBe(true);
    expect(conceptsLisibles("decoupage")).toBe(false);
  });
});
