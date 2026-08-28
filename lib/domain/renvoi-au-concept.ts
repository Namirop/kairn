/**
 * Une question qui renvoie à un texte que la personne ne voit pas.
 *
 * « Quel effet, **mentionné dans le concept**, courbe la trajectoire de la balle
 * vers le bas lors d'un lift ? » — servi tel quel en session. L'écran de révision
 * ne montre jamais le concept, et c'est délibéré : l'afficher donnerait la
 * réponse avec l'exercice. La question désigne donc quelque chose qui n'est nulle
 * part, et il ne reste au lecteur que deux étiquettes en petites capitales
 * au-dessus de la carte pour deviner de quoi on parle.
 *
 * Une question doit se lire seule. Ce n'est pas une préférence de style : c'est
 * la condition pour qu'elle mesure un rappel plutôt qu'une capacité à recoller
 * un contexte manquant.
 *
 * **Ce module détecte le renvoi, il ne le répare pas.** La correction est dans
 * le prompt, où elle coûte une ligne ; ici on mesure si elle prend, question par
 * question, sur le banc comme sur ce qui est déjà en base. Une question fautive
 * reste servable — elle est maladroite, pas fausse — et sera réécrite à la
 * prochaine régénération de son concept.
 */

/** Minuscules, sans accents, apostrophes ramenées à une seule forme. */
function aplati(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * Les tournures qui pointent vers l'invisible.
 *
 * **Le démonstratif est le signal le plus sûr** : « ce concept », « ce texte »,
 * « cet extrait » ne peuvent désigner que quelque chose de montré, et rien n'est
 * montré. Il ne demande donc aucune précaution.
 *
 * **`le concept`, lui, en demande une.** « Le concept de fermeture lexicale » est
 * une tournure parfaitement légitime, où « concept » introduit son propre sujet
 * au lieu de renvoyer ailleurs. On ne relève donc la forme définie que derrière
 * une préposition de citation — dans, selon, d'après, mentionné dans — et jamais
 * quand un « de » la fait suivre de ce dont elle parle.
 *
 * L'anglais est traité de la même façon et plus étroitement encore : « the
 * concept » y est si courant qu'on ne relève que ce qui pointe explicitement.
 */
const RENVOIS: readonly RegExp[] = [
  /\b(?:ce|cet|cette|ces)\s+(?:concept|texte|passage|extrait|enonce|depot|note)s?\b/,
  /\b(?:dans|selon|d'apres|dapres|mentionne dans|mentionnee dans|cite dans|decrit dans|evoque dans|du|de la|de l')\s*(?:le\s+|la\s+|l')?(?:concept|texte|passage|extrait|enonce|depot)\b(?!\s+d[eu']\b)/,
  /\bci-dessus\b|\bci-dessous\b|\bplus haut\b|\bci-contre\b/,
  /\bthis\s+(?:concept|text|passage|excerpt|statement|note)\b/,
  /\b(?:mentioned|described|stated|given|shown)\s+(?:above|in the (?:concept|text|passage))\b/,
];

/** La tournure fautive trouvée dans ce texte, ou `null`. */
export function renvoiAuConcept(texte: string): string | null {
  const plat = aplati(texte);

  for (const motif of RENVOIS) {
    const trouve = motif.exec(plat);

    if (trouve) return trouve[0];
  }

  return null;
}
