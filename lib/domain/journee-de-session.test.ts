import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  composerLaJournee,
  conceptsProposables,
  type ConceptCandidat,
  type VarianteDeSession,
} from "./journee-de-session";

const PARIS = "Europe/Paris";
const KATMANDOU = "Asia/Kathmandu";
const MAINTENANT = new Date("2026-03-10T12:00:00Z");

type Candidat = ConceptCandidat & { derniere: string | null };

function variante(
  id: string,
  format: string,
  facet: string,
  question = "Une question ?",
  answerKey = "Une réponse",
): VarianteDeSession {
  return {
    id,
    format,
    facet,
    question,
    answerKey,
    sessionCount: 0,
    trainingCount: 0,
    lastSessionAt: null,
  };
}

function candidat(
  id: string,
  due: string,
  variants: VarianteDeSession[],
  options: { tags?: string[]; derniere?: string | null; lastReview?: string } = {},
): Candidat {
  return {
    id,
    due: new Date(due),
    tags: options.tags ?? [],
    inputId: "depot",
    lastReview: options.lastReview ? new Date(options.lastReview) : null,
    scheduledDays: 0,
    variants,
    derniere: options.derniere ?? null,
  };
}

const derniereDe = (concept: Candidat) => concept.derniere;

function quatreFormats(prefixe: string): VarianteDeSession[] {
  return [
    variante(`${prefixe}-1`, "MCQ", "DEFINITION"),
    variante(`${prefixe}-2`, "CLOZE", "APPLICATION"),
    variante(`${prefixe}-3`, "SHORT_ANSWER", "CONTRAST"),
    variante(`${prefixe}-4`, "TRUE_FALSE", "CAUSE"),
  ];
}

describe("conceptsProposables", () => {
  it("écarte un concept dont aucune formulation ne porte de texte", () => {
    const vide = candidat("a", "2026-03-09T00:00:00Z", [
      variante("a-1", "MCQ", "DEFINITION", "   "),
      variante("a-2", "CLOZE", "APPLICATION", "Question ?", "..."),
    ]);
    const plein = candidat("b", "2026-03-09T00:00:00Z", quatreFormats("b"));

    expect(conceptsProposables([vide, plein], derniereDe).map((c) => c.id)).toEqual(["b"]);
  });

  it("ne propose pas la facette servie au dernier passage", () => {
    const concept = candidat("a", "2026-03-09T00:00:00Z", quatreFormats("a"), {
      derniere: "DEFINITION",
    });

    const [proposable] = conceptsProposables([concept], derniereDe);

    expect(proposable?.equivalentes.map((v) => v.facet)).not.toContain("DEFINITION");
  });
});

describe("composerLaJournee", () => {
  it("sert une formulation par concept dû, et seulement les concepts dus", () => {
    const candidats = [
      candidat("a", "2026-03-09T00:00:00Z", quatreFormats("a")),
      candidat("b", "2026-03-10T08:00:00Z", quatreFormats("b")),
      // Dû demain : ramené par la marge SQL, il ne doit pas être servi.
      candidat("c", "2026-03-11T08:00:00Z", quatreFormats("c")),
    ];

    const { servis, dus } = composerLaJournee(candidats, derniereDe, MAINTENANT, PARIS, 20);

    expect(servis.map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(dus).toBe(2);
    for (const concept of servis) {
      expect(concept.variants.map((v) => v.id)).toContain(concept.variante.id);
    }
  });

  it("compte comme dû ce que le plafond reporte", () => {
    const candidats = ["a", "b", "c"].map((id) =>
      candidat(id, "2026-03-09T00:00:00Z", quatreFormats(id)),
    );

    const { servis, dus } = composerLaJournee(candidats, derniereDe, MAINTENANT, PARIS, 2);

    expect(servis).toHaveLength(2);
    expect(dus).toBe(3);
  });

  it("ne sert rien quand le plafond restant est nul", () => {
    const candidats = [candidat("a", "2026-03-09T00:00:00Z", quatreFormats("a"))];

    const { servis, dus } = composerLaJournee(candidats, derniereDe, MAINTENANT, PARIS, 0);

    expect(servis).toEqual([]);
    expect(dus).toBe(1);
  });

  it("ne compte pas comme dû un concept sans formulation posable", () => {
    const candidats = [
      candidat("a", "2026-03-09T00:00:00Z", [variante("a-1", "MCQ", "DEFINITION", "")]),
    ];

    expect(composerLaJournee(candidats, derniereDe, MAINTENANT, PARIS, 20)).toEqual({
      servis: [],
      dus: 0,
    });
  });

  it("tranche le jour civil dans le fuseau de l'utilisateur, décalage non entier compris", () => {
    // 18 h 20 UTC le 10 mars : minuit cinq le 11 mars à Katmandou (UTC+5:45).
    const minuitCinq = new Date("2026-03-10T18:20:00Z");
    // Échéance à 23 h 30 UTC : le 11 à Katmandou, déjà demain à Paris.
    const candidats = [candidat("a", "2026-03-10T23:30:00Z", quatreFormats("a"))];

    expect(composerLaJournee(candidats, derniereDe, minuitCinq, KATMANDOU, 20).dus).toBe(1);
    expect(composerLaJournee(candidats, derniereDe, minuitCinq, PARIS, 20).dus).toBe(0);
  });

  it("ne resert pas un concept déjà revu aujourd'hui", () => {
    const candidats = [
      candidat("a", "2026-03-10T12:05:00Z", quatreFormats("a"), {
        lastReview: "2026-03-10T11:00:00Z",
      }),
    ];

    expect(composerLaJournee(candidats, derniereDe, MAINTENANT, PARIS, 20).servis).toEqual([]);
  });

  it("varie les formats quand les concepts en offrent plusieurs", () => {
    const candidats = ["a", "b", "c", "d"].map((id) =>
      candidat(id, "2026-03-09T00:00:00Z", quatreFormats(id)),
    );

    const { servis } = composerLaJournee(candidats, derniereDe, MAINTENANT, PARIS, 20);

    expect(new Set(servis.map((c) => c.variante.format)).size).toBe(4);
  });

  it("se recompose à l'identique quel que soit l'ordre des candidats", () => {
    const candidats = ["a", "b", "c", "d", "e"].map((id, rang) =>
      candidat(id, "2026-03-09T00:00:00Z", quatreFormats(id), {
        tags: [rang % 2 === 0 ? "postgres" : "react"],
      }),
    );
    const reference = composerLaJournee(candidats, derniereDe, MAINTENANT, PARIS, 20);
    const signature = (journee: typeof reference) =>
      journee.servis.map((c) => `${c.id}:${c.variante.id}`);

    fc.assert(
      fc.property(fc.shuffledSubarray(candidats, { minLength: 5, maxLength: 5 }), (melange) => {
        const journee = composerLaJournee(melange, derniereDe, MAINTENANT, PARIS, 20);

        expect(signature(journee)).toEqual(signature(reference));
      }),
    );
  });
});
