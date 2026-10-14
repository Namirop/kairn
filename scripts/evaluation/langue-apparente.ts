/**
 * Deviner la langue d'un texte, assez bien pour un instrument de mesure.
 *
 * Heuristique de banc, pas logique produit : l'application ne doit pas
 * l'appeler, elle tient la langue de la personne.
 *
 * Elle compte des mots-outils. C'est grossier et suffisant : il s'agit de voir
 * une sortie dans la mauvaise langue, pas de classer un texte ambigu. Dans le
 * doute elle se tait : un instrument qui crie au loup se fait ignorer.
 */

const MOTS_OUTILS: Record<string, string[]> = {
  fr: ["le", "la", "les", "des", "une", "est", "que", "qui", "pour", "dans", "pas", "plus", "sur"],
  en: ["the", "of", "and", "is", "that", "which", "for", "with", "not", "this", "are", "from"],
  es: ["el", "la", "los", "las", "una", "que", "por", "para", "con", "más", "pero", "como"],
  de: ["der", "die", "das", "und", "ist", "nicht", "eine", "auch", "mit", "sich", "wird", "aber"],
  it: ["il", "lo", "la", "che", "una", "per", "con", "non", "più", "come", "sono", "nella"],
};

/** En dessous, le compte ne veut rien dire. */
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
 * Sans accents, « plus » et « más » se confondent, et c'est voulu : les listes
 * se recoupent déjà entre langues romanes, c'est l'écart entre les scores qui
 * décide.
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
