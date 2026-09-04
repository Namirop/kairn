/**
 * Combien de concepts un seul dépôt peut donner, et ce qui arrive au reste.
 *
 * Le principe, qui vaut bien au-delà de ce fichier :
 *
 * > **Une contrainte que la grammaire ne fait pas respecter ne doit jamais
 * > pouvoir faire échouer un appel déjà payé.** On la traite en tronquant,
 * > jamais en rejetant.
 *
 * Le banc du 14/08 a montré ce que coûtait l'inverse. Le schéma portait
 * `.max(12)` sur le tableau des concepts, le prompt disait « au-delà de douze,
 * garde les douze plus importants », et sur un texte dense le modèle en a rendu
 * dix-huit. Zod a refusé la sortie entière : zéro concept, appel payé, dépôt
 * perdu. Ce n'était pas une troncature silencieuse, c'était une perte totale.
 *
 * La raison est dans `lib/ai/output-schema.ts` : les mots-clés qui bornent une
 * valeur partent en description, où le modèle les lit comme des indications.
 * Seuls `type`, `enum`, `const`, `required` et `minItems` à 0 ou 1 sont
 * réellement tenus. Un `.max()` n'est donc pas une limite, c'est un vœu — et un
 * vœu ne doit pas avoir le pouvoir de tout jeter.
 *
 * **La coupe emporte la fin du texte, et il faut le savoir.** Le prompt a
 * longtemps demandé un classement par importance, pour que couper la queue ne
 * perde rien d'essentiel. Mesuré le 04/09/2026 sur le seul dépôt tronqué de la
 * production : dix-huit des vingt concepts gardés se suivaient dans l'ordre exact
 * du texte, et le dernier tombait à 87 % de sa longueur. Le modèle rendait
 * l'ordre de lecture, jamais un classement.
 *
 * La consigne a été retirée plutôt que renforcée — une propriété de distribution
 * tenue par de la prose n'a jamais tenu sur ce projet, cinq fois sur cinq. Ce
 * plafond coupe donc **positionnellement**, l'écran le dit ainsi, et la seule
 * défense qui reste est de le poser assez haut pour qu'il ne coupe pas.
 */

/**
 * Le plafond, et pourquoi il vaut cinquante.
 *
 * **Ce n'est plus une limite de produit, c'est une soupape.** Tant qu'il coupe,
 * il coûte à l'utilisateur ce qu'aucun message ne rattrape : des concepts perdus,
 * et la charge de retrouver où couper son texte pour récupérer le reste. La seule
 * bonne valeur est donc celle qui ne se déclenche pas.
 *
 * La borne réelle d'un dépôt est sa longueur : 8 000 signes. Sur le seul dépôt
 * qui a touché le plafond en production — 7 431 signes —, le modèle a rendu
 * **22 concepts**, soit 338 signes par concept. Atteindre cinquante depuis
 * 8 000 signes demanderait 160 signes par concept sur toute la longueur : c'est
 * la densité des dépôts d'une phrase, pas celle d'un article.
 *
 * Ce qui reste couvert : une extraction qui part en vrille sur un texte
 * pathologique — une liste de deux cents entrées, un glossaire — où le modèle
 * rendrait quatre-vingts concepts et ouvrirait autant de questions à écrire.
 * C'est de l'abus, pas de l'usage, et c'est le métier de ce plafond-là.
 *
 * Il vaut le plafond mensuel du plan gratuit, et ce n'est pas une coïncidence :
 * un dépôt ne peut pas, à lui seul, dépasser ce qu'un compte gratuit retient
 * dans le mois. Les deux se changent ensemble ou la règle se perd.
 */
export const PLAFOND_CONCEPTS_PAR_DEPOT = 50;

export type Troncature<T> = {
  /** Ce qu'on garde, dans l'ordre rendu. */
  gardes: T[];
  /** Ce que le modèle avait rendu. Va au journal, jamais à l'écran. */
  rendus: number;
  tronque: boolean;
};

/**
 * Le plafond appliqué à une liste de concepts.
 *
 * `rendus` est conservé même quand rien n'est coupé : c'est le nombre qui dira,
 * sur des dépôts réels, si 20 est le bon palier. On ne le saura pas autrement.
 */
export function appliquerLePlafond<T>(
  concepts: readonly T[],
  plafond: number = PLAFOND_CONCEPTS_PAR_DEPOT,
): Troncature<T> {
  return {
    gardes: concepts.slice(0, plafond),
    rendus: concepts.length,
    tronque: concepts.length > plafond,
  };
}
