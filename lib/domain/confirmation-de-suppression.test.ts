import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { confirmationValide, MOT_DE_CONFIRMATION } from "./confirmation-de-suppression";
import type { LangueDuProduit } from "./langue-du-produit";

const LANGUES: LangueDuProduit[] = ["FR", "EN"];

describe("confirmationValide", () => {
  it("accepte le mot exact de chaque langue", () => {
    expect(confirmationValide(MOT_DE_CONFIRMATION.FR, "FR")).toBe(true);
    expect(confirmationValide(MOT_DE_CONFIRMATION.EN, "EN")).toBe(true);
  });

  /** Majuscule automatique et espace finale : ce que rend un clavier mobile. */
  it("tolère la casse et les espaces autour", () => {
    expect(confirmationValide("Supprimer ", "FR")).toBe(true);
    expect(confirmationValide("  SUPPRIMER", "FR")).toBe(true);
    expect(confirmationValide("Delete ", "EN")).toBe(true);
  });

  it("refuse un mot approchant", () => {
    expect(confirmationValide("supprime", "FR")).toBe(false);
    expect(confirmationValide("supprimer mon compte", "FR")).toBe(false);
    expect(confirmationValide("", "FR")).toBe(false);
    expect(confirmationValide("delete my account", "EN")).toBe(false);
  });

  it("refuse le mot de l'autre langue : seul celui que l'écran a demandé confirme", () => {
    expect(confirmationValide("delete", "FR")).toBe(false);
    expect(confirmationValide("supprimer", "EN")).toBe(false);
  });

  it("ne se laisse jamais confirmer par autre chose", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 40 }),
        fc.constantFrom(...LANGUES),
        (saisie, langue) =>
          !confirmationValide(saisie, langue) ||
          saisie.trim().toLowerCase() === MOT_DE_CONFIRMATION[langue],
      ),
      { numRuns: 500 },
    );
  });
});
