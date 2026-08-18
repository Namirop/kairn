/**
 * Le modèle des juges, et ce qu'on lui accorde.
 *
 * Haiku, et non le modèle d'extraction. Ce ne sont pas des tâches de même
 * nature : un juge reçoit un candidat déjà trouvé et rend un booléen avec un
 * motif court. Il ne cherche pas, il ne compose pas, il tranche. Faire tourner
 * ça sur Sonnet coûterait trois fois plus pour la même réponse.
 *
 * **Le nom est écrit dans chaque rapport**, au même titre que le modèle
 * d'embedding. Un verdict ne veut rien dire si l'on ignore qui l'a rendu, et le
 * jour où l'on conclura définitivement, il faudra refaire un passage avec un
 * juge d'un autre fournisseur. En attendant, un juge de la même famille sur des
 * candidats trouvés par géométrie vaut mieux que pas de mesure : les candidats
 * ne portent aucun prior du modèle, seule la décision finale en porte un.
 *
 * L'alias sans date est délibéré : c'est la clé que connaît le catalogue de
 * tarifs de `lib/domain/tarifs.ts`. Une version datée y tomberait sur le tarif
 * par défaut, le plus cher de la table, et la dépense du banc serait
 * surestimée d'un facteur cinq.
 */
export const MODELE_DES_JUGES = "claude-haiku-4-5";

/**
 * De quoi rendre un verdict par candidat sur le plus gros lot.
 *
 * `23-pave-maximal` porte vingt concepts ; un dépôt peut donc présenter une
 * vingtaine de candidats au même juge, chacun avec son motif. Explicite, comme
 * partout ailleurs — jamais laissé au défaut du SDK.
 */
export const TOKENS_DES_JUGES = 4000;

/** Un motif tient en une ligne : c'est une justification, pas une dissertation. */
export const MOTIF_MAXIMUM = 240;
