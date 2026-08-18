/**
 * L'identité de l'espace dans lequel tout se compare.
 *
 * Un fichier pour deux déclarations, parce que le client d'embeddings et le
 * cache en ont besoin tous les deux et qu'ils ne doivent pas s'importer l'un
 * l'autre. Mais surtout parce que **c'est la constante qui donne un sens aux
 * seuils** : deux modèles produisent des espaces incompatibles, et un plancher
 * calibré dans l'un ne veut rien dire dans l'autre.
 *
 * Changer cette ligne périme tous les seuils calibrés et tout le cache. Le nom
 * est écrit dans chaque rapport pour que ça ne puisse pas passer inaperçu.
 */

export const MODELE_EMBEDDING = "voyage-3.5-lite";

export type Vecteur = number[];
