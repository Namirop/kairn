import { readAiConfig } from "@/lib/ai/config";
import { PROMPT_VERSIONS } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/client";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { ordonnerLesOptions } from "@/lib/domain/ordre-des-options";

/**
 * Écriture des questions d'un concept.
 *
 * Les données propres au format vivent dans `payload` : les options d'un QCM et
 * l'index de la bonne, la phrase trouée et les formes acceptées d'un texte à
 * trou. Aucun champ d'échéance ni de difficulté n'apparaît ici — la
 * planification porte sur l'Atom, jamais sur la formulation.
 */

export type QuestionAEcrire = {
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
  cloze: { sentence: string; accepted: string[] } | null;
};

/**
 * Ce que le format ajoute à la question, ou rien s'il n'ajoute rien.
 *
 * Les options d'un QCM sont remises en ordre avant d'être écrites : le modèle
 * place la bonne réponse en première position neuf fois sur dix, et ce qui est
 * stocké ici est ce qui sera montré. La raison complète est dans
 * `lib/domain/ordre-des-options.ts`.
 *
 * La graine est le concept et la facette plutôt que l'id du Variant, qui
 * n'existe pas encore — `createMany` les fait naître en base. Elle en a les deux
 * propriétés utiles : une facette n'apparaît qu'une fois par lot, donc chaque
 * question a la sienne, et elle ne bouge pas d'une régénération à l'autre.
 */
function payloadDe(question: QuestionAEcrire, atomId: string) {
  if (question.cloze) return question.cloze;

  if (question.options && question.correctIndex !== null) {
    return ordonnerLesOptions(question.options, question.correctIndex, `${atomId}:${question.facet}`);
  }

  return undefined;
}

export async function ecrireQuestions(
  atomId: string,
  questions: QuestionAEcrire[],
): Promise<number> {
  // Rien à écrire : on ne retire surtout pas ce qui existe, sans quoi une
  // régénération qui ne rend rien laisserait le concept sans aucune question.
  if (questions.length === 0) return 0;

  const [, ecrites] = await prisma.$transaction([
    // Les anciennes formulations sortent du tirage à l'instant où les nouvelles
    // arrivent, jamais avant : entre la mise en file et la relève il peut se
    // passer des heures, et le concept doit rester révisable pendant ce temps.
    // Elles sont retirées et non supprimées — leurs Reviews passées les citent.
    prisma.variant.updateMany({
      where: { atomId, retiredAt: null },
      data: { retiredAt: new Date() },
    }),
    prisma.variant.createMany({
      data: questions.map((question) => ({
        atomId,
        format: question.format,
        facet: question.facet,
        question: question.question,
        answerKey: question.answerKey,
        payload: payloadDe(question, atomId),
        // Le réglage sous lequel cette question a été écrite. Posé ici, à la
        // création, parce qu'il n'y a pas d'autre moment où on le connaisse.
        promptVersion: PROMPT_VERSIONS.generate_variants,
        model: readAiConfig().model,
      })),
    }),
  ]);

  return ecrites.count;
}

/**
 * Les anciennes questions d'un concept réécrit : elles ne le décrivent plus.
 *
 * Retirées, jamais supprimées. `Review.variantId` est en cascade : les
 * supprimer emportait tous les passages donnés sur ce concept — donc l'histoire
 * qui alimente la consolidation et le signal de maîtrise. Corriger une faute de
 * frappe effaçait des mois de révision, sans un mot.
 *
 * C'est déjà ce que fait `ecrireQuestions` quelques lignes plus haut, et pour
 * la même raison. Il n'y avait pas deux règles, il y en avait une et un oubli.
 */
export async function retirerQuestions(atomId: string, maintenant = new Date()): Promise<number> {
  const { count } = await prisma.variant.updateMany({
    where: { atomId, retiredAt: null },
    data: { retiredAt: maintenant },
  });

  return count;
}
