import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  composerEntrainement,
  QUESTIONS_PAR_TOUR,
  type ConceptEntrainable,
  type VarianteEntrainable,
} from "./selection-entrainement";
import { gesteDeReponse } from "./geste-de-reponse";

const FACETTES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

/** Un format par facette, comme la génération les répartit sur un concept. */
const FORMATS = ["MCQ", "CLOZE", "TRUE_FALSE", "EXPLAIN"] as const;

function variante(
  id: string,
  facet: string,
  format: string,
  reglages: Partial<VarianteEntrainable> = {},
): VarianteEntrainable {
  return {
    id,
    facet,
    format,
    sessionCount: 0,
    trainingCount: 0,
    lastSessionAt: null,
    ...reglages,
  };
}

function concept(id: string, reglages: Partial<VarianteEntrainable>[] = []): ConceptEntrainable {
  return {
    id,
    variants: FACETTES.map((facet, rang) =>
      variante(`${id}-${facet}`, facet, FORMATS[rang] ?? "EXPLAIN", reglages[rang] ?? {}),
    ),
  };
}

/** Le format d'une question tirée, retrouvé depuis son identifiant de variante. */
function formatDe(concepts: ConceptEntrainable[], variantId: string): string {
  const trouvee = concepts
    .flatMap((concept) => concept.variants)
    .find((variante) => variante.id === variantId);

  return trouvee?.format ?? "";
}

describe("composerEntrainement", () => {
  it("ne tire rien quand il n'y a aucun concept", () => {
    expect(composerEntrainement([])).toEqual([]);
  });

  it("ignore un concept sans question active", () => {
    expect(composerEntrainement([{ id: "vide", variants: [] }])).toEqual([]);
  });

  it("tire les huit questions de deux concepts", () => {
    const tirees = composerEntrainement([concept("un"), concept("deux")]);

    expect(tirees).toHaveLength(8);
    expect(new Set(tirees.map((question) => question.variantId)).size).toBe(8);
  });

  it("alterne les concepts au lieu de les grouper", () => {
    const tirees = composerEntrainement([concept("un"), concept("deux")]);
    const suite = tirees.map((question) => question.atomId);

    expect(suite.every((atomId, rang) => rang === 0 || atomId !== suite[rang - 1])).toBe(true);
  });

  it("repasse sur le même concept quand c'est le seul", () => {
    const tirees = composerEntrainement([concept("seul")]);

    expect(tirees).toHaveLength(4);
    expect(new Set(tirees.map((question) => question.atomId))).toEqual(new Set(["seul"]));
  });

  it("s'arrête au plafond du tour", () => {
    const concepts = Array.from({ length: 10 }, (_, rang) => concept(`c${rang}`));

    expect(composerEntrainement(concepts)).toHaveLength(QUESTIONS_PAR_TOUR);
  });

  it("sert d'abord ce qui a le moins servi, tous modes confondus", () => {
    // Usages : 4, 3, 2, 0. Deux passages d'entraînement pèsent donc autant que
    // deux passages de session — c'est la lecture qui use, pas le mode.
    const seul = concept("seul", [
      { sessionCount: 4, lastSessionAt: new Date("2026-01-01") },
      { trainingCount: 3 },
      { sessionCount: 1, trainingCount: 1 },
      {},
    ]);

    expect(composerEntrainement([seul]).map((question) => question.variantId)).toEqual([
      "seul-APPLICATION",
      "seul-BOUNDARY",
      "seul-MECHANISM",
      "seul-RECOGNITION",
    ]);
  });

  it("renvoie en fin de file la question que la session vient de poser", () => {
    // Toutes ont servi autant ; c'est la fraîcheur de la trace qui départage, et
    // c'est ce qui fait qu'on pioche « dans les autres facettes » sans les nommer.
    const seul = concept("seul", [
      { sessionCount: 1, lastSessionAt: new Date("2026-03-10T09:00:00Z") },
      { sessionCount: 1, lastSessionAt: new Date("2026-01-02T09:00:00Z") },
      { sessionCount: 1, lastSessionAt: new Date("2026-01-03T09:00:00Z") },
      { sessionCount: 1, lastSessionAt: new Date("2026-01-04T09:00:00Z") },
    ]);

    expect(composerEntrainement([seul]).at(-1)?.variantId).toBe("seul-RECOGNITION");
  });

  it("tient compte du dernier passage d'entraînement, pas seulement de la session", () => {
    // Un seul format sur les quatre variantes : l'ordre ne dépend alors que de
    // l'usure, sans que l'alternance des gestes ait son mot à dire.
    const seul = concept("seul", [
      { trainingCount: 1, format: "EXPLAIN" },
      { trainingCount: 1, format: "EXPLAIN" },
      { trainingCount: 1, format: "EXPLAIN" },
      { trainingCount: 1, format: "EXPLAIN" },
    ]);
    const derniers = new Map([["seul-MECHANISM", new Date("2026-05-01T10:00:00Z")]]);

    expect(composerEntrainement([seul], derniers).at(-1)?.variantId).toBe("seul-MECHANISM");
  });

  it("rend le même tour pour la même entrée", () => {
    const concepts = [concept("un"), concept("deux"), concept("trois")];

    expect(composerEntrainement(concepts)).toEqual(composerEntrainement(concepts));
  });

  it("ne modifie pas les concepts qu'on lui donne", () => {
    const concepts = [concept("un"), concept("deux")];
    const avant = JSON.stringify(concepts);

    composerEntrainement(concepts);

    expect(JSON.stringify(concepts)).toBe(avant);
  });
});

