import { etalonUtile } from "@/components/revision/etalon-utile";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Ce qu'on montre d'une question quand on a jeté la pierre.
 *
 * Sur un format à choix, la bonne réponse est l'option : la montrer telle qu'on
 * l'aurait cliquée vaut mieux que de servir l'étalon, qui la reformule. Celui-ci
 * vient en précision, et seulement quand il ajoute quelque chose — sur un vrai
 * ou faux, il commence souvent par le mot qui est déjà affiché.
 *
 * Le déroulé n'a pas à savoir tout ça : il compte les questions et mesure le
 * temps. Quel format porte sa réponse où, c'est une affaire de format.
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
