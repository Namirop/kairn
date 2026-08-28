import { tirageDe } from "./tirage-deterministe";

/**
 * Le coup de pouce d'un texte à trou : ce qu'on montre, et ce qu'il coûte.
 *
 * **Pourquoi il existe.** Le texte à trou est le seul format qui demande de
 * produire la réponse au lieu de la reconnaître, et c'est pour ça qu'il tient le
 * mieux en mémoire. C'est aussi ce qui le rend parfois infranchissable : on a le
 * concept en tête, le terme exact ne vient pas, et il ne reste qu'à cliquer
 * « je ne l'avais pas » sur quelque chose qu'on savait à moitié. Le passage
 * enregistre alors un échec complet là où il y avait un rappel partiel, et
 * l'espacement se règle sur une information fausse.
 *
 * Trois ou quatre pistes rendent le trou franchissable sans le rendre gratuit :
 * on ne donne pas la réponse, on réduit le champ. C'est encore un rappel — plus
 * facile, et compté comme tel.
 *
 * **Ce que ça coûte, et c'est le point.** Une aide demandée fait descendre la
 * note d'un cran. Sans ce prix, l'aide serait le geste par défaut : on cliquerait
 * dessus par confort, la mémoire enregistrerait des réussites qui n'en sont pas,
 * et le produit se mentirait à lui-même — exactement ce que l'ordre des options
 * d'un QCM corrige de l'autre côté.
 */

/** Au-delà, on ne réduit plus le champ, on donne une liste à parcourir. */
const PISTES_MAXIMUM = 4;

/**
 * En deçà, la piste **est** la réponse.
 *
 * Deux propositions dont l'une est juste, c'est un vrai ou faux déguisé qu'on
 * gagne une fois sur deux sans rien savoir. On ne propose donc rien tant qu'il
 * n'y a pas au moins deux leurres à mettre à côté du terme attendu.
 */
const PISTES_MINIMUM = 3;

/** Minuscules, sans accents : deux formes du même mot ne s'affichent pas deux fois. */
function aplati(terme: string): string {
  return terme.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Les termes proposés à qui sèche, dans un ordre stable.
 *
 * Le terme attendu est mélangé aux leurres par un tirage dérivé de la graine —
 * l'identifiant de la question —, pour la même raison que l'ordre des options
 * d'un QCM : sans ça, il serait toujours au même rang et se repérerait sans être
 * su. Stable, parce qu'une même question doit se présenter pareil d'un
 * affichage à l'autre.
 *
 * Un leurre qui redit le terme attendu est retiré : il ferait deux bonnes
 * réponses dans la liste, et l'aide se retournerait contre celui qui la demande.
 * Vide quand il n'y a pas de quoi réduire honnêtement le champ.
 */
export function pistesDuTrou(
  attendu: string,
  leurres: readonly string[],
  graine: string,
): string[] {
  const propre = attendu.trim();

  if (propre.length === 0) return [];

  const vus = new Set([aplati(propre)]);
  const retenus = [propre];

  for (const leurre of leurres) {
    const candidat = leurre.trim();

    if (candidat.length === 0 || vus.has(aplati(candidat))) continue;

    vus.add(aplati(candidat));
    retenus.push(candidat);

    if (retenus.length === PISTES_MAXIMUM) break;
  }

  if (retenus.length < PISTES_MINIMUM) return [];

  const tirage = tirageDe(graine);
  const restants = [...retenus];
  const ordre: string[] = [];

  while (restants.length > 0) {
    ordre.push(...restants.splice(Math.floor(tirage() * restants.length), 1));
  }

  return ordre;
}

/**
 * La note d'un passage, une fois le coup de pouce pris en compte.
 *
 * Un cran plus bas, et un seul : retrouver le terme parmi quatre reste un
 * rappel, il est juste plus facile que de le produire de rien. « Je ne l'avais
 * pas » ne descend plus — c'est déjà le bas de l'échelle.
 *
 * `EASY` n'apparaît pas sur ce format : il est réservé à la sortie du cycle, où
 * la personne déclare maîtriser le concept, et on ne déclare pas ça après avoir
 * demandé de l'aide. On le fait quand même descendre, parce qu'une fonction qui
 * laisse passer un cas qu'elle ne connaît pas finit par le laisser passer le
 * jour où il arrive.
 */
export type NoteDeTrou = "AGAIN" | "HARD" | "GOOD" | "EASY";

const UN_CRAN_PLUS_BAS: Record<NoteDeTrou, NoteDeTrou> = {
  EASY: "GOOD",
  GOOD: "HARD",
  HARD: "AGAIN",
  AGAIN: "AGAIN",
};

export function noteApresAide(note: NoteDeTrou, aideDemandee: boolean): NoteDeTrou {
  return aideDemandee ? UN_CRAN_PLUS_BAS[note] : note;
}
