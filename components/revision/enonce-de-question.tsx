import { PhraseTrouee } from "@/components/revision/phrase-trouee";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Ce que la carte pose en titre.
 *
 * Pour presque tous les formats, c'est l'énoncé écrit à la génération. Le texte
 * à trou fait exception : sa phrase EST son énoncé. Le champ `question` que la
 * génération écrit à côté redit cette phrase, précédée d'un « Complète : », et
 * on lisait donc le même texte deux fois — une fois en titre, une fois au-dessus
 * du champ de saisie. C'est la phrase qui monte en titre, avec son trou, et le
 * trou se remplit à la frappe.
 *
 * On ne lit pas `question` sur ce format, même quand il ne redit rien : ce qu'il
 * porte varie d'une génération à l'autre, et une carte dont le titre change de
 * nature selon l'humeur du modèle ne se conçoit pas.
 */
export function EnonceDeQuestion({
  question,
  comble,
}: {
  question: QuestionServie;
  /** Ce qui remplit le trou d'un texte à trou. Ignoré des autres formats. */
  comble: string | null;
}) {
  if (question.cloze) return <PhraseTrouee phrase={question.cloze.sentence} comble={comble} />;

  return <TexteTechnique>{question.question}</TexteTechnique>;
}
