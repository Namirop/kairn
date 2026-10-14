/**
 * L'espace dans lequel tout se compare, à part pour que le client
 * d'embeddings et le cache n'aient pas à s'importer l'un l'autre.
 *
 * Changer de modèle périme tous les seuils calibrés et tout le cache : deux
 * modèles produisent des espaces incompatibles. Le nom est écrit dans chaque
 * rapport pour que ça ne passe pas inaperçu.
 */

export const MODELE_EMBEDDING = "voyage-3.5-lite";

export type Vecteur = number[];
