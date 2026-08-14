import { tirageDe } from "./tirage-deterministe";

/**
 * Vraie ou fausse : c'est le serveur qui décide, question par question.
 *
 * Le banc du 14/08 a mesuré 110 affirmations fausses sur 125. Le prompt en
 * demandait « à peu près la moitié » depuis le début. Quelqu'un qui répond
 * « faux » sans lire réussissait donc 88 % d'un quart du produit, et FSRS lisait
 * ces réussites comme des preuves de mémorisation : le produit se mentait à
 * lui-même sur ce qu'une personne sait, ce qu'il est précisément censé mesurer.
 *
 * **C'est la quatrième propriété de distribution que ce projet essaie de tenir
 * par une consigne en prose**, après le plafond de concepts, la langue du dépôt
 * et la position de la bonne réponse d'un QCM. Aucune n'a tenu. Une consigne
 * locale et binaire — « celle-ci est vraie » — tient, parce qu'elle ne demande
 * pas de compter.
 *
 * La différence avec les QCM : là-bas le serveur permute des options déjà
 * écrites, ici il ne peut rien réécrire après coup — rendre vraie une
 * affirmation fausse demande de la reformuler. La décision part donc **avant**
 * l'appel, et la sortie est relue contre elle.
 *
 * Le tirage est déterministe et dérivé d'une graine, comme la permutation des
 * options et la géométrie du cairn : une même question ne change pas de cible
 * entre deux passages, et le rejeu du banc reste comparable.
 */

/**
 * La cible d'un lot : `true` si son affirmation doit être vraie.
 *
 * **Une valeur par concept, et surtout pas une par facette.** La première
 * version en annonçait trois dans l'envoi — « si tu écris un TRUE_FALSE sur ces
 * facettes… » — et le passage du 19h38 a montré que cette table se lisait comme
 * une invitation : `TRUE_FALSE` est monté de 25 % à 54 % des questions du
 * corpus, en emportant le texte à trou avec lui. La cible se lit maintenant
 * depuis la question qui porte effectivement le format, quelle qu'elle soit, et
 * l'envoi ne nomme plus aucune facette.
 *
 * La graine est l'id de l'Atom en production, le texte du concept au banc, qui
 * n'écrit rien en base et doit pouvoir comparer deux passages.
 */
export function cibleDuVraiOuFaux(graine: string): boolean {
  return tirageDe(graine)() < 0.5;
}
