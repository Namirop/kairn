/**
 * Alterne les domaines au lieu de les grouper.
 *
 * Réviser par blocs est plus confortable sur le moment et retient moins bien.
 * On sert donc à chaque tour le sujet le plus fourni parmi ceux qui ne viennent
 * pas d'être servis : sans cette préférence au plus fourni, le sujet majoritaire
 * finirait la session d'un bloc, ce qu'on cherchait justement à éviter.
 *
 * Deux fois la même entrée rend deux fois la même sortie : rien ici n'est tiré
 * au hasard.
 */

/** Le strict nécessaire pour ranger un concept sous un sujet. */
export type ConceptAAlterner = {
  tags: string[];
  /** Le dépôt d'origine, qui sert de sujet quand le concept n'a pas de tag. */
  inputId: string;
};

/** Ce qui définit un sujet : le premier tag, sinon le dépôt. */
function sujet(concept: ConceptAAlterner): string {
  return concept.tags[0] ?? concept.inputId;
}

export function alternerLesSujets<T extends ConceptAAlterner>(concepts: T[]): T[] {
  const files = new Map<string, T[]>();

  for (const concept of concepts) {
    const cle = sujet(concept);
    const file = files.get(cle);

    if (file) file.push(concept);
    else files.set(cle, [concept]);
  }

  const ordonnes: T[] = [];
  let precedent: string | null = null;

  while (ordonnes.length < concepts.length) {
    const restants = [...files.entries()].filter(([, file]) => file.length > 0);
    const autres = restants.filter(([cle]) => cle !== precedent);
    // Répéter un sujet vaut mieux que tronquer la session : quand il ne reste
    // que lui, il repasse.
    const tirage = autres.length > 0 ? autres : restants;
    const choisi = tirage.reduce((a, b) => (b[1].length > a[1].length ? b : a));
    const suivant = choisi[1].shift();

    if (!suivant) break;

    ordonnes.push(suivant);
    precedent = choisi[0];
  }

  return ordonnes;
}
