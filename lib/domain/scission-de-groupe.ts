/**
 * Un groupe dont la sortie a buté sur `max_tokens` : le rejouer redemanderait la
 * même chose trop longue, seule une reprise qui demande moins peut finir. `null`
 * pour un concept seul, vrai échec qui demande de relever le plafond.
 */

export type GroupeScinde = {
  /** Reste au job qui a échoué. Jamais vide, toujours plus court que le groupe. */
  garde: string[];
  /** Part dans un job neuf. Jamais vide. */
  reporte: string[];
};

export function scinderLeGroupe(atomIds: string[]): GroupeScinde | null {
  if (atomIds.length < 2) return null;

  // L'ordre est conservé : c'est lui que le modèle numérote.
  const coupe = Math.ceil(atomIds.length / 2);

  return { garde: atomIds.slice(0, coupe), reporte: atomIds.slice(coupe) };
}
