import { normaliserReponse, TROU } from "./reponse-cloze";

/**
 * Le terme masqué qu'on peut lire ailleurs dans sa phrase, où il suffit de
 * recopier (`bord-du-trou.ts` traite les mots collés au trou). On compare avec
 * `normaliserReponse`, celle qui note : recopier serait-il compté juste ?
 */

function mots(texte: string): string[] {
  return normaliserReponse(texte).split(" ").filter(Boolean);
}

/** Le terme entier : un « sommeil » seul ne dévoile pas « sommeil paradoxal ». */
function contient(meule: readonly string[], aiguille: readonly string[]): boolean {
  if (aiguille.length === 0 || aiguille.length > meule.length) return false;

  return meule.some(
    (_, depart) =>
      depart + aiguille.length <= meule.length &&
      aiguille.every((mot, rang) => meule[depart + rang] === mot),
  );
}

export function trouDevoileSaReponse(phrase: string, terme: string): boolean {
  if (!phrase.includes(TROU)) return false;

  const reste = mots(phrase.split(TROU).join(" "));

  return contient(reste, mots(terme));
}

/** Un mot avec ses bornes dans l'original ; mêmes coupes que `mots`. */
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

/** Sans chevauchement. Le trou ne porte aucune lettre : chaque place est de trop. */
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
 * Réparé à la lecture, pour couvrir les questions déjà en base. On masque
 * plutôt que jeter : ce format est le seul qui force une récupération en
 * mémoire (`emplacement-du-trou.ts`). Si plus rien ne reste visible, la phrase
 * d'origine est rendue, et `controlerQuestion` la signale.
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
