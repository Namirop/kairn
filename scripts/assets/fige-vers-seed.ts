import type { AtomState, ReviewRating } from "@/lib/db/types";
import { compterReussitesConsecutives, etatApresRevision } from "@/lib/domain/etat-maitrise";
import type { SeedAtom, SeedInput, SeedReview, SeedVariant } from "@/prisma/seed/corpus-types";
import { replay } from "@/prisma/seed/replay";
import type { DepotDAssets, VariantDAssets } from "@/scripts/assets/fige";

/**
 * Transforme le figé d'assets en corpus de seed, avec un historique de révisions
 * simulé — sur le seul compte de démonstration, comme la consigne l'autorise.
 *
 * Rien n'est inventé au doigt : chaque historique est rejoué par ts-fsrs, et
 * l'état de l'Atom est **dérivé** de l'intervalle rendu et des réussites
 * d'affilée, par la vraie fonction du domaine `etatApresRevision`. Un concept
 * n'est donc consolidé que s'il l'aurait vraiment été.
 *
 * L'âge du dépôt corrèle avec l'état : les vieux dépôts portent des concepts
 * consolidés, les récents des concepts en apprentissage encore dus. Les jours de
 * révision récents sont couverts jour après jour, ce qui donne une série
 * honnête plutôt qu'un trou.
 */

type Famille = "CONSOLIDE" | "REVISION" | "APPRENTISSAGE";
type ProfilSujet = { famille: Famille; anchor: number; recents: number[]; archiver?: number };

/** Un profil par sujet : plus le dépôt est vieux, plus ses concepts sont mûrs. */
const PROFILS: Record<string, ProfilSujet> = {
  "vocabulaire-anglais": { famille: "CONSOLIDE", anchor: 62, recents: [8, 10, 12, 9, 11, 13] },
  "repliques-series": { famille: "CONSOLIDE", anchor: 52, recents: [7, 9, 11, 8, 10, 12] },
  "cours-histoire": {
    famille: "CONSOLIDE",
    anchor: 44,
    recents: [8, 9, 10, 11, 12, 13, 14, 15, 6, 5],
    archiver: 2,
  },
  "article-presse": { famille: "REVISION", anchor: 30, recents: [2, 4, 6, 3, 5, 7, 1, 8] },
  "notes-lecture": { famille: "REVISION", anchor: 18, recents: [0, 1, 2, 3, 4] },
  "reponse-assistant": { famille: "APPRENTISSAGE", anchor: 9, recents: [1, 2, 3, 4, 5, 6, 0] },
  "capture-assistant": { famille: "APPRENTISSAGE", anchor: 4, recents: [1, 2, 3, 0] },
};

const DEFAUT: ProfilSujet = { famille: "REVISION", anchor: 20, recents: [1, 2, 3, 4] };

function jour(daysAgo: number, note: ReviewRating): SeedReview {
  return [Math.max(0, Math.round(daysAgo)), note];
}

/** Un historique plausible pour la famille, ancré sur le dépôt et un jour récent. */
function historique(famille: Famille, anchor: number, recent: number): SeedReview[] {
  if (famille === "CONSOLIDE") {
    return [
      jour(anchor, "GOOD"),
      jour(anchor * 0.66, "GOOD"),
      jour(anchor * 0.33, "GOOD"),
      jour(recent, "EASY"),
    ];
  }

  if (famille === "REVISION") {
    // Deux réussites seulement : sous le seuil de consolidation, donc l'atome
    // reste en REVIEWING même quand l'intervalle dépasse trois semaines.
    return [jour(anchor, "GOOD"), jour(recent, "GOOD")];
  }

  return [jour(recent + 3, "AGAIN"), jour(recent + 1, "HARD"), jour(recent, "GOOD")];
}

/** La charge utile attendue par `question-servie.ts`, selon le format. */
function payloadDe(v: VariantDAssets): SeedVariant["payload"] {
  if (v.format === "MCQ" && v.options !== null && v.correctIndex !== null) {
    return { options: v.options, correctIndex: v.correctIndex };
  }

  if (v.format === "TRUE_FALSE" && v.estVraie !== null) return { expected: v.estVraie };

  if (v.format === "CLOZE" && v.cloze !== null) {
    return { sentence: v.cloze.sentence, accepted: v.cloze.accepted, leurres: v.cloze.leurres };
  }

  return undefined;
}

function versSeedVariant(v: VariantDAssets): SeedVariant {
  const base = { format: v.format, facet: v.facet, question: v.question, answerKey: v.answerKey };
  const payload = payloadDe(v);

  return payload ? { ...base, payload } : base;
}

/** L'état dérivé de l'historique rejoué — jamais posé à la main. */
function etatDe(history: SeedReview[], archive: boolean, now: Date): AtomState {
  if (archive) return "ARCHIVED";

  const factice: SeedAtom = { concept: "", tags: [], state: "LEARNING", history, variants: [] };
  const { card } = replay(factice, now);
  const reussites = compterReussitesConsecutives(history.map(([, note]) => note));

  return etatApresRevision(card.scheduledDays, reussites, false);
}

export function construireLeCorpus(depots: DepotDAssets[], now: Date): SeedInput[] {
  return depots.map((depot) => {
    const profil = PROFILS[depot.cle] ?? DEFAUT;
    const concepts = depot.concepts.filter((concept) => concept.variants.length > 0);
    let maxJour = 0;

    const atoms: SeedAtom[] = concepts.map((concept, index) => {
      const recent = profil.recents[index % profil.recents.length] ?? 0;
      const history = historique(profil.famille, profil.anchor, recent);
      const archive = profil.archiver !== undefined && index < profil.archiver;

      for (const [daysAgo] of history) maxJour = Math.max(maxJour, daysAgo);

      return {
        concept: concept.concept,
        tags: concept.tags,
        state: etatDe(history, archive, now),
        history,
        ...(archive ? { archivedDaysAgo: recent } : {}),
        variants: concept.variants.map(versSeedVariant),
      };
    });

    return {
      rawContent: depot.texte,
      sourceType: depot.estImage ? "IMAGE" : "TEXT",
      ...(depot.estImage ? { extractedText: depot.texte } : {}),
      createdDaysAgo: maxJour + 2,
      atoms,
    };
  });
}
