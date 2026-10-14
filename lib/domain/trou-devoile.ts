import { normaliserReponse, TROU } from "./reponse-cloze";

/**
 * Le terme masqué qu'on peut lire ailleurs dans sa propre phrase : la question
 * ne demande plus de savoir, seulement de recopier.
 *
 * `bord-du-trou.ts` traite les mots collés au trou, qui cassent la comparaison ;
 * ici on regarde le reste de la phrase, où rien n'est cassé mais rien n'est
 * plus testé.
 *
 * La comparaison passe par `normaliserReponse`, celle qui note les réponses : la
 * question est de savoir si recopier serait compté juste.
 */

/** Les mots d'un texte, normalisés comme une réponse. Vide si le texte l'est. */
function mots(texte: string): string[] {
  return normaliserReponse(texte).split(" ").filter(Boolean);
}

/**
 * La suite `aiguille` apparaît-elle telle quelle dans `meule` ?
 *
 * On cherche le terme entier, mot à mot : pour « sommeil paradoxal », un
 * « sommeil » répété seul ne dévoile rien.
 */
function contient(meule: readonly string[], aiguille: readonly string[]): boolean {
  if (aiguille.length === 0 || aiguille.length > meule.length) return false;

  return meule.some(
    (_, depart) =>
      depart + aiguille.length <= meule.length &&
      aiguille.every((mot, rang) => meule[depart + rang] === mot),
  );
}

/**
 * Le terme attendu est-il écrit ailleurs dans la phrase trouée ?
 * Le trou est retiré avant la recherche ; une phrase sans trou ne dévoile rien.
 */
export function trouDevoileSaReponse(phrase: string, terme: string): boolean {
  if (!phrase.includes(TROU)) return false;

  const reste = mots(phrase.split(TROU).join(" "));

  return contient(reste, mots(terme));
}

/**
 * Un mot de la phrase d'origine, avec ses bornes, pour rendre une phrase et non
 * un verdict. Un caractère appartient à un mot dès qu'il survit à
 * `normaliserReponse` : mêmes coupes que `mots`.
 */
type MotSitue = { mot: string; debut: number; fin: number };

function motsSitues(texte: string): MotSitue[] {
  const situes: MotSitue[] = [];
  let debut = -1;
  let mot = "";

  for (let rang = 0; rang <= texte.length; rang += 1) {
    const lettre = rang < texte.length ? normaliserReponse(texte[rang] ?? "") : "";

    if (lettre === "") {
      if (debut >= 0) situes.push({ mot, debut, fin: rang });

      debut = -1;
      mot = "";
      continue;
    }

    if (debut < 0) debut = rang;
    mot += lettre;
  }

  return situes;
}

type Place = { debut: number; fin: number };

/**
 * Où le terme est écrit en clair dans la phrase, sans chevauchement. Le trou ne
 * porte aucune lettre : chaque place relevée est une occurrence de trop.
 */
function placesDuTerme(phrase: string, attendu: readonly string[]): Place[] {
  const situes = motsSitues(phrase);
  const places: Place[] = [];
  let depart = 0;

  while (depart + attendu.length <= situes.length) {
    const premier = situes[depart];
    const dernier = situes[depart + attendu.length - 1];
    const memeSuite = attendu.every((mot, rang) => situes[depart + rang]?.mot === mot);

    if (memeSuite && premier && dernier) {
      places.push({ debut: premier.debut, fin: dernier.fin });
      depart += attendu.length;
      continue;
    }

    depart += 1;
  }

  return places;
}

/**
 * La phrase dont les autres occurrences du terme sont masquées à leur tour.
 *
 * Réparé à la lecture, comme `trouSansRedite`, parce que les questions déjà en
 * base sont servies telles quelles. On masque plutôt que jeter : jeter coûterait
 * au concept le seul format qui force une récupération en mémoire (voir
 * `emplacement-du-trou.ts`).
 *
 * Si plus aucun mot ne restait visible, la phrase d'origine est rendue : deux
 * trous bout à bout ne sont pas une question. `controlerQuestion` la signale.
 */
export function phraseSansDevoilement(phrase: string, terme: string): string {
  if (!phrase.includes(TROU)) return phrase;

  const attendu = mots(terme);

  if (attendu.length === 0) return phrase;

  const places = placesDuTerme(phrase, attendu);

  if (places.length === 0) return phrase;

  let repare = phrase;

  // À l'envers, pour que les bornes pas encore traitées gardent leur sens.
  for (let rang = places.length - 1; rang >= 0; rang -= 1) {
    const place = places[rang];

    if (!place) continue;

    repare = `${repare.slice(0, place.debut)}${TROU}${repare.slice(place.fin)}`;
  }

  return mots(repare.split(TROU).join(" ")).length === 0 ? phrase : repare;
}
