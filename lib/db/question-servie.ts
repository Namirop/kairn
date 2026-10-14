import { z } from "zod";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { trouSansRedite } from "@/lib/domain/bord-du-trou";
import { choixDUnVraiOuFaux } from "@/lib/domain/choix-proposes";
import { joursEntre, localDay } from "@/lib/domain/local-day";
import { optionsDistinguables } from "@/lib/domain/options-de-qcm";
import { TROU } from "@/lib/domain/reponse-cloze";
import { tagsSansReponse } from "@/lib/domain/tags-sans-reponse";
import { phraseSansDevoilement } from "@/lib/domain/trou-devoile";

/**
 * Une question telle qu'un écran la reçoit, quel que soit le mode. Session,
 * entraînement et vitrine de l'essai lisent le `payload` ici et nulle part
 * ailleurs : deux lectures finiraient par diverger.
 */

/** Les options d'un QCM, telles que la génération les a écrites. */
const PAYLOAD_CHOIX = z.object({
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

/** Ce qu'un vrai ou faux pose à côté de sa question, quand il pose quelque chose. */
const PAYLOAD_VRAI_FAUX = z.object({ expected: z.boolean() });

/** La phrase trouée, les formes acceptées, et les leurres du coup de pouce. */
const PAYLOAD_CLOZE = z.object({
  sentence: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
  // Une question peut ne pas en porter : le tableau vide est une valeur
  // normale, et l'écran n'offre alors aucune aide.
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
  /**
   * Depuis combien de jours civils ce concept n'avait pas été reposé. Nul à la
   * première fois, et nul en entraînement, qui ne touche pas au cycle.
   */
  vuIlYaJours: number | null;
};

/**
 * L'écart entre le dernier passage et maintenant, en jours civils de
 * l'utilisateur : dix heures qui traversent minuit font un jour, comme pour la
 * planification.
 */
function ecartDepuis(
  lastReview: Date | null | undefined,
  repere: { maintenant: Date; fuseau: string } | undefined,
): number | null {
  if (!lastReview || !repere) return null;

  const jours = joursEntre(
    localDay(lastReview, repere.fuseau),
    localDay(repere.maintenant, repere.fuseau),
  );

  return jours >= 0 ? jours : null;
}

/**
 * Les choix à proposer, ou `null` si la question doit repartir en format ouvert.
 *
 * Un vrai ou faux ne porte pas d'options en base : le domaine les reconstruit,
 * sans quoi il tomberait en format ouvert et l'utilisateur devrait se juger sur
 * une réponse pourtant connue.
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
  // Un index hors des options viendrait d'une génération abîmée : mieux vaut
  // servir la question sans ses choix que proposer une bonne réponse fausse.
  if (lu.data.correctIndex >= lu.data.options.length) return null;
  // Des propositions identiques (abrégées en « ... », par exemple) ne se
  // choisissent pas. Voir `optionsDistinguables`.
  if (!optionsDistinguables(lu.data.options)) return null;

  return lu.data;
}

/**
 * Les seules options d'un QCM, pour la vitrine de l'essai : `correctIndex` ne
 * descend pas au client.
 */
export function optionsDUnQCM(format: VariantFormat, payload: unknown): string[] | null {
  if (format !== "MCQ") return null;

  const lu = PAYLOAD_CHOIX.safeParse(payload);

  return lu.success ? lu.data.options : null;
}

/**
 * Le texte à trou, ou `null` si le format n'en est pas un — ou si sa phrase est
 * illisible, auquel cas la question repart en format ouvert plutôt que de poser
 * un champ de saisie que rien ne pourra vérifier.
 *
 * Deux réparations à la lecture, pour rattraper aussi les questions déjà
 * écrites, dans cet ordre : `trouSansRedite` rogne le terme qui redit un mot
 * posé contre le trou, puis `phraseSansDevoilement` masque ce qui en reste
 * partout où la phrase le réécrit en clair.
 */
export function texteATrouServi(format: VariantFormat, payload: unknown): QuestionServie["cloze"] {
  if (format !== "CLOZE") return null;

  const lu = PAYLOAD_CLOZE.safeParse(payload);

  if (!lu.success) return null;
  // Une phrase sans trou n'est pas un texte à trou : l'écran poserait un champ
  // de saisie sous une phrase entière, et rien n'y manquerait.
  if (!lu.data.sentence.includes(TROU)) return null;

  const rogne = trouSansRedite(lu.data);

  return { ...rogne, sentence: phraseSansDevoilement(rogne.sentence, rogne.accepted[0] ?? "") };
}

export function questionServie(
  concept: { id: string; concept: string; tags: string[]; lastReview?: Date | null },
  variante: VarianteEnBase,
  /** L'instant et le fuseau, quand l'écran dit depuis quand le concept dormait. */
  repere?: { maintenant: Date; fuseau: string },
): QuestionServie {
  const choix = lireChoix(variante.format, variante.payload, variante.answerKey);
  const trou = texteATrouServi(variante.format, variante.payload);

  return {
    atomId: concept.id,
    concept: concept.concept,
    // Les étiquettes qui donnent la réponse sont cachées ici, seul endroit qui
    // sait à la fois ce qu'on affiche et ce qu'on attend. Le concept garde les
    // siennes pour le classement et l'alternance des sujets.
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
