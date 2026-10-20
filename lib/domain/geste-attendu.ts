/**
 * Produire (QCM, texte à trou) ou découvrir (question ouverte) : cela décide si
 * l'on offre de renoncer. Sans sortie, qui ne retrouve pas le terme clique au
 * hasard et fausse la planification ; la question ouverte a déjà « Je ne
 * l'avais pas ».
 */

export type FormeDeQuestion = {
  options: string[] | null;
  /** Nul si la charge utile est abîmée. */
  correctIndex: number | null;
  /** Seule sa présence décide : la typer lierait `lib/domain/` à une colonne. */
  cloze: unknown;
};

/**
 * Un QCM sans index est rendu en question ouverte : on suit le même chemin, sinon
 * l'écran proposerait de renoncer à un geste qu'il ne demande plus.
 */
export function demandeUneProduction(question: FormeDeQuestion): boolean {
  if (question.options !== null && question.correctIndex !== null) return true;

  return question.cloze !== null && question.cloze !== undefined;
}
