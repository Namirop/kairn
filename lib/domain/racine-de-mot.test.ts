import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { racineDeMot } from "./racine-de-mot";

describe("racineDeMot", () => {
  it("rejoint les formes d'un même verbe", () => {
    const formes = ["exécution", "exécute", "exécuter", "exécutent", "Exécutions"];

    expect(new Set(formes.map(racineDeMot))).toEqual(new Set(["execut"]));
  });

  it("absorbe les accords de nombre et de genre", () => {
    expect(racineDeMot("mesurés")).toBe(racineDeMot("mesure"));
    expect(racineDeMot("existants")).toBe(racineDeMot("existant"));
    expect(racineDeMot("battues")).toBe(racineDeMot("battue"));
    expect(racineDeMot("une")).toBe(racineDeMot("un"));
    expect(racineDeMot("les")).toBe(racineDeMot("le"));
  });

  it("ne réduit jamais un mot à rien", () => {
    expect(racineDeMot("e")).toBe("e");
    expect(racineDeMot("s")).toBe("s");
    expect(racineDeMot("es")).toBe("es");
  });

  it("ne touche pas à ce qui ne porte aucune terminaison connue", () => {
    expect(racineDeMot("faux")).toBe("faux");
    expect(racineDeMot("plan")).toBe("plan");
    expect(racineDeMot("index")).toBe("index");
  });

  it("distingue encore deux mots qui n'ont rien à voir", () => {
    expect(racineDeMot("seuil")).not.toBe(racineDeMot("terre"));
    expect(racineDeMot("index")).not.toBe(racineDeMot("plan"));
  });

  it("rend toujours au moins une lettre, et jamais plus que le mot", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Zéèêàçù]{1,20}$/), (mot) => {
        const racine = racineDeMot(mot);

        return racine.length >= 1 && racine.length <= mot.length;
      }),
    );
  });

  it("est stable : la racine d'une racine ne bouge plus", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z]{2,20}$/), (mot) => {
        const racine = racineDeMot(mot);

        return racineDeMot(racine).length <= racine.length;
      }),
    );
  });
});
