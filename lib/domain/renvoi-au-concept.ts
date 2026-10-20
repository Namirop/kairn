import { sansAccents } from "./texte-aplati";

/**
 * Les questions qui renvoient à un texte que la révision ne montre jamais
 * (« mentionné dans le concept »). On les écarte au lieu de les servir : une
 * question ne se réécrit qu'à l'usure (`rotation-variantes.ts`). Si le taux
 * d'écart monte au banc, on reprend le prompt, pas ce filtre.
 */

function minuscule(texte: string): string {
  return texte.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
}

function aplati(texte: string): string {
  return sansAccents(minuscule(texte));
}

/**
 * Le démonstratif (« ce concept ») suffit toujours ; la forme définie seulement
 * derrière une préposition de citation et jamais suivie de « de » (« le concept
 * de fermeture lexicale » est légitime). En anglais, le renvoi explicite seul.
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
 * Le participe de citation seul (« les indicateurs mentionnés »). Lu accentué :
 * sans accent, il se confond avec « il mentionne ». « Cité » et « décrit » ont
 * trop d'emplois légitimes. Bornes en assertions de lettre, `\b` ne connaissant
 * que l'ASCII.
 */
const LETTRE = "a-zà-öø-ÿ";

const RENVOIS_ACCENTUES: readonly RegExp[] = [
  new RegExp(
    `(?<![${LETTRE}])(?:mentionn|évoqu)ée?s?(?![${LETTRE}])(?!\\s+(?:dans|par|au|aux|à|comme|ci-|plus haut))`,
  ),
];

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

/** Même lecture que `controlerRenvoi`, pour que le banc mesure ce que la production écarte. */
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
