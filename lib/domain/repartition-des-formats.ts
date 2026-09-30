/**
 * Comment une session choisit, parmi ce que la rotation lui laisse, de quoi
 * varier les gestes de sa journée.
 *
 * **Le défaut qu'elle corrige se voyait sur deux jours.** Une session entière
 * tombait sur des textes à trou et des QCM le lundi, sur des explications le
 * mardi, et pas un seul vrai ou faux dans les deux. Ce n'était pas un hasard :
 * la rotation choisit concept par concept, sans rien savoir des onze autres, et
 * quand tout est à égalité — le cas de tous les concepts d'un compte neuf —
 * c'était l'identifiant qui tranchait. Or les quatre variantes d'un concept
 * naissent d'un même `createMany`, donc « le plus petit identifiant » désigne
 * partout la même position dans le lot : douze concepts servaient la même
 * facette, et la même facette sert souvent la même famille de format.
 *
 * **On ne touche pas à la rotation pour autant.** Elle continue de dire quelles
 * variantes sont également bonnes — facette la moins servie, la plus ancienne à
 * égalité —, et ce module ne choisit qu'à l'intérieur de cet ensemble. On
 * remplace donc un départage qui ne voulait rien dire par un qui dit quelque
 * chose ; on n'affaiblit aucune règle de mémoire, parce qu'il n'y en avait pas
 * là où l'identifiant décidait.
 *
 * Le format passe avant la facette parce que c'est lui qui se voit : personne ne
 * lit « BOUNDARY » à l'écran, tout le monde sent qu'on lui demande de choisir
 * pour la cinquième fois d'affilée. La facette départage ensuite, l'ordre reçu
 * en dernier.
 *
 * Deux fois la même entrée rend deux fois la même sortie : rien ici n'est tiré
 * au hasard, et c'est ce qui permet à la session de se recomposer à l'identique
 * si on la recharge.
 */

import { gesteDeReponse, type GesteDeReponse } from "./geste-de-reponse";

/**
 * Ce que coûte une question, compté en questions.
 *
 * **Égaliser les formats revenait à promouvoir le plus lourd.** Sur les trois
 * semaines qui précèdent le 30 septembre 2026, l'explication faisait 14,7 % des
 * questions vivantes de la production et 22,8 % de celles réellement servies en
 * session. Le mécanisme est ici : sur un concept neuf les quatre facettes sont à
 * égalité, ce module a donc les quatre formats sous la main à chaque tour, et il
 * les tire vers le quart chacun — ce qui remonte l'explication de 15 % à 25 % et
 * fait redescendre le QCM d'autant. Personne n'avait demandé cette promotion :
 * elle tombait de « le moins servi gagne », appliqué à des formats qui ne
 * demandent pas le même effort.
 *
 * Or trois explications dans une session de douze, ce n'est pas trois questions
 * de plus : c'est trois fois formuler de tête, révéler l'étalon, et se noter
 * soi-même. Le produit le sait déjà ailleurs — un lot de quatre questions ne
 * porte qu'une seule question à s'auto-noter, et l'écran de session alterne les
 * gestes plutôt que les formats.
 *
 * Une question qu'on se note soi-même compte donc double. À l'équilibre, elle
 * retombe autour de 14 % : la répartition cesse de la promouvoir, sans jamais la
 * supprimer. C'est la part qu'elle occupe dans ce qui a été écrit, et c'est la
 * bonne cible — ce module répartit ce qui existe, il ne décide pas de ce qui
 * s'écrit.
 */
const COUT: Record<GesteDeReponse, number> = { CHOISIR: 1, SAISIR: 1, FORMULER: 2 };

function coutDe(format: string): number {
  return COUT[gesteDeReponse(format)];
}

/** Le strict nécessaire pour répartir : ce qui se voit, et ce qui se compte. */
export type VarianteRepartissable = {
  id: string;
  format: string;
  facet: string;
};

/**
 * Ce qu'un concept propose, dans l'ordre où la rotation les a rendues.
 *
 * Un tableau vide est un concept sans question servable ; il ressort tel quel,
 * pour que l'appelant garde l'alignement avec sa propre liste.
 */
export type ChoixDunConcept<T extends VarianteRepartissable> = T[];

function moinsServi<T extends VarianteRepartissable>(
  candidates: T[],
  formats: Map<string, number>,
  facettes: Map<string, number>,
): T | undefined {
  return candidates.reduce<T | undefined>((meilleure, candidate) => {
    if (!meilleure) return candidate;

    const parFormat = (formats.get(candidate.format) ?? 0) - (formats.get(meilleure.format) ?? 0);

    if (parFormat !== 0) return parFormat < 0 ? candidate : meilleure;

    const parFacette = (facettes.get(candidate.facet) ?? 0) - (facettes.get(meilleure.facet) ?? 0);

    // À égalité sur les deux, l'ordre de la rotation garde la main : c'est le
    // seul critère de ce fichier qui vienne d'ailleurs, et il est déjà stable.
    return parFacette < 0 ? candidate : meilleure;
  }, undefined);
}

/**
 * Une variante par concept, choisies pour que la session ne se répète pas.
 *
 * Glouton, et assumé : on prend les concepts dans l'ordre reçu et chacun sert le
 * format le moins vu jusque-là. Un optimum global demanderait une affectation
 * complète pour un gain que personne ne verrait — l'écart entre « trois QCM sur
 * douze » et « deux QCM sur douze » ne se ressent pas, l'écart entre « douze » et
 * « trois » se ressent tout de suite.
 *
 * L'ordre reçu compte donc, et il doit être stable d'un appel à l'autre : c'est
 * à l'appelant de le fixer, pas à la base de le décider.
 */
export function repartirLesFormats<T extends VarianteRepartissable>(
  choix: ChoixDunConcept<T>[],
): (T | undefined)[] {
  const formats = new Map<string, number>();
  const facettes = new Map<string, number>();

  return choix.map((candidates) => {
    const retenue = moinsServi(candidates, formats, facettes);

    if (!retenue) return undefined;

    // Le format se compte en effort, la facette à l'unité : une facette n'est ni
    // plus ni moins fatigante qu'une autre, c'est un angle.
    formats.set(retenue.format, (formats.get(retenue.format) ?? 0) + coutDe(retenue.format));
    facettes.set(retenue.facet, (facettes.get(retenue.facet) ?? 0) + 1);

    return retenue;
  });
}
