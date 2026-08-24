import { CONCEPTS_PAR_APPEL } from "@/lib/ai/schemas";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import type { CorpusFige, DepotFige, VariantFige } from "../fige";
import type { Vecteur } from "../mesures/espace";
import { plonger } from "../mesures/embeddings";
import { BUDGET_SORTIE_CAMPAGNE } from "../openrouter/campagne";
import { genererVia } from "../openrouter/generation";
import { jugerLaFideliteVia, type Facture } from "../openrouter/juges";
import { JUGE_PRINCIPAL, type ModeleOpenRouter } from "../openrouter/modeles";
import { mesurerLeDepotQuestions, type MesuresDuDepot } from "./mesures-questions";
import { servirVariants, type VariantServi } from "./questions-servies";

/**
 * L'émission d'une colonne de la campagne 2 : génération de questions par un
 * finaliste sur les concepts figés du 11h58, puis mesures internes (radotage,
 * formats, cible) et juge de fidélité Haiku via OpenRouter.
 *
 * Le garde-fou 2× s'applique séparément à la génération et à la fidélité —
 * une colonne peut être coupée pendant l'une ou l'autre. Aucune reprise
 * automatique (règle campagne, arrêt du 2026-08-21).
 *
 * Haiku ne supporte pas `reasoning` chez son fournisseur OpenRouter — voir
 * `valider-le-juge.ts`, même règle ici.
 */

const REASONING_HAIKU = false as const;

export type ScoreDepotQuestions = {
  nom: string;
  conceptsQuestionnables: number;
  variantsRendus: number;
  groupesEchoues: number;
  mesures: MesuresDuDepot | null;
  fideliteKO: number;
  fideliteAbstenues: number;
  fideliteTotal: number;
};

export type Statut =
  | { code: "complete" }
  | { code: "arret-2x-generation"; nom: string; coutReel: number; coutEstime: number }
  | { code: "arret-2x-fidelite"; nom: string; coutReel: number; coutEstime: number };

export type ScoreDeColonneQuestions = {
  finaliste: ModeleOpenRouter;
  depots: ScoreDepotQuestions[];
  factureGeneration: { in: number; out: number; usd: number; appels: number };
  factureFidelite: { in: number; out: number; usd: number; appels: number };
  statut: Statut;
};

function ajouter(a: Facture, b: { in: number; out: number; usd: number; appels: number }): void {
  b.in += a.inputTokens;
  b.out += a.outputTokens;
  b.usd += a.coutUsd;
  b.appels += 1;
}

function motifCourt(erreur: unknown): string {
  const cause = erreur instanceof Error && erreur.cause instanceof Error ? erreur.cause : null;
  return erreur instanceof Error
    ? cause ? `${erreur.message} — cause : ${cause.message}` : erreur.message
    : String(erreur);
}

function grouper<T>(items: T[]): T[][] {
  const groupes: T[][] = [];
  for (let i = 0; i < items.length; i += CONCEPTS_PAR_APPEL) {
    groupes.push(items.slice(i, i + CONCEPTS_PAR_APPEL));
  }
  return groupes;
}

/**
 * Fait tourner une colonne : génération dépôt par dépôt (groupes de 3 concepts
 * questionnables), puis mesures géo, puis juge fidélité Haiku. Retourne un
 * score utile pour le rapport aveuglé.
 */
