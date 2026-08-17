/**
 * L'ordre de service d'une session : alterner les sujets, puis les gestes.
 *
 * Réviser par blocs est plus confortable sur le moment et retient moins bien.
 * On sert donc à chaque tour le sujet le plus fourni parmi ceux qui ne viennent
 * pas d'être servis : sans cette préférence au plus fourni, le sujet majoritaire
 * finirait la session d'un bloc, ce qu'on cherchait justement à éviter.
 *
 * Le geste de réponse départage ensuite, et jamais l'inverse. Cinq fois « choisis
 * ta réponse » d'affilée lassent ; cinq concepts du même sujet d'affilée retiennent
 * moins bien. La première est une affaire de confort, la seconde d'apprentissage —
 * et c'est pour l'apprentissage que le produit existe. Le geste ne change donc que
 * ce que l'alternance des sujets laissait indécis.
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

export function alternerLesSujets<T extends ConceptAAlterner>(
  concepts: T[],
  /** Le geste que servirait ce concept. Sans lui, seuls les sujets alternent. */
  gesteDe: (concept: T) => string = () => "",
): T[] {
  const files = new Map<string, T[]>();

  for (const concept of concepts) {
    const cle = sujet(concept);
    const file = files.get(cle);

    if (file) file.push(concept);
    else files.set(cle, [concept]);
  }

  const ordonnes: T[] = [];
  let precedent: string | null = null;
  let gestePrecedent: string | null = null;

  while (ordonnes.length < concepts.length) {
    const restants = [...files.entries()].filter(([, file]) => file.length > 0);
    const autres = restants.filter(([cle]) => cle !== precedent);
    // Répéter un sujet vaut mieux que tronquer la session : quand il ne reste
    // que lui, il repasse.
    const tirage = autres.length > 0 ? autres : restants;
    // Et parmi ceux qui changent de sujet, ceux qui changent aussi de geste.
    // Quand aucun ne le fait, le sujet garde la main : c'est lui qui compte.
    const varies = tirage.filter(([, file]) => {
      const tete = file[0];

      return tete !== undefined && gesteDe(tete) !== gestePrecedent;
    });
    const retenus = varies.length > 0 ? varies : tirage;
    const choisi = retenus.reduce((a, b) => (b[1].length > a[1].length ? b : a));
    const suivant = choisi[1].shift();

    if (!suivant) break;

    ordonnes.push(suivant);
    precedent = choisi[0];
    gestePrecedent = gesteDe(suivant);
  }

  return ordonnes;
}
