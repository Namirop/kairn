import { z } from "zod";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { trouSansRedite } from "@/lib/domain/bord-du-trou";
import { choixDUnVraiOuFaux } from "@/lib/domain/choix-proposes";
import { joursEntre, jourLocal } from "@/lib/domain/jour-local";
import { optionsDistinguables } from "@/lib/domain/options-de-qcm";
import { TROU } from "@/lib/domain/reponse-cloze";
import { tagsSansReponse } from "@/lib/domain/tags-sans-reponse";
import { phraseSansDevoilement } from "@/lib/domain/trou-devoile";

/**
 * Une question telle qu'un écran la reçoit. Session, entraînement et vitrine
 * lisent le `payload` ici seulement : deux lectures finiraient par diverger.
 */

const PAYLOAD_CHOIX = z.object({
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

/** Facultatif : un vrai ou faux peut ne rien porter. */
const PAYLOAD_VRAI_FAUX = z.object({ expected: z.boolean() });

const PAYLOAD_CLOZE = z.object({
  sentence: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
  // Les leurres du coup de pouce ; vide, l'écran n'offre aucune aide.
  leurres: z.array(z.string().min(1)).default([]),
});

export type VarianteEnBase = {
  id: string;
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  answerKey: string;
  payload: unknown;
};

export type QuestionServie = {
  atomId: string;
  concept: string;
  tags: string[];
  variantId: string;
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  /** L'étalon montré après coup sur un format ouvert. */
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
  cloze: { sentence: string; accepted: string[]; leurres: string[] } | null;
  /** En jours civils ; nul la première fois et en entraînement, hors du cycle. */
  vuIlYaJours: number | null;
};

/** En jours civils de l'utilisateur, comme la planification : minuit franchi fait un jour. */
function ecartDepuis(
  lastReview: Date | null | undefined,
  repere: { maintenant: Date; fuseau: string } | undefined,
): number | null {
  if (!lastReview || !repere) return null;

  const jours = joursEntre(
    jourLocal(lastReview, repere.fuseau),
    jourLocal(repere.maintenant, repere.fuseau),
  );

  return jours >= 0 ? jours : null;
}

/**
 * `null` : la question repart en format ouvert. Un vrai ou faux n'a pas
 * d'options en base ; le domaine les reconstruit, sinon l'utilisateur se
 * jugerait seul sur une réponse pourtant connue.
 */
function lireChoix(
  format: VariantFormat,
  payload: unknown,
  answerKey: string,
): { options: string[]; correctIndex: number } | null {
  if (format === "TRUE_FALSE") {
    const attendu = PAYLOAD_VRAI_FAUX.safeParse(payload);

    return choixDUnVraiOuFaux(attendu.success ? attendu.data.expected : null, answerKey);
  }

  if (format !== "MCQ") return null;

  const lu = PAYLOAD_CHOIX.safeParse(payload);

  if (!lu.success) return null;
  // Génération abîmée : mieux vaut aucun choix qu'une bonne réponse fausse.
  if (lu.data.correctIndex >= lu.data.options.length) return null;
  // Des propositions identiques (abrégées en « ... ») ne se choisissent pas.
  if (!optionsDistinguables(lu.data.options)) return null;

  return lu.data;
}

/** Pour la vitrine de l'essai : `correctIndex` ne descend pas au client. */
export function optionsDUnQCM(format: VariantFormat, payload: unknown): string[] | null {
  if (format !== "MCQ") return null;

  const lu = PAYLOAD_CHOIX.safeParse(payload);

  return lu.success ? lu.data.options : null;
}

/**
 * Phrase illisible : `null`, la question repart en format ouvert plutôt que
 * d'offrir une saisie invérifiable. Réparé à la lecture, pour couvrir les
 * questions déjà écrites, et dans cet ordre : rogner la redite, puis masquer.
 */
export function texteATrouServi(format: VariantFormat, payload: unknown): QuestionServie["cloze"] {
  if (format !== "CLOZE") return null;

  const lu = PAYLOAD_CLOZE.safeParse(payload);

  if (!lu.success) return null;
  // Sans trou, l'écran poserait une saisie sous une phrase à qui rien ne manque.
  if (!lu.data.sentence.includes(TROU)) return null;

  const rogne = trouSansRedite(lu.data);

  return { ...rogne, sentence: phraseSansDevoilement(rogne.sentence, rogne.accepted[0] ?? "") };
}

export function questionServie(
  concept: { id: string; concept: string; tags: string[]; lastReview?: Date | null },
  variante: VarianteEnBase,
  /** Quand l'écran dit depuis quand le concept dormait. */
  repere?: { maintenant: Date; fuseau: string },
): QuestionServie {
  const choix = lireChoix(variante.format, variante.payload, variante.answerKey);
  const trou = texteATrouServi(variante.format, variante.payload);

  return {
    atomId: concept.id,
    concept: concept.concept,
    // Filtré ici, seul endroit qui sait ce qu'on affiche et ce qu'on attend.
    // Le concept garde les siennes pour le classement et l'alternance.
    tags: tagsSansReponse(concept.tags, [
      variante.answerKey,
      choix ? choix.options[choix.correctIndex] : null,
      ...(trou?.accepted ?? []),
    ]),
    variantId: variante.id,
    format: variante.format,
    facet: variante.facet,
    question: variante.question,
    answerKey: variante.answerKey,
    options: choix?.options ?? null,
    correctIndex: choix?.correctIndex ?? null,
    cloze: trou,
    vuIlYaJours: ecartDepuis(concept.lastReview, repere),
  };
}
