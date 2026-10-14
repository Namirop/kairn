/**
 * Ce qu'une question demande à celui qui la lit : produire (QCM, texte à trou)
 * ou découvrir (question ouverte).
 *
 * Cela décide si l'on offre de renoncer. Là où il faut produire, sans sortie,
 * qui ne retrouve pas le terme invente une saisie ou clique au hasard, et fausse
 * la planification. Sur une question ouverte, « Je ne l'avais pas » joue déjà ce
 * rôle.
 */

export type FormeDeQuestion = {
  /** Les propositions d'un QCM, quand il y en a. */
  options: string[] | null;
  /** L'index de la bonne proposition. Nul si la charge utile est abîmée. */
  correctIndex: number | null;
  /**
   * La charge utile du texte à trou. Seule sa présence décide : la typer ferait
   * dépendre `lib/domain/` de la forme d'une colonne.
   */
  cloze: unknown;
};

/**
 * Faut-il produire une réponse avant de la découvrir ?
 *
 * Un QCM sans index de bonne réponse est rendu comme une question ouverte :
 * cette fonction suit le même chemin, sinon l'écran proposerait de renoncer à
 * un geste qu'il ne demande plus.
 */
export function demandeUneProduction(question: FormeDeQuestion): boolean {
  if (question.options !== null && question.correctIndex !== null) return true;

  return question.cloze !== null && question.cloze !== undefined;
}
