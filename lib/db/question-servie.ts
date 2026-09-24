import { z } from "zod";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { trouSansRedite } from "@/lib/domain/bord-du-trou";
import { choixDUnVraiOuFaux } from "@/lib/domain/choix-proposes";
import { joursEntre, localDay } from "@/lib/domain/local-day";
import { tagsSansReponse } from "@/lib/domain/tags-sans-reponse";
import { phraseSansDevoilement } from "@/lib/domain/trou-devoile";

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

/** La phrase trouée, les formes acceptées, et les leurres du coup de pouce. */
const PAYLOAD_CLOZE = z.object({
  sentence: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
  // Les questions écrites avant que l'aide existe n'en portent pas : le tableau
  // vide est une valeur normale, et l'écran n'offre alors rien.
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
   * Depuis combien de jours civils ce concept n'avait pas été reposé.
   *
   * Nul quand on le pose pour la première fois, et nul en entraînement : là, le
   * planning ne bouge pas, et rappeler l'écart d'un cycle auquel on ne touche
   * pas dirait l'inverse de ce que fait l'écran.
   */
  vuIlYaJours: number | null;
};

/**
 * L'écart entre le dernier passage et maintenant, dans le calendrier de
 * l'utilisateur.
 *
 * Un écart de dix heures qui traverse minuit fait bien un jour : c'est ce que la
 * personne a vécu, et c'est ce que la planification a compté.
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
 * Les seules options d'un QCM, sans dire laquelle est la bonne.
 *
 * La vitrine de l'essai montre la question telle qu'elle sera posée, et un QCM
 * sans ses propositions n'est pas un QCM — on lit une question ouverte sous une
 * étiquette qui annonce autre chose. Elle n'a en revanche aucune raison de
 * connaître la réponse : `correctIndex` reste ici et ne descend pas au client.
 *
 * Le schéma est celui d'à côté, et c'est tout l'intérêt de le lire ici : une
 * seconde lecture du `payload` ailleurs finirait par diverger de celle-ci.
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
 * Deux réparations à la lecture, dans cet ordre — c'est le seul endroit qui
 * rattrape aussi les questions déjà écrites : le terme est rendu à sa juste
 * longueur quand il redit un mot posé contre le trou (`trouSansRedite`), puis
 * ce qu'il en reste est masqué partout où la phrase le réécrit en clair, sans
 * quoi il n'y a plus qu'à recopier (`phraseSansDevoilement`).
 *
 * **Exporté parce que la vitrine de l'essai lit les mêmes questions**, et qu'une
 * seconde lecture du même `payload` finirait par diverger de celle-ci.
 */
export function texteATrouServi(format: VariantFormat, payload: unknown): QuestionServie["cloze"] {
  if (format !== "CLOZE") return null;

  const lu = PAYLOAD_CLOZE.safeParse(payload);

  if (!lu.success) return null;

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
    /*
      Les étiquettes qui donnent la réponse ne sont pas montrées.

      `TENNIS · EFFET-MAGNUS` au-dessus d'un QCM dont la bonne option était
      « Effet Magnus » : la réponse était écrite en petites capitales trois
      centimètres plus haut. Le filtrage se fait ici, au dernier moment, parce
      que c'est ici qu'on sait à la fois ce qu'on affiche et ce qu'on attend —
      et le concept, lui, garde ses étiquettes pour le classement et pour
      l'alternance des sujets. Voir `tags-sans-reponse.ts`.
    */
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
