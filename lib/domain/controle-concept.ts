import type { Manquement } from "./manquement";

/**
 * Ce qui se vérifie sur le texte d'un concept : se comprend-il seul, et cite-t-il
 * du code.
 */

/*
  Les deux langues sont lues ensemble, sans qu'on dise laquelle.

  Un concept porte la langue de son dépôt, et ces motifs ne se recouvrent pas :
  « ci-dessus » n'apparaît pas dans une phrase anglaise, ni « mentioned above »
  dans une française. Demander la langue en plus aurait ouvert la seule façon de
  rater : la passer mal, et que le contrôle cesse d'attraper en silence.

  L'anglais est lu plus étroitement. « above », « below », « previously » y sont
  aussi des mots de prose — « above 40 °C », « previously known as » — là où
  « ci-dessus » ne renvoie qu'à un texte. On n'en retient que les tournures qui
  ne peuvent désigner qu'un passage absent.
*/
const RENVOIS = [
  /ci-dessus|ci-dessous|ci-avant|plus haut dans|comme vu|comme expliqué|précédemment|le précédent|la précédente|susmentionné|évoqué plus haut/i,
  /\b(?:as (?:seen|mentioned|discussed|explained|noted|described|shown)(?: (?:above|earlier|before|previously))?|(?:mentioned|described|discussed|explained|shown|listed|noted) (?:above|below|earlier|previously)|see above|the above|aforementioned|above-mentioned|earlier in the (?:text|article|section))\b/i,
];

/** Une ouverture qui reprend un antécédent absent du concept. */
const OUVERTURES_REPRISES = [
  /^(il|elle|ils|elles|cela|ça|celui|celle|ceux|celles|cette|ces|cet)\b/i,
  /^(it|its|they|their|this|these|those|that|he|she)\b/i,
];

/**
 * « Il faut », « il existe », « it is possible » : le pronom ne reprend rien, il
 * est impersonnel. « It is » laisse passer « It is a framework », qui reprend
 * bien un absent — c'est le prix d'un contrôle qui sert à mesurer, et le
 * français paie le même avec « il est ».
 */
const OUVERTURES_IMPERSONNELLES = [
  /^il (faut|existe|est|y a|n'y a|s'agit|suffit|vaut|arrive|reste)\b/i,
  /^it(?:'s| is| was| takes| seems| appears| helps| pays| depends| matters| turns out)\b/i,
];

/**
 * Ce qui déclenche la règle CODE du prompt : une citation, pas un jugement sur
 * le sujet.
 *
 * L'extraction écrit rarement des accents graves — elle rend `L'instruction COPY`
 * ou `Le délai passé à setTimeout`. Les marqueurs suivent donc le code tel qu'il
 * est réellement écrit, pas tel qu'on aimerait qu'il soit balisé.
 *
 * Sert à mesurer, pas à sanctionner : une question CODE posée pour respecter une
 * règle plutôt que pour éprouver quelque chose ne se verra qu'à l'œil.
 */
const CITATIONS_DE_CODE = [
  /`[^`]+`/, // un fragment entre accents graves
  /\b[A-Za-z_$][\w$]*\(/, // un appel : at(, Promise.all(
  /\b[a-z][\w$]*[A-Z][\w$]*/, // un identifiant en casse mixte : setTimeout, useEffect
  /\b[A-Z][A-Z_]{2,}\b/, // une instruction ou une variable : COPY, DATABASE_URL
  /\b[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*/, // un chemin pointé : Promise.all
];

export function citeDuCode(concept: string): boolean {
  return CITATIONS_DE_CODE.some((marqueur) => marqueur.test(concept));
}

/** Le concept se comprend-il seul, sans le texte d'origine ni ses voisins ? */
export function controlerConcept(concept: string): Manquement[] {
  const manquements: Manquement[] = [];
  const texte = concept.trim();
  const renvoi = RENVOIS.map((motif) => motif.exec(texte)).find((trouve) => trouve !== null);

  if (renvoi) {
    manquements.push({ regle: "renvoi", detail: `« ${renvoi[0]} » renvoie hors du concept` });
  }

  const reprend = OUVERTURES_REPRISES.some((motif) => motif.test(texte));
  const impersonnel = OUVERTURES_IMPERSONNELLES.some((motif) => motif.test(texte));

  if (reprend && !impersonnel) {
    const premiersMots = texte.split(/\s+/).slice(0, 3).join(" ");
    manquements.push({ regle: "antécédent", detail: `« ${premiersMots}… » reprend un absent` });
  }

  return manquements;
}
