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
