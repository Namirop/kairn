/**
 * Ne montrer qu'une question par format, à l'affichage de l'essai de la
 * landing, où les questions côte à côte prouvent la rotation.
 *
 * La génération peut légitimement rendre deux Variants du même format (sans
 * code à citer, il ne reste que trois formats vérifiables), mais deux textes à
 * trou côte à côte ruinent la démonstration. Les Variants restent tous en
 * base.
 */

export function unParFormat<T extends { format: string }>(questions: T[]): T[] {
  const vus = new Set<string>();

  return questions.filter((question) => {
    if (vus.has(question.format)) return false;

    vus.add(question.format);

    return true;
  });
}
