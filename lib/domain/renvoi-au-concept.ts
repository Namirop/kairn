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
 * **Ce module ne répare rien : il détecte, et il écarte.** La correction est
 * dans le prompt, où elle coûte une ligne ; ici on mesure si elle prend, et on
 * refuse d'écrire ce qui la viole.
 *
 * **Pourquoi écarter plutôt que servir.** La question reste répondable — les
 * options portent le contenu —, mais elle demande de deviner un contexte absent,
 * et on ne saurait pas la corriger plus tard : les questions d'un concept ne se
 * réécrivent qu'à l'usure, quand chaque facette a été vue trois fois, et pas
 * plus d'une fois par semaine et par concept. Voir `rotation-variantes.ts`. Une
 * question fautive vit donc des mois. Le lot en compte quatre : il en garde
 * trois, et la facette manquante revient à la réécriture suivante.
 *
 * **Le prix est assumé.** Un concept peut sortir avec trois questions au lieu de
 * quatre, et la mesure du banc dit à quelle fréquence ça arrive — si elle monte,
 * c'est le prompt qu'il faut reprendre, pas ce filtre qu'il faut assouplir.
 */

/** Minuscules, apostrophes ramenées à une seule forme, espaces resserrés. */
function minuscule(texte: string): string {
  return texte.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
}

/** La même chose, accents ôtés : c'est la forme que lisent les motifs ci-dessous. */
function aplati(texte: string): string {
  return minuscule(texte).normalize("NFD").replace(/[̀-ͯ]/g, "");
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
  /\bmentioned\b(?!\s+(?:in|by|above|earlier|below))/,
];

/**
 * Le participe de citation employé seul, qui pointe sans nommer.
 *
 * « **Compare les deux indicateurs mentionnés** et précise lequel prédit le
 * mieux l'issue d'un match » — servi en session. Aucun indicateur n'est
 * mentionné : on ne voit que la question. C'est la même faute que « mentionné
 * dans le concept », en plus discret, et elle échappait aux motifs ci-dessus qui
 * exigent tous que la cible du renvoi soit nommée.
 *
 * **Les accents comptent ici, et c'est pour ça que ce motif est à part.** Sans
 * eux, « mentionné » et « il mentionne » sont le même mot, et la seconde forme
 * est une phrase parfaitement normale. Le participe accentué, lui, ne peut que
 * renvoyer à quelque chose. On ne relève pas « cité », homographe d'un nom
 * courant, ni les participes ordinaires — « décrit », « donné » — qui ont mille
 * emplois légitimes : le renvoi se reconnaît au verbe de citation.
 *
 * La négation garde ce qui nomme sa source : « mentionné par Newton »,
 * « évoquée dans la loi » désignent quelque chose que le lecteur peut situer.
 *
 * Les bornes sont des assertions de lettre et non des `\b` : la limite de mot de
 * JavaScript se calcule sur l'ASCII, où « é » n'est pas une lettre. `\bévoqué\b`
 * ne reconnaît donc ni le début ni la fin du mot qu'il nomme.
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
 * Un lot débarrassé des questions qui renvoient à l'invisible.
 *
 * On regarde ce que la personne lit vraiment : la phrase trouée d'un texte à
 * trou, l'énoncé partout ailleurs. C'est la lecture de `controlerRenvoi`, et les
 * deux doivent rester la même — le banc mesure ce que la production écarte.
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
