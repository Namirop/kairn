/**
 * Deviner la langue d'un texte, assez bien pour un instrument de mesure.
 *
 * C'est une **heuristique de banc**, pas de la logique produit : elle ne sert
 * qu'à dire si un rapport doit lever un manquement. Rien dans l'application ne
 * l'appelle, et rien ne doit l'appeler — un produit qui a besoin de connaître la
 * langue la fait déclarer, ce que l'extraction fait maintenant.
 *
 * Elle compte des mots-outils, ceux qui reviennent dans n'importe quel texte et
 * qui ne se traduisent pas d'une langue à l'autre. C'est grossier, et c'est
 * suffisant : on ne cherche pas à classer un texte ambigu, on cherche à voir un
 * dépôt anglais rendre des concepts français. Dans le doute, elle ne dit rien —
 * un instrument qui crie au loup se fait ignorer, et un contrôle ignoré ne vaut
 * pas mieux que pas de contrôle.
 */

const MOTS_OUTILS: Record<string, string[]> = {
  fr: ["le", "la", "les", "des", "une", "est", "que", "qui", "pour", "dans", "pas", "plus", "sur"],
  en: ["the", "of", "and", "is", "that", "which", "for", "with", "not", "this", "are", "from"],
  es: ["el", "la", "los", "las", "una", "que", "por", "para", "con", "más", "pero", "como"],
  de: ["der", "die", "das", "und", "ist", "nicht", "eine", "auch", "mit", "sich", "wird", "aber"],
  it: ["il", "lo", "la", "che", "una", "per", "con", "non", "più", "come", "sono", "nella"],
};

/** En dessous, il n'y a pas assez de mots pour que le compte veuille dire quoi que ce soit. */
const MOTS_MINIMUM = 25;

/** Le gagnant doit devancer le second d'au moins ça, sinon on se tait. */
const AVANCE_MINIMALE = 1.5;

function mots(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\p{Letter}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * La langue la plus probable, ou rien quand le texte ne tranche pas.
 *
 * Les accents sont retirés avant comparaison, donc « plus » et « más » se
 * confondent — c'est voulu : les listes se recoupent déjà entre langues
 * romanes, et c'est l'écart entre les scores qui décide, pas un mot isolé.
 */
export function langueApparente(texte: string): string | null {
  const trouves = mots(texte);

  if (trouves.length < MOTS_MINIMUM) return null;

  const compte = new Map<string, number>();

  for (const [langue, outils] of Object.entries(MOTS_OUTILS)) {
    const sansAccent = outils.map((outil) => outil.normalize("NFD").replace(/[^a-z]/g, ""));
    compte.set(langue, trouves.filter((mot) => sansAccent.includes(mot)).length);
  }

  const classees = [...compte.entries()].sort((un, deux) => deux[1] - un[1]);
  const [premier, second] = classees;

  if (!premier || premier[1] === 0) return null;
  if (second && premier[1] < second[1] * AVANCE_MINIMALE) return null;

  return premier[0];
}
