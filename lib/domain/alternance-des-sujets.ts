/**
 * L'ordre de service d'une session : alterner les sujets, puis les gestes.
 *
 * Réviser par blocs retient moins bien. À chaque tour, on sert le sujet le plus
 * fourni parmi ceux qui ne viennent pas d'être servis ; sans cette préférence,
 * le sujet majoritaire finirait la session d'un bloc.
 *
 * Le geste de réponse ne départage qu'ensuite : enchaîner le même geste lasse,
 * enchaîner le même sujet retient moins bien, et c'est l'apprentissage qui
 * prime. Rien n'est tiré au hasard.
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

/** Une file par sujet, dans l'ordre d'arrivée des concepts. */
function filesParSujet<T extends ConceptAAlterner>(concepts: T[]): Map<string, T[]> {
  const files = new Map<string, T[]>();

  for (const concept of concepts) {
    const cle = sujet(concept);
    const file = files.get(cle);

    if (file) file.push(concept);
    else files.set(cle, [concept]);
  }

  return files;
}

export function alternerLesSujets<T extends ConceptAAlterner>(
  concepts: T[],
  /** Le geste que servirait ce concept. Sans lui, seuls les sujets alternent. */
  gesteDe: (concept: T) => string = () => "",
): T[] {
  return alternerLesFiles(filesParSujet(concepts), concepts.length, gesteDe);
}

/** Vide les files en servant à chaque tour le sujet le plus fourni qui change. */
function alternerLesFiles<T>(
  files: Map<string, T[]>,
  total: number,
  gesteDe: (concept: T) => string,
): T[] {
  const ordonnes: T[] = [];
  let precedent: string | null = null;
  let gestePrecedent: string | null = null;

  while (ordonnes.length < total) {
    const restants = [...files.entries()].filter(([, file]) => file.length > 0);
    const autres = restants.filter(([cle]) => cle !== precedent);
    // Quand il ne reste qu'un sujet, il repasse plutôt que de tronquer la session.
    const tirage = autres.length > 0 ? autres : restants;
    // Parmi eux, ceux qui changent aussi de geste ; si aucun, le sujet prime.
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
