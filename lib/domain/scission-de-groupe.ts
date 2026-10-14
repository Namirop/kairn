/**
 * Couper en deux un groupe de concepts dont la sortie a buté sur `max_tokens`.
 *
 * La réponse coupée n'est pas exploitable, et la rejouer à l'identique
 * redemande la même chose trop longue : seule une reprise qui demande moins peut
 * finir autrement. La plus grande moitié reste au job qui a échoué, l'autre part
 * dans un job neuf.
 *
 * `null` pour un concept seul : c'est un vrai échec, qui demande de relever le
 * plafond de jetons.
 */

export type GroupeScinde = {
  /** Ce que le job garde. Jamais vide, et toujours plus court que le groupe. */
  garde: string[];
  /** Ce qui part dans un job neuf. Jamais vide. */
  reporte: string[];
};

export function scinderLeGroupe(atomIds: string[]): GroupeScinde | null {
  if (atomIds.length < 2) return null;

  // Sur un groupe impair, le job déjà là garde le concept de plus. L'ordre du
  // groupe est conservé : c'est lui que le modèle numérote.
  const coupe = Math.ceil(atomIds.length / 2);

  return { garde: atomIds.slice(0, coupe), reporte: atomIds.slice(coupe) };
}
