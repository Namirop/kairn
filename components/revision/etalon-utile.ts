/**
 * L'étalon dit-il autre chose que la bonne option ?
 *
 * Un vrai ou faux a souvent « Faux » pour toute réponse : l'afficher sous une
 * option « Faux » déjà surlignée n'apprend rien et ajoute une ligne de bruit.
 * Une réponse générée, elle, explique après le verdict, et là elle vaut d'être
 * lue.
 *
 * Partagé par la correction d'un choix et par ce qui suit une pierre jetée :
 * les deux montrent la bonne réponse, les deux ont la même question à trancher.
 */
export function etalonUtile(answerKey: string, bonneOption: string): boolean {
  return answerKey.trim().toLowerCase() !== bonneOption.trim().toLowerCase();
}