export async function passerParColonneQuestions(
  finaliste: ModeleOpenRouter,
  fige: CorpusFige,
  coutGenerationEstime: number,
  coutFideliteEstime: number,
  loguer: (message: string) => void,
): Promise<ScoreDeColonneQuestions> {
  const factureGeneration = { in: 0, out: 0, usd: 0, appels: 0 };
  const factureFidelite = { in: 0, out: 0, usd: 0, appels: 0 };
  const variantsParDepot = new Map<string, VariantServi[][]>();
  const echecsParDepot = new Map<string, number>();

  // 1. Génération par dépôt.
  for (let rangDepot = 0; rangDepot < fige.depots.length; rangDepot++) {
    const depot = fige.depots[rangDepot]!;
    const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
    if (questionnables.length === 0) {
      variantsParDepot.set(depot.nom, []);
      echecsParDepot.set(depot.nom, 0);
      continue;
    }

    const parConcept = new Map<string, VariantServi[]>();
    let echecs = 0;
    for (const groupe of grouper(questionnables)) {
      const envoi = groupe.map((c) => ({ graine: c.concept, concept: c.concept }));
      try {
        const { sortie, facture } = await genererVia(finaliste, envoi, BUDGET_SORTIE_CAMPAGNE);
        ajouter(facture, factureGeneration);
        for (const lot of sortie.lots) {
          const rang = lot.rang - 1;
          const concept = groupe[rang];
          if (!concept) continue;
          parConcept.set(concept.concept, servirVariants(concept.concept, lot.variants));
        }
        // Rangs manquants dans la sortie (le modèle a oublié un concept du groupe) : comptés en échec.
        const rangsRendus = new Set(sortie.lots.map((l) => l.rang - 1));
        for (let i = 0; i < groupe.length; i++) if (!rangsRendus.has(i)) echecs += 1;
      } catch (erreur) {
        echecs += groupe.length;
        loguer(`  ✗ ${depot.nom} · groupe de ${groupe.length} — ${motifCourt(erreur).slice(0, 200)}`);
      }
    }

    // Aligner sur l'ordre des concepts questionnables (concepts sans variants = tableau vide).
    const parConceptOrdonne: VariantServi[][] = questionnables.map((c) => parConcept.get(c.concept) ?? []);
    variantsParDepot.set(depot.nom, parConceptOrdonne);
    echecsParDepot.set(depot.nom, echecs);
    loguer(
      `  ✓ ${depot.nom} — ${parConceptOrdonne.filter((v) => v.length > 0).length}/${questionnables.length} concepts questionnés, ${echecs} échec(s), cumul ${factureGeneration.usd.toFixed(4)} $`,
    );

    const dernier = rangDepot === fige.depots.length - 1;
    if (!dernier && factureGeneration.usd > 2 * coutGenerationEstime) {
      const info = {
        code: "arret-2x-generation" as const,
        nom: depot.nom,
        coutReel: factureGeneration.usd,
        coutEstime: coutGenerationEstime,
      };
      loguer(
        `  ⨯ garde-fou dérive 2× génération après ${depot.nom} — ${info.coutReel.toFixed(4)} $ contre ${info.coutEstime.toFixed(4)} $ estimés.`,
      );
      return { finaliste, depots: [], factureGeneration, factureFidelite, statut: info };
    }
  }

  // 2. Plongée de toutes les questions de la colonne (cache utilisé).
  const textesQuestions = [...variantsParDepot.values()].flatMap((depot) =>
    depot.flatMap((variants) =>
      variants.map((v) => (v.format === "CLOZE" && v.cloze ? v.cloze.sentence : v.question)),
    ),
  );
  loguer(`  · plongée : ${textesQuestions.length} questions à faire vecteurs (doublons compris).`);
  const passe = await plonger(textesQuestions);
  loguer(`  · vecteurs : ${passe.calcules} calculés, ${passe.enCache} au cache.`);

  // 3. Mesures géo + 4. juge fidélité Haiku, dépôt par dépôt.
  const scores: ScoreDepotQuestions[] = [];
  let statutFinal: Statut = { code: "complete" };
  for (let rangDepot = 0; rangDepot < fige.depots.length; rangDepot++) {
    const depot = fige.depots[rangDepot]!;
    const variantsParConcept = variantsParDepot.get(depot.nom) ?? [];
    const mesures = variantsParConcept.length === 0
      ? null
      : mesurerLeDepotQuestions(depot.nom, variantsParConcept, passe.vecteur);

    let fideliteKO = 0;
    let fideliteAbstenues = 0;
    let fideliteTotal = 0;
    const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
    for (let rangConcept = 0; rangConcept < questionnables.length; rangConcept++) {
      const concept = questionnables[rangConcept]!;
      const variants = variantsParConcept[rangConcept] ?? [];
      if (variants.length === 0) continue;
      const variantsFige: VariantFige[] = variants.map((v) => ({
        facet: v.facet,
        format: v.format,
        question: v.question,
        answerKey: v.answerKey,
        options: v.options,
        correctIndex: v.correctIndex,
        cloze: v.cloze,
      }));
      try {
        const { verdicts, facture } = await jugerLaFideliteVia(
          JUGE_PRINCIPAL,
          concept.concept,
          variantsFige,
          undefined,
          REASONING_HAIKU,
        );
        ajouter(facture, factureFidelite);
        for (const v of verdicts) {
          fideliteTotal += 1;
          if (v.juste === null) fideliteAbstenues += 1;
          else if (v.juste === false) fideliteKO += 1;
        }
      } catch (erreur) {
        loguer(`  ✗ fidélité ${depot.nom} concept ${rangConcept + 1} — ${motifCourt(erreur).slice(0, 200)}`);
      }
    }

    scores.push({
      nom: depot.nom,
      conceptsQuestionnables: questionnables.length,
      variantsRendus: variantsParConcept.reduce((s, v) => s + v.length, 0),
      groupesEchoues: echecsParDepot.get(depot.nom) ?? 0,
      mesures,
      fideliteKO,
      fideliteAbstenues,
      fideliteTotal,
    });

    const dernier = rangDepot === fige.depots.length - 1;
    if (!dernier && factureFidelite.usd > 2 * coutFideliteEstime) {
      statutFinal = {
        code: "arret-2x-fidelite",
        nom: depot.nom,
        coutReel: factureFidelite.usd,
        coutEstime: coutFideliteEstime,
      };
      loguer(
        `  ⨯ garde-fou dérive 2× fidélité après ${depot.nom} — ${statutFinal.coutReel.toFixed(4)} $ contre ${statutFinal.coutEstime.toFixed(4)} $ estimés.`,
      );
      break;
    }
  }

  return { finaliste, depots: scores, factureGeneration, factureFidelite, statut: statutFinal };
}

