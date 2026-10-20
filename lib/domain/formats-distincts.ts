/**
 * Une question par format dans l'essai de la landing, qui montre la rotation.
 * Deux Variants du même format sont légitimes (sans code à citer, il reste trois
 * formats vérifiables) et restent en base, mais ruinent la démonstration.
 */

export function unParFormat<T extends { format: string }>(questions: T[]): T[] {
  const vus = new Set<string>();

  return questions.filter((question) => {
    if (vus.has(question.format)) return false;

    vus.add(question.format);

    return true;
  });
}
