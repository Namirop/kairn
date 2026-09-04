import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { etalonUtile } from "./etalon-utile";

describe("etalonUtile", () => {
  it("masque un étalon qui recopie l'option", () => {
    expect(etalonUtile("Faux", "Faux")).toBe(false);
    expect(etalonUtile("Terre battue", "Terre battue")).toBe(false);
  });

  it("masque une recopie que seule la ponctuation distingue", () => {
    expect(
      etalonUtile(
        "Il n'est pas cumulatif, il glisse sur une fenêtre de 52 semaines.",
        "Il n'est pas cumulatif, il glisse sur une fenêtre de 52 semaines",
      ),
    ).toBe(false);
    expect(etalonUtile("  faux.  ", "Faux")).toBe(false);
  });

  it("masque une recopie précédée d'une amorce vide", () => {
    expect(
      etalonUtile(
        "Elle doit mettre à jour tous les index existants sur la table.",
        "Mettre à jour tous les index existants sur la table",
      ),
    ).toBe(false);
    expect(etalonUtile("C'est la terre battue", "La terre battue")).toBe(false);
  });

  it("montre un étalon qui explique ce que l'option affirme", () => {
    expect(
      etalonUtile(
        "La terre battue, car la couche de brique pilée absorbe une partie de la composante horizontale de la vitesse à l'impact.",
        "Terre battue",
      ),
    ).toBe(true);
    expect(etalonUtile("Faux. Le classement glisse sur cinquante-deux semaines.", "Faux")).toBe(
      true,
    );
  });

  it("montre un étalon qui parle d'autre chose", () => {
    expect(etalonUtile("Le seuil se mesure au repos.", "Terre battue")).toBe(true);
  });

  it("masque un étalon plus court que l'option qu'il abrège", () => {
    expect(etalonUtile("les index existants", "Mettre à jour les index existants")).toBe(false);
  });

  it("ne se laisse pas prendre par un fragment de mot", () => {
    // « art » vit dans « parties » sans être un mot de la phrase.
    expect(etalonUtile("Quatre parties égales dans un quart de tour", "art")).toBe(true);
  });

  it("masque un étalon vide, et montre celui qui n'a pas d'option en face", () => {
    expect(etalonUtile("", "Terre battue")).toBe(false);
    expect(etalonUtile("   ", "Terre battue")).toBe(false);
    expect(etalonUtile("Trois séries par semaine.", "")).toBe(true);
  });

  it("ne trouve jamais utile un étalon identique à son option", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        expect(etalonUtile(texte, texte)).toBe(false);
      }),
    );
  });

  it("reste insensible à la casse et à la ponctuation de fin", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Zà-üÀ-Ü0-9 ]{1,40}$/).filter((t) => /[a-zA-Z0-9]/.test(t)),
        fc.constantFrom(".", " !", "…", " ", ",", ""),
        (option, ponctuation) => {
          expect(etalonUtile(`${option.toUpperCase()}${ponctuation}`, option)).toBe(false);
        },
      ),
    );
  });

  it("montre toujours un étalon qui ajoute une phrase entière", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zà-ü]{2,12}( [a-zà-ü]{2,12}){0,3}$/), (option) => {
        const explication = "parce que la couche absorbe une partie de la vitesse à l'impact";
        expect(etalonUtile(`${option}, ${explication}`, option)).toBe(true);
      }),
    );
  });
});

describe("les accords ne font pas une explication", () => {
  it("masque une recopie qui ne change qu'un nombre ou un temps", () => {
    expect(
      etalonUtile(
        "Elle doit mettre à jour tous les index existant sur la table.",
        "Mettre à jour tous les index existants sur la table",
      ),
    ).toBe(false);
    expect(etalonUtile("La commande mesure les temps.", "La commande mesure le temps")).toBe(false);
  });

  it("montre encore un étalon qui ajoute une cause", () => {
    expect(
      etalonUtile(
        "La commande mesure les temps, parce qu'elle exécute réellement la requête au lieu de l'estimer.",
        "La commande mesure le temps",
      ),
    ).toBe(true);
  });
});