/**
 * La référence Sonnet : mesures géo recalculées sur les variants du figé, et
 * fidélité lue depuis le cache verdicts existants (déjà rendue au passage
 * `11h58`, on ne rejoue pas).
 */
export function scoreReferenceSonnet(
  depot: DepotFige,
  cacheFidelite: Record<string, { juste: boolean | null }[]> | undefined,
  vecteur: (texte: string) => Vecteur | null,
): ScoreDepotQuestions {
  const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
  const variantsParConcept: VariantServi[][] = questionnables.map((c) => {
    const bruts = c.variants ?? [];
    return bruts.map((v): VariantServi => ({
      facet: v.facet,
      format: v.format,
      question: v.question,
      answerKey: v.answerKey,
      options: v.options,
      correctIndex: v.correctIndex,
      cloze: v.cloze ?? null,
      cible: null,
      estVraie: null,
    }));
  });

  let fideliteKO = 0;
  let fideliteAbstenues = 0;
  let fideliteTotal = 0;
  for (const concept of questionnables) {
    const verdicts = cacheFidelite?.[concept.concept] ?? [];
    for (const v of verdicts) {
      fideliteTotal += 1;
      if (v.juste === null) fideliteAbstenues += 1;
      else if (v.juste === false) fideliteKO += 1;
    }
  }

  const vecteurNonNul = (texte: string) => {
    const v = vecteur(texte);
    if (v === null) throw new Error(`Vecteur manquant pour: ${texte.slice(0, 60)}`);
    return v;
  };
  const mesures = variantsParConcept.length === 0 || variantsParConcept.every((v) => v.length === 0)
    ? null
    : mesurerLeDepotQuestions(depot.nom, variantsParConcept, vecteurNonNul);

  return {
    nom: depot.nom,
    conceptsQuestionnables: questionnables.length,
    variantsRendus: variantsParConcept.reduce((s, v) => s + v.length, 0),
    groupesEchoues: 0,
    mesures,
    fideliteKO,
    fideliteAbstenues,
    fideliteTotal,
  };
}
