import { lireLesSurcharges } from "@/lib/db/reglages";
import { assemblerLaConfig, type AiConfig } from "./config";

/**
 * La configuration réellement en vigueur : l'environnement, surchargé par ce que
 * l'écran d'administration a posé en base.
 *
 * Ce fichier existe pour que `config.ts` reste pur. Lui faire lire la base en
 * ferait un module qui touche aux données, et il est importé depuis `lib/db/` —
 * on y gagnerait un cycle. Ici, la dépendance ne va que dans un sens, et c'est le
 * même sens que `reservation.ts`, qui lit déjà les compteurs de quota en base.
 *
 * Rien n'est mis en cache, et c'est le point : couper les appels doit prendre
 * effet à l'appel suivant, pas à la prochaine expiration d'un cache. La requête
 * est une lecture d'une ligne par clé primaire, à côté de ce que `callAI()` fait
 * déjà pour réserver sa place.
 */
export async function lireLaConfigEffective(): Promise<AiConfig> {
  return assemblerLaConfig(await lireLesSurcharges());
}