describe("propriétés", () => {
  const conceptArbitraire = fc.record({
    variants: fc.array(
      fc.record({
        facet: fc.constantFrom(...FACETTES),
        format: fc.constantFrom(...FORMATS),
        sessionCount: fc.nat({ max: 9 }),
        trainingCount: fc.nat({ max: 9 }),
      }),
      { minLength: 0, maxLength: 5 },
    ),
  });

  const corpus = fc.array(conceptArbitraire, { minLength: 1, maxLength: 6 }).map((concepts) =>
    concepts.map((entree, rang) => ({
      id: `c${rang}`,
      variants: entree.variants.map((variante, position) => ({
        id: `c${rang}-v${position}`,
        facet: variante.facet,
        format: variante.format,
        sessionCount: variante.sessionCount,
        trainingCount: variante.trainingCount,
        lastSessionAt: null,
      })),
    })),
  );

  it("ne sert jamais deux fois la même question dans un tour", () => {
    fc.assert(
      fc.property(corpus, (concepts) => {
        const tirees = composerEntrainement(concepts);

        return new Set(tirees.map((question) => question.variantId)).size === tirees.length;
      }),
      { numRuns: 300 },
    );
  });

  it("ne tire que des questions qui existent, et jamais plus que le plafond", () => {
    fc.assert(
      fc.property(corpus, (concepts) => {
        const connues = new Set(
          concepts.flatMap((concept) => concept.variants.map((variante) => variante.id)),
        );
        const tirees = composerEntrainement(concepts);

        return (
          tirees.length <= QUESTIONS_PAR_TOUR &&
          tirees.every((question) => connues.has(question.variantId))
        );
      }),
      { numRuns: 300 },
    );
  });

  it("ne répète un concept d'affilée que lorsqu'il ne reste que lui", () => {
    fc.assert(
      fc.property(corpus, (concepts) => {
        const tirees = composerEntrainement(concepts);
        const servables = concepts.filter((concept) => concept.variants.length > 0);

        if (servables.length < 2) return true;

        // Deux concepts servables ou plus : la file d'un concept peut s'épuiser
        // avant celle d'un autre, donc la répétition ne redevient possible qu'à
        // la fin. On vérifie donc l'absence de répétition tant que deux concepts
        // distincts restent à venir.
        return tirees.every((question, rang) => {
          if (rang === 0 || question.atomId !== tirees[rang - 1]?.atomId) return true;

          const restants = new Set(tirees.slice(rang).map((suite) => suite.atomId));

          return restants.size === 1;
        });
      }),
      { numRuns: 300 },
    );
  });
});

describe("alternance des gestes", () => {
  /** Le geste servi par chaque question du tour, dans l'ordre. */
  function gestes(concepts: ConceptEntrainable[], taille?: number): string[] {
    return composerEntrainement(concepts, new Map(), taille).map((question) =>
      gesteDeReponse(formatDe(concepts, question.variantId)),
    );
  }

  it("alterne un geste sur l'autre quand le corpus le permet", () => {
    const deuxFormats = (id: string): ConceptEntrainable => ({
      id,
      variants: [
        variante(`${id}-choix`, "RECOGNITION", "MCQ"),
        variante(`${id}-trou`, "MECHANISM", "CLOZE"),
      ],
    });

    const suite = gestes(["un", "deux", "trois", "quatre"].map(deuxFormats));

    expect(suite).toHaveLength(8);
    expect(suite.every((geste, rang) => rang === 0 || geste !== suite[rang - 1])).toBe(true);
  });

  it("passe une question du même concept devant pour changer de geste", () => {
    // Deux QCM et un texte à trou : le trou vient en deuxième, alors que l'ordre
    // d'usure le mettait en dernier.
    const concepts = [
      {
        id: "seul",
        variants: [
          variante("seul-a", "RECOGNITION", "MCQ"),
          variante("seul-b", "BOUNDARY", "TRUE_FALSE"),
          variante("seul-c", "MECHANISM", "CLOZE"),
        ],
      },
    ];

    expect(composerEntrainement(concepts).map((question) => question.variantId)).toEqual([
      "seul-a",
      "seul-c",
      "seul-b",
    ]);
  });

  it("ne sert jamais trois fois le même geste d'affilée sur un corpus ordinaire", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), (nombre) => {
        const concepts = Array.from({ length: nombre }, (_, rang) => concept(`c${rang}`));
        const suite = gestes(concepts);

        return suite.every(
          (geste, rang) => rang < 2 || geste !== suite[rang - 1] || geste !== suite[rang - 2],
        );
      }),
      { numRuns: 50 },
    );
  });

  it("réordonne sans rien perdre : le tour garde son compte et ses questions", () => {
    const concepts = [concept("un"), concept("deux")];
    const tirees = composerEntrainement(concepts);

    expect(tirees).toHaveLength(8);
    expect(new Set(tirees.map((question) => question.variantId)).size).toBe(8);
  });
});
