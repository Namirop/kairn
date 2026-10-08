import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { langueDepuisCode, langueDevinee, langueDuNavigateur } from "./langue-devinee";

describe("langueDepuisCode", () => {
  it("lit un code de langue, avec ou sans région", () => {
    expect(langueDepuisCode("fr")).toBe("FR");
    expect(langueDepuisCode("EN")).toBe("EN");
    expect(langueDepuisCode("en-GB")).toBe("EN");
    expect(langueDepuisCode("fr_BE")).toBe("FR");
  });

  it("refuse ce que le produit ne parle pas", () => {
    expect(langueDepuisCode("pt")).toBeNull();
    expect(langueDepuisCode("frr")).toBeNull();
    expect(langueDepuisCode("")).toBeNull();
    expect(langueDepuisCode(null)).toBeNull();
    expect(langueDepuisCode(undefined)).toBeNull();
  });
});

describe("langueDuNavigateur", () => {
  it("prend la première langue du produit dans l'ordre du navigateur", () => {
    expect(langueDuNavigateur("en-US,en;q=0.9")).toBe("EN");
    expect(langueDuNavigateur("fr-FR,fr;q=0.9,en;q=0.8")).toBe("FR");
  });

  it("passe une langue que le produit ne parle pas pour la suivante", () => {
    // Le premier inscrit externe : un navigateur portugais qui lit l'anglais.
    expect(langueDuNavigateur("pt-PT,pt;q=0.9,en;q=0.8")).toBe("EN");
  });

  it("suit le poids et non l'ordre d'écriture", () => {
    expect(langueDuNavigateur("en;q=0.5,fr;q=0.9")).toBe("FR");
  });

  it("départage deux poids égaux par l'ordre d'écriture", () => {
    expect(langueDuNavigateur("en;q=0.8,fr;q=0.8")).toBe("EN");
  });

  it("écarte une langue de poids nul", () => {
    expect(langueDuNavigateur("en;q=0,fr;q=0.3")).toBe("FR");
  });

  it("ne trouve rien dans un en-tête vide, illisible, ou sans langue du produit", () => {
    expect(langueDuNavigateur("")).toBeNull();
    expect(langueDuNavigateur(null)).toBeNull();
    expect(langueDuNavigateur("*")).toBeNull();
    expect(langueDuNavigateur("de-DE,de;q=0.9")).toBeNull();
    expect(langueDuNavigateur(";;,,q=abc")).toBeNull();
  });
});

describe("langueDevinee", () => {
  it("fait passer le choix explicite avant le navigateur", () => {
    expect(langueDevinee({ choix: "fr", acceptLanguage: "en-US" })).toBe("FR");
    expect(langueDevinee({ choix: "en", acceptLanguage: "fr-FR" })).toBe("EN");
  });

  it("retombe sur le navigateur quand le choix est absent ou illisible", () => {
    expect(langueDevinee({ choix: null, acceptLanguage: "en-US" })).toBe("EN");
    expect(langueDevinee({ choix: "klingon", acceptLanguage: "en-US" })).toBe("EN");
  });

  it("parle français quand rien ne tranche", () => {
    expect(langueDevinee({ choix: null, acceptLanguage: "de-DE" })).toBe("FR");
    expect(langueDevinee({ choix: undefined, acceptLanguage: undefined })).toBe("FR");
  });

  it("rend toujours une langue du produit, quoi qu'on lui passe", () => {
    fc.assert(
      fc.property(fc.option(fc.string()), fc.option(fc.string()), (choix, acceptLanguage) => {
        expect(["FR", "EN"]).toContain(langueDevinee({ choix, acceptLanguage }));
      }),
    );
  });
});
