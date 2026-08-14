/**
 * Le hasard reproductible du projet.
 *
 * Partout où quelque chose doit paraître irrégulier sans jamais changer entre
 * deux affichages — la taille d'une pierre du cairn, l'ondulation d'une strate,
 * l'ordre des options d'un QCM —, c'est d'ici que vient le tirage. Même graine,
 * même suite, pour toujours et sur n'importe quelle machine.
 *
 * Les deux fonctions vivaient en double dans `cairn-stack.ts` et `strates.ts`,
 * la seconde signalant en commentaire qu'elle recopiait la première. Une
 * troisième copie aurait fini par diverger d'un caractère, et le jour où la
 * suite change, ce sont les cairns déjà construits qui se réarrangent.
 */

/** FNV-1a 32 bits : une chaîne quelconque ramenée à un entier bien étalé. */
export function empreinte(graine: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < graine.length; index += 1) {
    hash ^= graine.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** Générateur mulberry32 : court, rapide, suffisamment bien réparti. */
export function generateur(etat: number): () => number {
  let courant = etat;

  return () => {
    courant = (courant + 0x6d2b79f5) >>> 0;
    let melange = Math.imul(courant ^ (courant >>> 15), 1 | courant);
    melange = (melange + Math.imul(melange ^ (melange >>> 7), 61 | melange)) ^ melange;

    return ((melange ^ (melange >>> 14)) >>> 0) / 4294967296;
  };
}

/** Le tirage d'une graine, sans avoir à composer les deux à chaque fois. */
export function tirageDe(graine: string): () => number {
  return generateur(empreinte(graine));
}
