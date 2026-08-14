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
 * Les facettes où une affirmation vraie ou fausse peut atterrir.
 *
 * Miroir de la table des formats de `lib/ai/schemas/generate-variants-question.ts` :
 * `TRUE_FALSE` est ouvert aux trois facettes vérifiables et fermé sur
 * `MECHANISM`, qui garde le texte libre. `lib/domain/` ne peut pas importer
 * `lib/ai/` — le sens des dépendances l'interdit —, donc la table est recopiée
 * ici et un test l'aligne sur le schéma.
 */
export const FACETTES_DU_VRAI_OU_FAUX = ["recognition", "boundary", "application"] as const;

export type FacetteDuVraiOuFaux = (typeof FACETTES_DU_VRAI_OU_FAUX)[number];

/**
 * La cible d'une question : `true` si l'affirmation doit être vraie.
 *
 * La graine porte déjà la facette — `<id de l'Atom>:BOUNDARY` en production,
 * `<texte du concept>:BOUNDARY` au banc, qui n'écrit rien en base. Deux
 * questions du même concept tirent donc indépendamment.
 */
export function cibleDuVraiOuFaux(graine: string): boolean {
  return tirageDe(graine)() < 0.5;
}

/** Ce qui se dit au modèle : la cible de chaque facette qui peut la porter. */
export function ciblesDuLot(graine: string): { facette: FacetteDuVraiOuFaux; vraie: boolean }[] {
  return FACETTES_DU_VRAI_OU_FAUX.map((facette) => ({
    facette,
    vraie: cibleDuVraiOuFaux(`${graine}:${facette.toUpperCase()}`),
  }));
}
