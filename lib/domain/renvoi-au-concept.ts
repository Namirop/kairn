import { sansAccents } from "./texte-aplati";

/**
 * Détecte les questions qui renvoient à un texte que la personne ne voit pas
 * (« quel effet, mentionné dans le concept, … »). L'écran de révision ne montre
 * jamais le concept : une question doit se lire seule pour mesurer un rappel.
 *
 * On écarte au lieu de servir parce qu'une question fautive vivrait des mois :
 * les questions ne se réécrivent qu'à l'usure (voir `rotation-variantes.ts`).
 * Le lot de quatre en garde alors trois. La correction est dans le prompt ; si
 * le taux d'écart mesuré au banc monte, c'est lui qu'on reprend, pas ce filtre
 * qu'on assouplit.
 */

/** Minuscules, apostrophes ramenées à une seule forme, espaces resserrés. */
function minuscule(texte: string): string {
  return texte.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
}

/** La même chose, accents ôtés : c'est la forme que lisent les motifs ci-dessous. */
function aplati(texte: string): string {
  return sansAccents(minuscule(texte));
}

/**
 * Les tournures qui pointent vers l'invisible.
 *
 * Le démonstratif (« ce concept », « cet extrait ») suffit toujours. La forme
 * définie, non : « le concept de fermeture lexicale » est légitime. On ne la
 * relève que derrière une préposition de citation, et jamais suivie de « de ».
 * L'anglais, où « the concept » est courant, ne relève que le renvoi explicite.
 */
const RENVOIS: readonly RegExp[] = [
  /\b(?:ce|cet|cette|ces)\s+(?:concept|texte|passage|extrait|enonce|depot|note)s?\b/,
  /\b(?:dans|selon|d'apres|dapres|mentionne dans|mentionnee dans|cite dans|decrit dans|evoque dans|du|de la|de l')\s*(?:le\s+|la\s+|l')?(?:concept|texte|passage|extrait|enonce|depot)\b(?!\s+d[eu']\b)/,
  /\bci-dessus\b|\bci-dessous\b|\bplus haut\b|\bci-contre\b/,
  /\bthis\s+(?:concept|text|passage|excerpt|statement|note)\b/,
  /\b(?:mentioned|described|stated|given|shown)\s+(?:above|in the (?:concept|text|passage))\b/,
  /\bmentioned\b(?!\s+(?:in|by|above|earlier|below))/,
];

/**
 * Le participe de citation employé seul (« les deux indicateurs mentionnés »),
 * qui pointe sans nommer de cible.
 *
 * Ce motif lit le texte accentué : sans accent, « mentionné » se confond avec
 * « il mentionne ». « Cité » et les participes ordinaires (« décrit ») sont
 * écartés, trop d'emplois légitimes. La négation finale garde ce qui nomme sa
 * source (« mentionné par Newton »).
 *
 * Bornes en assertions de lettre et non `\b`, qui ne connaît que l'ASCII : « é »
 * n'y est pas une lettre.
 */
const LETTRE = "a-zà-öø-ÿ";

const RENVOIS_ACCENTUES: readonly RegExp[] = [
  new RegExp(
    `(?<![${LETTRE}])(?:mentionn|évoqu)ée?s?(?![${LETTRE}])(?!\\s+(?:dans|par|au|aux|à|comme|ci-|plus haut))`,
  ),
];

/** La tournure fautive trouvée dans ce texte, ou `null`. */
export function renvoiAuConcept(texte: string): string | null {
  const plat = aplati(texte);

  for (const motif of RENVOIS) {
    const trouve = motif.exec(plat);

    if (trouve) return trouve[0];
  }

  const accentue = minuscule(texte);

  for (const motif of RENVOIS_ACCENTUES) {
    const trouve = motif.exec(accentue);

    if (trouve) return trouve[0];
  }

  return null;
}

/**
 * Un lot débarrassé des questions qui renvoient à l'invisible, lues comme la
 * personne les lit (la phrase trouée d'un texte à trou, l'énoncé sinon). Même
 * lecture que `controlerRenvoi`, pour que le banc mesure ce que la production
 * écarte.
 */
export function sansRenvoiAuConcept<
  T extends { format: string; question: string; cloze?: { sentence: string } | null },
>(lot: readonly T[]): T[] {
  return lot.filter(
    (question) =>
      renvoiAuConcept(
        question.format === "CLOZE" ? (question.cloze?.sentence ?? "") : question.question,
      ) === null,
  );
}
