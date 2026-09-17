/**
 * Les hôtes des fournisseurs de modèle, pour les pièges sur `fetch` des scripts
 * `verifier:*`.
 *
 * La liste est écrite ici et non lue dans `lib/ai/fournisseurs` : le piège doit
 * être armé avant le premier import du code applicatif. Un pont ajouté sans être
 * listé ici laisserait une vérification émettre de vrais appels facturés.
 */
const HOTES = ["anthropic.com", "openrouter.ai"];

export function versUnFournisseurDeModele(url: string): boolean {
  return HOTES.some((hote) => url.includes(hote));
}
