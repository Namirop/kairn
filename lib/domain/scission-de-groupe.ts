/**
 * Couper en deux un groupe de concepts dont la sortie n'a pas tenu.
 *
 * Un appel de questions porte trois concepts, et la longueur de sa réponse est
 * à peu près proportionnelle à ce nombre. Quand elle bute sur `max_tokens`, la
 * réponse est coupée au milieu d'une question et rien n'en est exploitable :
 * c'est un échec entier, pas un résultat partiel. Le rejouer à l'identique
 * revient à demander deux fois la même chose trop longue.
 *
 * La seule reprise qui ait une chance de finir autrement est donc celle qui
 * demande moins. On coupe, la moitié la plus grande reste au job qui vient
 * d'échouer, l'autre part dans un job neuf.
 *
 * `null` quand il n'y a rien à couper : un concept seul qui déborde ne se
 * découpe pas plus, et c'est un vrai échec — pour lui, il faut relever le
 * plafond de jetons, ce qu'aucun code ne peut décider tout seul.
 */

export type GroupeScinde = {
  /** Ce que le job garde. Jamais vide, et toujours plus court que le groupe. */
  garde: string[];
  /** Ce qui part dans un job neuf. Jamais vide. */
  reporte: string[];
};

export function scinderLeGroupe(atomIds: string[]): GroupeScinde | null {
  if (atomIds.length < 2) return null;

  // La moitié haute reste : sur un groupe impair, c'est le job déjà là qui
  // porte le concept de plus. L'ordre est celui du groupe, parce que c'est lui
  // que le modèle a numéroté — le couper ailleurs qu'à une frontière de rang
  // rendrait les rangs incomparables d'un essai à l'autre.
  const coupe = Math.ceil(atomIds.length / 2);

  return { garde: atomIds.slice(0, coupe), reporte: atomIds.slice(coupe) };
}
