import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { texteRetenu } from "./texte-retenu";

const DEPOT = `Un index composite sur (a, b) sert une requête qui filtre sur a, ou sur a et b.
Il ne sert pas une requête qui ne filtre que sur b.

Barre latérale — Abonnez-vous à la lettre hebdomadaire pour ne rien manquer.`;

describe("texteRetenu", () => {
  it("rend la part gardée quand la consigne a écarté un bloc", () => {
    const garde = `Un index composite sur (a, b) sert une requête qui filtre sur a, ou sur a et b.
Il ne sert pas une requête qui ne filtre que sur b.`;

    expect(texteRetenu(DEPOT, garde)).toBe(garde);
  });

  it("ne rend rien quand le modèle n'a pas répondu", () => {
    expect(texteRetenu(DEPOT, null)).toBeNull();
    expect(texteRetenu(DEPOT, undefined)).toBeNull();
    expect(texteRetenu(DEPOT, "")).toBeNull();
    expect(texteRetenu(DEPOT, "   \n  ")).toBeNull();
  });

  it("ne rend rien quand la consigne n'a rien écarté", () => {
    expect(texteRetenu(DEPOT, DEPOT)).toBeNull();
  });

  it("ne rend rien quand seuls les blancs diffèrent", () => {
    const replie = DEPOT.replace(/\n/g, "  ").replace(/ {2,}/g, "   ");

    expect(texteRetenu(DEPOT, replie)).toBeNull();
  });

  it("tolère un repli de lignes différent à l'intérieur d'un passage gardé", () => {
    const garde =
      "Un index composite sur (a, b) sert une requête qui filtre sur a,\nou sur a et b.";

    expect(texteRetenu(DEPOT, garde)).toBe(garde);
  });

  it("refuse une paraphrase, même fidèle au sens", () => {
    const paraphrase = "Un index sur deux colonnes ne sert pas une requête portant sur la seconde.";

    expect(texteRetenu(DEPOT, paraphrase)).toBeNull();
  });

  it("refuse un rendu dont une seule ligne n'est pas dans le dépôt", () => {
    const melange = `Il ne sert pas une requête qui ne filtre que sur b.
Et il faut penser à faire un VACUUM de temps en temps.`;

    expect(texteRetenu(DEPOT, melange)).toBeNull();
  });

  it("refuse un rendu plus long que le dépôt", () => {
    expect(texteRetenu(DEPOT, `${DEPOT}\nUne phrase ajoutée par le modèle.`)).toBeNull();
  });

  it("garde le rendu tel quel, sans normaliser ce qu'il renvoie", () => {
    const garde =
      "Un index composite sur (a, b) sert une requête qui filtre sur a,\nou sur a et b.";

    expect(texteRetenu(DEPOT, `  ${garde}  `)).toBe(garde);
  });

  /*
    La propriété qui tient tout : ce qui sort est toujours un extrait du dépôt.

    C'est la seule chose que l'écran promet — le texte d'origine n'est jamais
    réécrit — et c'est la seule que la garde doive garantir, quoi que le modèle
    ait rendu.
  */
  it("ne rend jamais autre chose qu'un extrait fidèle du dépôt", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (source, rendu) => {
        const sortie = texteRetenu(source, rendu);

        if (sortie === null) return true;

        const plat = source.replace(/\s+/g, " ").trim();

        return sortie
          .split("\n")
          .map((ligne) => ligne.replace(/\s+/g, " ").trim())
          .filter((ligne) => ligne.length > 0)
          .every((ligne) => plat.includes(ligne));
      }),
    );
  });

  it("ne rend jamais le dépôt entier : ce serait une vue sans différence", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (source) => {
        return texteRetenu(source, source) === null;
      }),
    );
  });
});
