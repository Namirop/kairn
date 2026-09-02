/**
 * Ce qu'une question demande à celui qui la lit.
 *
 * Trois formats, deux gestes. Un QCM se clique, un texte à trou se saisit : dans
 * les deux cas il faut **produire quelque chose** avant de savoir. Une question
 * ouverte, elle, se révèle — on lit la réponse, puis on se juge contre elle.
 *
 * La distinction décide d'une seule chose, mais elle compte : faut-il offrir de
 * renoncer ? Là où il faut produire, oui — sans sortie, quelqu'un qui ne
 * retrouve pas le terme n'a qu'une issue, inventer une saisie fausse ou cliquer
 * au hasard pour avancer. Ça écrit un passage mensonger et fausse la
 * planification. Sur une question ouverte, l'abandon n'a rien à offrir : voir la
 * réponse ne coûte rien et ne juge rien, et « Je ne l'avais pas » dit déjà
 * exactement la même chose une seconde plus tard.
 */

export type FormeDeQuestion = {
  /** Les propositions d'un QCM, quand il y en a. */
  options: string[] | null;
  /** L'index de la bonne proposition. Nul si la charge utile est abîmée. */
  correctIndex: number | null;
  /**
   * La charge utile du texte à trou, quelle qu'en soit la forme.
   *
   * Le domaine ne connaît pas sa structure et n'a pas à la connaître : seule sa
   * présence décide. La typer ici obligerait `lib/domain/` à suivre la forme
   * d'une colonne, ce qui est exactement l'inverse du sens des dépendances.
   */
  cloze: unknown;
};

/**
 * Faut-il produire une réponse avant de la découvrir ?
 *
 * Un QCM dont l'index de la bonne réponse manque n'est plus un QCM : le rendu
 * retombe alors sur la question ouverte, et cette fonction doit suivre le même
 * chemin, sans quoi l'écran proposerait de renoncer à un geste qu'il ne demande
 * plus.
 */
export function demandeUneProduction(question: FormeDeQuestion): boolean {
  if (question.options !== null && question.correctIndex !== null) return true;

  return question.cloze !== null && question.cloze !== undefined;
}
