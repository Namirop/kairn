/**
 * Le modèle des juges : Haiku, pas le modèle d'extraction. Un juge ne cherche
 * ni ne compose, il tranche sur un candidat déjà trouvé ; Sonnet coûterait
 * trois fois plus pour la même réponse.
 *
 * Son nom est écrit dans chaque rapport : un verdict ne vaut rien si l'on
 * ignore qui l'a rendu. Un juge de la même famille reste acceptable parce que
 * les candidats viennent de la géométrie, sans prior du modèle ; une conclusion
 * définitive demanderait un juge d'un autre fournisseur.
 *
 * L'alias sans date est la clé du catalogue de `lib/domain/tarifs.ts` : une
 * version datée tomberait sur le tarif par défaut, cinq fois plus cher.
 */
export const MODELE_DES_JUGES = "claude-haiku-4-5";

/**
 * De quoi rendre un verdict motivé par candidat sur le plus gros dépôt du
 * corpus, une vingtaine de concepts (`23-pave-maximal`). Un dépôt qui
 * approcherait `PLAFOND_CONCEPTS_PAR_DEPOT` (50) obligerait à le revoir.
 */
export const TOKENS_DES_JUGES = 4000;

/** Un motif tient en une ligne : c'est une justification, pas une dissertation. */
export const MOTIF_MAXIMUM = 240;
