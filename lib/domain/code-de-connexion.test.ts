import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { codeComplet, lireLeCode, LONGUEUR_DU_CODE } from "./code-de-connexion";

describe("lireLeCode", () => {
  it("laisse passer un code déjà propre", () => {
    expect(lireLeCode("123456")).toBe("123456");
  });

  it("retire ce que le presse-papier rapporte autour", () => {
    expect(lireLeCode(" 123456 ")).toBe("123456");
    expect(lireLeCode("123 456")).toBe("123456");
    expect(lireLeCode("123-456")).toBe("123456");
    expect(lireLeCode("123456\n")).toBe("123456");
  });

  it("retrouve le code dans la phrase qui le porte", () => {
    // Une sélection qui déborde dans le mail, cas le plus fréquent du bouton coller.
    expect(lireLeCode("Ton code : 123456")).toBe("123456");
  });

  it("garde les premiers chiffres quand la sélection déborde après le code", () => {
    // « Code : 123456 — il expire dans 10 minutes » : le code vient en premier.
    expect(lireLeCode("123456 expire dans 10 minutes")).toBe("123456");
  });

  it("rend une chaîne vide quand il n'y a aucun chiffre", () => {
    expect(lireLeCode("")).toBe("");
    expect(lireLeCode("aucun chiffre ici")).toBe("");
  });

  it("ne rend jamais plus que la longueur attendue", () => {
    fc.assert(
      fc.property(fc.string(), (saisie) => {
        expect(lireLeCode(saisie).length).toBeLessThanOrEqual(LONGUEUR_DU_CODE);
      }),
    );
  });

  it("ne rend que des chiffres, quoi qu'on lui donne", () => {
    fc.assert(
      fc.property(fc.string(), (saisie) => {
        expect(lireLeCode(saisie)).toMatch(/^\d*$/);
      }),
    );
  });

  it("est idempotente : relire un code lu ne le change plus", () => {
    fc.assert(
      fc.property(fc.string(), (saisie) => {
        const lu = lireLeCode(saisie);
        expect(lireLeCode(lu)).toBe(lu);
      }),
    );
  });
});

describe("codeComplet", () => {
  it("reconnaît un code entier, quelle que soit sa mise en forme", () => {
    expect(codeComplet("123456")).toBe(true);
    expect(codeComplet(" 123 456 ")).toBe(true);
    expect(codeComplet("Ton code : 123456")).toBe(true);
  });

  it("refuse un code entamé", () => {
    expect(codeComplet("")).toBe(false);
    expect(codeComplet("12345")).toBe(false);
  });

  it("accepte une saisie qui porte plus de chiffres que nécessaire", () => {
    // Les six premiers suffisent : c'est ce que `lireLeCode` en garde.
    expect(codeComplet("1234567")).toBe(true);
  });

  it("est vraie exactement quand la lecture rend la longueur attendue", () => {
    fc.assert(
      fc.property(fc.string(), (saisie) => {
        expect(codeComplet(saisie)).toBe(lireLeCode(saisie).length === LONGUEUR_DU_CODE);
      }),
    );
  });
});
