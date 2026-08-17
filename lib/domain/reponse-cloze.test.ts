import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ecartTolere, normaliserReponse, reponseAcceptee } from "./reponse-cloze";

/**
 * Les formes acceptées telles que la génération les écrit : le terme masqué
 * d'abord, puis ses variantes de nombre, de genre, et ses abréviations.
 */
const ULTRAVIOLETS = ["les rayons ultraviolets", "ultraviolets", "ultraviolet", "UV"];

describe("reponseAcceptee", () => {
  it("accepte la forme exacte", () => {
    expect(reponseAcceptee("ultraviolets", ULTRAVIOLETS)).toBe(true);
  });

  it("ignore la casse, les accents et les espaces autour", () => {
    expect(reponseAcceptee("  ÉLECTRON  ", ["électron"])).toBe(true);
    expect(reponseAcceptee("electron", ["électron"])).toBe(true);
    expect(reponseAcceptee("Électron", ["electron"])).toBe(true);
  });

  it("accepte le pluriel et l'abréviation quand la génération les a listés", () => {
    expect(reponseAcceptee("ultraviolet", ULTRAVIOLETS)).toBe(true);
    expect(reponseAcceptee("uv", ULTRAVIOLETS)).toBe(true);
  });

  it("accepte une faute de frappe sur un mot long", () => {
    expect(reponseAcceptee("ultravioets", ULTRAVIOLETS)).toBe(true);
    expect(reponseAcceptee("symbiosse", ["symbiose"])).toBe(true);
  });

  it("refuse une faute sur un mot court, où une lettre change le sens", () => {
    expect(reponseAcceptee("ver", ["vert"])).toBe(false);
    expect(reponseAcceptee("uw", ULTRAVIOLETS)).toBe(false);
  });

  it("refuse une réponse fausse, même de la bonne longueur", () => {
    expect(reponseAcceptee("infrarouges", ULTRAVIOLETS)).toBe(false);
    expect(reponseAcceptee("champignon", ["symbiose"])).toBe(false);
  });

  it("refuse une réponse vide, quoi qu'on accepte", () => {
    expect(reponseAcceptee("", ULTRAVIOLETS)).toBe(false);
    expect(reponseAcceptee("   ", ULTRAVIOLETS)).toBe(false);
    expect(reponseAcceptee("", [""])).toBe(false);
  });

  it("refuse quand il n'y a rien à accepter", () => {
    expect(reponseAcceptee("symbiose", [])).toBe(false);
  });

  it("traite le trait d'union et l'apostrophe comme des espaces", () => {
    expect(reponseAcceptee("porte greffe", ["porte-greffe"])).toBe(true);
    expect(reponseAcceptee("porte-greffe", ["porte greffe"])).toBe(true);
  });

  it("absorbe un déterminant de tête, en trop comme en moins", () => {
    expect(reponseAcceptee("l'overtraining", ["overtraining"])).toBe(true);
    expect(reponseAcceptee("Le surentraînement", ["surentraînement"])).toBe(true);
    expect(reponseAcceptee("rayons ultraviolets", ["les rayons ultraviolets"])).toBe(true);
    expect(reponseAcceptee("the overtraining", ["overtraining"])).toBe(true);
  });

  it("garde le déterminant quand c'est lui la réponse", () => {
    expect(reponseAcceptee("le", ["le"])).toBe(true);
    expect(reponseAcceptee("le", ["la"])).toBe(false);
  });

  it("refuse un mot de contenu en moins", () => {
    // Un mot de contenu qui manque, ce n'est pas une faute de frappe : c'est une
    // autre réponse. La forme courte est acceptée parce qu'elle est listée, pas
    // parce qu'on rogne la phrase.
    expect(reponseAcceptee("ultraviolets", ["les rayons ultraviolets"])).toBe(false);
    expect(reponseAcceptee("ultraviolets", ULTRAVIOLETS)).toBe(true);
    expect(reponseAcceptee("volume excessif", ["excès de volume"])).toBe(false);
  });

  it("ne laisse pas la ponctuation de fin faire échouer", () => {
    expect(reponseAcceptee("symbiose.", ["symbiose"])).toBe(true);
    expect(reponseAcceptee("« symbiose »", ["symbiose"])).toBe(true);
  });
});

describe("ecartTolere", () => {
  it("ne tolère rien en deçà de six lettres, une lettre ensuite, deux au-delà de dix", () => {
    expect(ecartTolere("vert")).toBe(0);
    expect(ecartTolere("algue")).toBe(0);
    expect(ecartTolere("lichen")).toBe(1);
    expect(ecartTolere("symbiose")).toBe(1);
    expect(ecartTolere("ultraviolet")).toBe(2);
  });
});

describe("propriétés", () => {
  const mot = fc.stringMatching(/^[a-z]{1,20}$/);

  it("accepte toujours une forme listée, telle quelle", () => {
    fc.assert(
      fc.property(fc.array(mot, { minLength: 1, maxLength: 5 }), (formes) => {
        return formes.every((forme) => reponseAcceptee(forme, formes));
      }),
      { numRuns: 200 },
    );
  });

  it("ne dépend ni de la casse ni des accents", () => {
    fc.assert(
      fc.property(mot, fc.array(mot, { minLength: 1, maxLength: 4 }), (saisie, formes) => {
        const bruitee = saisie.toUpperCase().replace(/e/gi, "é").replace(/a/gi, "à");

        return reponseAcceptee(saisie, formes) === reponseAcceptee(bruitee, formes);
      }),
      { numRuns: 300 },
    );
  });

  it("un déterminant ajouté en tête ne change pas le verdict", () => {
    fc.assert(
      fc.property(mot, fc.array(mot, { minLength: 1, maxLength: 4 }), (saisie, formes) => {
        return reponseAcceptee(saisie, formes) === reponseAcceptee(`l'${saisie}`, formes);
      }),
      { numRuns: 300 },
    );
  });

  it("normalise une fois pour toutes : renormaliser ne change plus rien", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (texte) => {
        const une = normaliserReponse(texte);

        return normaliserReponse(une) === une;
      }),
      { numRuns: 300 },
    );
  });

  it("accepte autant de lettres de travers que la tolérance en autorise", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z]{1,20}$/), fc.nat(), (terme, graine) => {
        const tolere = ecartTolere(terme);

        if (tolere === 0 || terme.length === 0) return true;

        // Une substitution par position distincte : la distance vaut
        // exactement le nombre de lettres remplacées.
        const positions = Array.from(
          { length: tolere },
          (_, rang) => (graine + rang) % terme.length,
        );
        const abimee = [...terme];

        for (const position of new Set(positions)) {
          abimee[position] = abimee[position] === "x" ? "y" : "x";
        }

        return reponseAcceptee(abimee.join(""), [terme]);
      }),
      { numRuns: 300 },
    );
  });
});
