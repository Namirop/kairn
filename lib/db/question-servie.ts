import { z } from "zod";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { choixDUnVraiOuFaux } from "@/lib/domain/choix-proposes";

/**
 * Une question telle qu'un écran la reçoit, quel que soit le mode.
 *
 * La session du jour et l'entraînement libre servent les mêmes questions : ce
 * qui les distingue est ce qu'on écrit après la réponse, jamais ce qu'on
 * affiche. Deux lectures du `payload` finiraient par diverger — un format
 * ajouté d'un côté et pas de l'autre —, alors il n'y en a qu'une.
 */

/** Les options d'un QCM, telles que la génération les a écrites. */
const PAYLOAD_CHOIX = z.object({
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

/** Ce qu'un vrai ou faux pose à côté de sa question, quand il pose quelque chose. */
const PAYLOAD_VRAI_FAUX = z.object({ expected: z.boolean() });

/** La phrase trouée et les formes acceptées d'un texte à trou. */
const PAYLOAD_CLOZE = z.object({
  sentence: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
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
  cloze: { sentence: string; accepted: string[] } | null;
};

/**
 * Les choix à proposer, ou `null` si la question doit repartir en format ouvert.
 *
 * Un vrai ou faux ne porte pas d'options en base : ce sont toujours les deux
 * mêmes, et c'est le domaine qui les reconstruit. Sans ce passage, un vrai ou
 * faux tombait côté ouvert et demandait à l'utilisateur de se juger sur une
 * question dont la justesse est pourtant connue.
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

  return lu.data;
}

/**
 * Le texte à trou, ou `null` si le format n'en est pas un — ou si sa phrase est
 * illisible, auquel cas la question repart en format ouvert plutôt que de poser
 * un champ de saisie que rien ne pourra vérifier.
 */
function lireTrou(format: VariantFormat, payload: unknown): QuestionServie["cloze"] {
  if (format !== "CLOZE") return null;

  const lu = PAYLOAD_CLOZE.safeParse(payload);

  return lu.success ? lu.data : null;
}

export function questionServie(
  concept: { id: string; concept: string; tags: string[] },
  variante: VarianteEnBase,
): QuestionServie {
  const choix = lireChoix(variante.format, variante.payload, variante.answerKey);

  return {
    atomId: concept.id,
    concept: concept.concept,
    tags: concept.tags,
    variantId: variante.id,
    format: variante.format,
    facet: variante.facet,
    question: variante.question,
    answerKey: variante.answerKey,
    options: choix?.options ?? null,
    correctIndex: choix?.correctIndex ?? null,
    cloze: lireTrou(variante.format, variante.payload),
  };
}
