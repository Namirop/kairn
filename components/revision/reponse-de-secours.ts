import { etalonUtile } from "@/lib/domain/etalon-utile";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Ce qu'on montre d'une question quand on a jeté la pierre.
 *
 * Sur un format à choix, la bonne option telle qu'on l'aurait cliquée, plutôt
 * que l'étalon qui la reformule. L'étalon ne vient en précision que s'il
 * ajoute quelque chose (`etalonUtile`) : sur un vrai ou faux, il commence
 * souvent par le mot déjà affiché.
 */
export function reponseDeSecours(question: QuestionServie): {
  reponse: string;
  precision?: string;
} {
  const bonneOption =
    question.options && question.correctIndex !== null
      ? (question.options[question.correctIndex] ?? null)
      : null;

  if (!bonneOption) return { reponse: question.answerKey };

  return etalonUtile(question.answerKey, bonneOption)
    ? { reponse: bonneOption, precision: question.answerKey }
    : { reponse: bonneOption };
}
