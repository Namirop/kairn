/**
 * Combien de concepts se déclarent découler d'un voisin. **On le mesure, on ne
 * coupe pas.**
 *
 * Ce fichier a coupé pendant un passage de banc, et un seul a suffi. Le corpus
 * est tombé de 129 concepts à 85 : dix-huit dépôts sur vingt-deux ont baissé,
 * `20-narratif-historique` de six à un, `11-sigles-scientifiques` — qui porte
 * deux sujets sans le moindre rapport — de neuf à quatre. La sur-segmentation
 * qu'on voulait corriger coûtait sept concepts redondants sur tout le corpus.
 * Le remède en a détruit quarante-quatre.
 *
 * **L'analogie qui l'avait justifié était fausse.** On s'était dit que le modèle
 * qualifierait la relation comme il choisit un format dans une énumération, ce
 * qu'il fait très bien. Mais un `enum` est un ensemble fermé à appartenance
 * objective, alors que « ce concept découle-t-il de celui-là ? » est un jugement
 * relationnel à frontière floue — et le modèle place cette frontière beaucoup
 * plus loin que nous. Sur `09-fait-pratique`, il a rattaché six concepts sur
 * sept au premier : l'équidistance lue dans la légende « découlait » de la
 * définition d'une courbe de niveau.
 *
 * Resserrer la formulation déplacerait cette frontière sans qu'on sache où elle
 * atterrit, et chaque essai coûte un passage de banc. Le champ reste donc dans
 * le schéma et se relit — quelques tokens, et la donnée sous la main si on
 * reprend le sujet —, mais il ne décide plus de rien. La granularité redevient
 * une question de qualité, à traiter par un juge qui la mesure plutôt que par
 * une coupe qui tranche à notre place.
 */

export type Derivable = { deriveDe?: number | null };

/**
 * Un renvoi ne compte que s'il désigne un autre concept du même envoi.
 *
 * Les indices sont ceux annoncés au modèle, à partir de 1. Un renvoi à
 * soi-même, à zéro ou hors de la liste ne décrit aucune relation lisible, et ne
 * se compte donc pas : une mesure qui gonfle sur des valeurs illisibles ne
 * mesure plus rien.
 */
function renvoieAUnAutre(concept: Derivable, rang: number, total: number): boolean {
  const cible = concept.deriveDe ?? null;

  if (cible === null || !Number.isInteger(cible)) return false;

  return cible >= 1 && cible <= total && cible !== rang + 1;
}

export function compterLesDerives(concepts: readonly Derivable[]): number {
  return concepts.filter((concept, rang) => renvoieAUnAutre(concept, rang, concepts.length)).length;
}
