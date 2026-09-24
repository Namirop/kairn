import { normaliserReponse, TROU } from "./reponse-cloze";

/**
 * Le terme masqué qu'on peut lire ailleurs dans sa propre phrase.
 *
 * « Dans « es \_\_\_ », la phrase signifie qu'il est ennuyeux, tandis que
 * « está **aburrido** » signifie qu'il s'ennuie. », terme attendu « aburrido ».
 * Il est écrit en clair six mots plus loin : le trou ne demande plus de savoir
 * quoi que ce soit, il demande de recopier.
 *
 * `bord-du-trou.ts` regarde déjà les mots **collés** au trou, parce que ceux-là
 * cassent aussi la comparaison et l'affichage. Celui-ci regarde le reste de la
 * phrase, où il n'y a rien de cassé : la question marche, elle ne teste
 * simplement plus rien. Deux dégâts différents, deux mesures.
 *
 * Le prompt porte la consigne depuis longtemps — « vérifie qu'on ne pourrait pas
 * le retrouver en lisant seulement le reste de la phrase » —, et rien ne disait
 * si elle prenait. C'est le rôle de ce module : mesurer, pas couper. Une question
 * dévoilée reste servie, elle ne vaut juste pas grand-chose, et une consigne dont
 * on ne mesure pas l'effet finit par ne plus en avoir.
 *
 * La comparaison passe par `normaliserReponse`, celle qui note les réponses : ce
 * qu'on cherche à savoir, c'est si quelqu'un pourrait recopier la phrase et être
 * compté juste. C'est donc sa notion d'identité qui décide, pas une autre.
 */

/** Les mots d'un texte, normalisés comme une réponse. Vide si le texte l'est. */
function mots(texte: string): string[] {
  return normaliserReponse(texte).split(" ").filter(Boolean);
}

/**
 * La suite `aiguille` apparaît-elle telle quelle dans `meule` ?
 *
 * Mot à mot et dans l'ordre : c'est **le terme entier** qu'on cherche, pas un de
 * ses mots. « Le \_\_\_ occupe les derniers cycles de sommeil », terme « sommeil
 * paradoxal » — « sommeil » se répète, « paradoxal » non, et c'est lui qui porte
 * la réponse. Rien n'est dévoilé.
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
 *
 * Le trou lui-même est retiré avant la recherche : c'est la place du terme, pas
 * une occurrence de plus. Une phrase sans trou ne dévoile rien — il n'y a rien à
 * deviner.
 */
export function trouDevoileSaReponse(phrase: string, terme: string): boolean {
  if (!phrase.includes(TROU)) return false;

  const reste = mots(phrase.split(TROU).join(" "));

  return contient(reste, mots(terme));
}

/**
 * Un mot de la phrase d'origine, avec ses bornes.
 *
 * `mots` plus haut normalise la phrase entière et perd les positions ; ici on
 * les garde, parce qu'on va rendre une phrase et non un verdict. Un caractère
 * appartient à un mot dès qu'il survit à `normaliserReponse` — même notion
 * d'identité, donc mêmes coupes.
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
 * Où le terme est écrit en clair dans la phrase, sans chevauchement.
 *
 * Le trou n'en fait jamais partie : trois soulignés ne portent aucune lettre,
 * donc aucun mot ne s'y trouve. Ce qu'on relève est donc toujours une
 * occurrence **de trop**.
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
 * **Réparé à la lecture**, comme `trouSansRedite`, et pour la même raison : les
 * questions déjà en base sont servies telles quelles, et deux d'entre elles ont
 * été posées le 23 septembre 2026 sur un même dépôt — « \_\_\_ et Java utilisent
 * la même plateforme, mais Kotlin n'est pas le même langage que Java », « Google
 * recommande \_\_\_ pour Android depuis 2019 avec l'approche « Kotlin first » ».
 * Dans les deux cas il n'y avait qu'à recopier six mots plus loin.
 *
 * Masquer les autres occurrences plutôt que jeter la question : c'est la forme
 * normale du texte à trou, le terme ne s'écrit qu'une fois, et la phrase
 * redevient une question au lieu d'être un exercice de copie. La jeter aurait
 * coûté à ce concept le seul format du produit qui force une récupération en
 * mémoire — voir `emplacement-du-trou.ts`.
 *
 * Une phrase dont il ne resterait plus un mot visible n'est pas réparée : deux
 * trous bout à bout ne sont pas une question, et on préfère alors la phrase
 * dévoilée. `controlerQuestion` la signale dans les deux cas.
 */
export function phraseSansDevoilement(phrase: string, terme: string): string {
  if (!phrase.includes(TROU)) return phrase;

  const attendu = mots(terme);

  if (attendu.length === 0) return phrase;

  const places = placesDuTerme(phrase, attendu);

  if (places.length === 0) return phrase;

  let repare = phrase;

  // Les places se lisent dans l'ordre de la phrase ; on remplace à l'envers
  // pour que les bornes pas encore traitées gardent leur sens.
  for (let rang = places.length - 1; rang >= 0; rang -= 1) {
    const place = places[rang];

    if (!place) continue;

    repare = `${repare.slice(0, place.debut)}${TROU}${repare.slice(place.fin)}`;
  }

  return mots(repare.split(TROU).join(" ")).length === 0 ? phrase : repare;
}
