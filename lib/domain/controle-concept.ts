import type { Manquement } from "./manquement";

/**
 * Ce qui se vérifie sur le texte d'un concept : se comprend-il seul, et cite-t-il
 * du code.
 */

const RENVOIS =
  /ci-dessus|ci-dessous|ci-avant|plus haut dans|comme vu|comme expliqué|précédemment|le précédent|la précédente|susmentionné|évoqué plus haut/i;

/** Une ouverture qui reprend un antécédent absent du concept. */
const OUVERTURE_REPRISE = /^(il|elle|ils|elles|cela|ça|celui|celle|ceux|celles|cette|ces|cet)\b/i;

/** « Il faut », « il existe » : le pronom ne reprend rien, il est impersonnel. */
const OUVERTURE_IMPERSONNELLE =
  /^il (faut|existe|est|y a|n'y a|s'agit|suffit|vaut|arrive|reste)\b/i;

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
  const renvoi = RENVOIS.exec(texte);

  if (renvoi) {
    manquements.push({ regle: "renvoi", detail: `« ${renvoi[0]} » renvoie hors du concept` });
  }

  if (OUVERTURE_REPRISE.test(texte) && !OUVERTURE_IMPERSONNELLE.test(texte)) {
    const premiersMots = texte.split(/\s+/).slice(0, 3).join(" ");
    manquements.push({ regle: "antécédent", detail: `« ${premiersMots}… » reprend un absent` });
  }

  return manquements;
}
