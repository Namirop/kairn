import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Ce que la carte pose en titre.
 *
 * Pour presque tous les formats, c'est l'énoncé écrit à la génération. Le texte
 * à trou fait exception : sa phrase EST son énoncé. Le champ `question` que la
 * génération écrit à côté redit cette phrase, précédée d'un « Complète : », et
 * on lisait donc le même texte deux fois — une fois en titre, une fois au-dessus
 * du champ de saisie. C'est la phrase qui monte en titre, avec son trou, et le
 * champ dit seulement ce qu'on attend dedans.
 *
 * On ne lit pas `question` sur ce format, même quand il ne redit rien : ce qu'il
 * porte varie d'une génération à l'autre, et une carte dont le titre change de
 * nature selon l'humeur du modèle ne se conçoit pas.
 */
export function enonceDeCarte(question: QuestionServie): string {
  return question.cloze ? question.cloze.sentence : question.question;
}
