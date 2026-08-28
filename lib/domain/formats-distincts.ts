/**
 * Ne montrer qu'une question par format.
 *
 * L'essai de la landing pose les quatre questions d'un concept côte à côte,
 * chacune derrière le nom de son format. C'est là que se prouve la rotation :
 * le visiteur voit qu'un concept se repose de quatre manières, et il le
 * comprend sans qu'on l'explique.
 *
 * **Deux « TEXTE À TROU » côte à côte détruisent exactement cette
 * démonstration.** C'est arrivé en production le 28/08 : deux phrases de la même
 * forme, à un mot masqué près, sur la page qui convertit. La consigne de
 * génération autorise deux questions du même format — et elle a raison de
 * l'autoriser : sans code à citer, il ne reste que trois formats vérifiables
 * pour trois facettes, et exiger quatre formats distincts ferait inventer un
 * format plutôt que tenir la fidélité au concept.
 *
 * Ce qui vaut pour les quatre Variants d'un Atom ne vaut donc pas pour la
 * vitrine. La sélection se fait ici, à l'affichage : on garde la première
 * question de chaque format, dans l'ordre où le lot les a écrites. Trois
 * questions de trois formes disent mieux la rotation que quatre dont deux se
 * ressemblent.
 *
 * Rien n'est perdu par ailleurs : les quatre Variants restent en base et le
 * compte auquel ils appartiennent les verra tous.
 */

export function unParFormat<T extends { format: string }>(questions: T[]): T[] {
  const vus = new Set<string>();

  return questions.filter((question) => {
    if (vus.has(question.format)) return false;

    vus.add(question.format);

    return true;
  });
}
