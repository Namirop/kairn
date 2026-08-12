import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { confirmationValide, MOT_DE_CONFIRMATION } from "./confirmation-de-suppression";

describe("confirmationValide", () => {
  it("accepte le mot exact", () => {
    expect(confirmationValide(MOT_DE_CONFIRMATION)).toBe(true);
  });

  /** Majuscule automatique et espace finale : ce que rend un clavier mobile. */
  it("tolère la casse et les espaces autour", () => {
    expect(confirmationValide("Supprimer ")).toBe(true);
    expect(confirmationValide("  SUPPRIMER")).toBe(true);
  });

  it("refuse un mot approchant", () => {
    expect(confirmationValide("supprime")).toBe(false);
    expect(confirmationValide("supprimer mon compte")).toBe(false);
    expect(confirmationValide("")).toBe(false);
  });

  it("ne se laisse jamais confirmer par autre chose", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 40 }),
        (saisie) =>
          !confirmationValide(saisie) || saisie.trim().toLowerCase() === MOT_DE_CONFIRMATION,
      ),
      { numRuns: 500 },
    );
  });
});
