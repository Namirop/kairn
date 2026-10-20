import { etalonUtile } from "@/lib/domain/etalon-utile";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Ce qu'on montre quand on a jeté la pierre. Sur un format à choix, la bonne
 * option plutôt que l'étalon qui la reformule ; l'étalon en précision seulement
 * s'il ajoute quelque chose (un vrai ou faux le commence souvent par le même mot).
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
