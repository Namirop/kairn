import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CHOIX_VRAI_FAUX, choixDUnVraiOuFaux } from "./choix-proposes";

describe("choixDUnVraiOuFaux", () => {
  it("croit le booléen du payload avant tout", () => {
    expect(choixDUnVraiOuFaux(true, "Faux. Peu importe.")).toEqual({
      options: ["Vrai", "Faux"],
      correctIndex: 0,
    });
    expect(choixDUnVraiOuFaux(false, "")).toEqual({ options: ["Vrai", "Faux"], correctIndex: 1 });
  });

  it("lit la réponse quand le payload ne dit rien", () => {
    expect(choixDUnVraiOuFaux(null, "Vrai")?.correctIndex).toBe(0);
    expect(choixDUnVraiOuFaux(undefined, "Faux")?.correctIndex).toBe(1);
  });

  it("lit une réponse générée, qui explique après le verdict", () => {
    const answerKey =
      "Faux. Les crochets lisent une propriété dont le nom est la chaîne « -1 », qui n'existe pas.";

    expect(choixDUnVraiOuFaux(null, answerKey)?.correctIndex).toBe(1);
  });

  it("ne se laisse pas arrêter par la casse, les accents ou la ponctuation", () => {
    expect(choixDUnVraiOuFaux(null, "VRAI, et voici pourquoi")?.correctIndex).toBe(0);
    expect(choixDUnVraiOuFaux(null, "  « Fàux » — en réalité…")?.correctIndex).toBe(1);
    expect(choixDUnVraiOuFaux(null, "vrai.")?.correctIndex).toBe(0);
  });

  it("rend null quand rien ne permet de trancher", () => {
    expect(choixDUnVraiOuFaux(null, "Ça dépend du contexte.")).toBeNull();
    expect(choixDUnVraiOuFaux(null, "")).toBeNull();
    expect(choixDUnVraiOuFaux("vrai", "Ça dépend.")).toBeNull();
  });

  it("ne confond pas un mot qui commence par les mêmes lettres", () => {
    expect(choixDUnVraiOuFaux(null, "Vraisemblablement, mais pas toujours.")).toBeNull();
    expect(choixDUnVraiOuFaux(null, "Fausser la mesure serait pire.")).toBeNull();
  });

  it("propose toujours les deux mêmes options, et un index qui existe", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.boolean(), fc.constant(null), fc.string()),
        fc.string({ maxLength: 60 }),
        (attendu, answerKey) => {
          const choix = choixDUnVraiOuFaux(attendu, answerKey);

          if (!choix) return true;

          return (
            choix.options.length === CHOIX_VRAI_FAUX.length &&
            choix.correctIndex >= 0 &&
            choix.correctIndex < choix.options.length
          );
        },
      ),
      { numRuns: 400 },
    );
  });
});
