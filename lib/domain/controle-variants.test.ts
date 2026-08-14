import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { controlerVariants, FACETTES_ATTENDUES, type VariantAControler } from "./controle-variants";
import { TROU } from "./reponse-cloze";

/**
 * Un lot bien composé : quatre facettes dans l'ordre, quatre formats distincts,
 * une seule question que la personne aura à se noter elle-même, et un texte à
 * trou pour qu'elle ait à produire une réponse au moins une fois.
 */
const FORMATS_PAR_DEFAUT = ["CLOZE", "EXPLAIN", "TRUE_FALSE", "CODE"];

function variante(reglages: Partial<VariantAControler> = {}, rang = 0): VariantAControler {
  const format = reglages.format ?? FORMATS_PAR_DEFAUT[rang] ?? "TRUE_FALSE";

  return {
    format,
    facet: FACETTES_ATTENDUES[rang] ?? "RECOGNITION",
    question: "Depuis quel bout du tableau un index négatif est-il compté ?",
    answerKey: "Depuis la fin. Un index de moins un désigne le dernier élément.",
    options: null,
    correctIndex: null,
    cloze:
      format === "CLOZE"
        ? {
            sentence: `Un index négatif se compte depuis ${TROU} du tableau.`,
            accepted: ["la fin"],
          }
        : null,
    // Un vrai ou faux bien formé déclare sa valeur. Aucune cible n'est posée
    // ici : ce fichier contrôle la composition d'un lot, pas l'obéissance d'une
    // question à ce que l'envoi lui demandait.
    estVraie: format === "TRUE_FALSE" ? false : null,
    ...reglages,
  };
}

function quatreVariantes(): VariantAControler[] {
  return FACETTES_ATTENDUES.map((facet, rang) => variante({ facet }, rang));
}

/** Un QCM complet : privé de ses options, c'est un autre manquement qui parle. */
function qcm(facet: string, rang: number): VariantAControler {
  const options = ["un", "deux", "trois", "quatre"];

  return variante({ facet, format: "MCQ", options, correctIndex: 1 }, rang);
}

/** Un lot composé format par format, les QCM servis avec leurs options. */
function lotDeFormats(formats: string[]): VariantAControler[] {
  return FACETTES_ATTENDUES.map((facet, rang) =>
    formats[rang] === "MCQ" ? qcm(facet, rang) : variante({ facet, format: formats[rang] }, rang),
  );
}

describe("controlerVariants", () => {
  it("ne reproche rien à quatre variantes bien formées", () => {
    expect(controlerVariants(quatreVariantes())).toEqual([]);
  });

  it("signale une facette répétée", () => {
    const variantes = quatreVariantes();
    variantes[3] = variante({ facet: "RECOGNITION" }, 3);

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("facettes");
  });

  it("signale les quatre facettes servies dans le désordre", () => {
    const variantes = [...quatreVariantes()].reverse();
    const regles = controlerVariants(variantes).map((m) => m.regle);

    expect(regles).toContain("ordre");
    expect(regles).not.toContain("facettes");
  });

  it("signale un lot où deux formats seulement se partagent quatre questions", () => {
    const variantes = lotDeFormats(["SHORT_ANSWER", "SHORT_ANSWER", "TRUE_FALSE", "TRUE_FALSE"]);

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("formats");
  });

  it("signale un lot qui demande de se noter soi-même plus d'une fois", () => {
    const variantes = lotDeFormats(["SHORT_ANSWER", "EXPLAIN", "TRUE_FALSE", "CODE"]);
    const manquements = controlerVariants(variantes);

    // Quatre formats distincts : l'ancien contrôle ne voyait rien de ce lot.
    expect(manquements.map((m) => m.regle)).not.toContain("formats");
    expect(manquements.find((m) => m.regle === "texte libre")?.detail).toContain("2 questions");
  });

  it("laisse passer une seule question à s'auto-noter", () => {
    const variantes = lotDeFormats(["MCQ", "EXPLAIN", "CLOZE", "CODE"]);

    expect(controlerVariants(variantes).map((m) => m.regle)).not.toContain("texte libre");
  });

  it("signale un lot où rien ne demande de produire la réponse", () => {
    const variantes = lotDeFormats(["MCQ", "EXPLAIN", "TRUE_FALSE", "MCQ"]);
    const manquements = controlerVariants(variantes);

    // Le lot est régulier partout ailleurs : trois formats distincts, une seule
    // question à s'auto-noter. Aucun autre contrôle ne l'attrape.
    expect(manquements.map((m) => m.regle)).toEqual(["rappel"]);
    expect(manquements[0]?.detail).toContain("MCQ, EXPLAIN, TRUE_FALSE, MCQ");
  });

  it("se contente d'un seul texte à trou", () => {
    const variantes = lotDeFormats(["CLOZE", "EXPLAIN", "TRUE_FALSE", "MCQ"]);

    expect(controlerVariants(variantes).map((m) => m.regle)).not.toContain("rappel");
  });

  it("signale un lot qui ne rend pas quatre questions", () => {
    expect(controlerVariants(quatreVariantes().slice(0, 3)).map((m) => m.regle)).toContain(
      "nombre",
    );
  });

  it("situe le manquement sur la variante qu'il vise", () => {
    const variantes = quatreVariantes();
    variantes[2] = variante(
      {
        facet: "BOUNDARY",
        question: "L'index négatif est compté depuis la fin du tableau : vrai ou faux ?",
        answerKey: "L'index négatif est compté depuis la fin du tableau",
      },
      2,
    );
    const cite = controlerVariants(variantes).find((m) => m.regle === "réponse citée");

    expect(cite?.rang).toBe(2);
  });
});

describe("propriétés", () => {
  it("rend toujours autant de manquements de facette que de désordre introduit", () => {
    fc.assert(
      fc.property(fc.shuffledSubarray([0, 1, 2, 3], { minLength: 4, maxLength: 4 }), (ordre) => {
        const variantes = ordre.map((rang, position) =>
          variante({ facet: FACETTES_ATTENDUES[rang] }, position),
        );
        const regles = controlerVariants(variantes).map((m) => m.regle);
        const trie = ordre.every((rang, position) => rang === position);

        return trie ? !regles.includes("ordre") : regles.includes("ordre");
      }),
      { numRuns: 100 },
    );
  });

  it("ne signale le texte libre que passé une question, quel que soit le lot", () => {
    const format = fc.constantFrom("MCQ", "CLOZE", "TRUE_FALSE", "CODE", "SHORT_ANSWER", "EXPLAIN");

    fc.assert(
      fc.property(fc.array(format, { minLength: 4, maxLength: 4 }), (formats) => {
        const variantes = FACETTES_ATTENDUES.map((facet, rang) =>
          variante({ facet, format: formats[rang] }, rang),
        );
        const signale = controlerVariants(variantes).some((m) => m.regle === "texte libre");
        const libres = formats.filter((f) => f === "SHORT_ANSWER" || f === "EXPLAIN").length;

        return signale === libres > 1;
      }),
      { numRuns: 300 },
    );
  });
});
