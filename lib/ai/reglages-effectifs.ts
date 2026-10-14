import { lireLesSurcharges } from "@/lib/db/reglages";
import { assemblerLaConfig, type AiConfig } from "./config";

/**
 * La configuration réellement en vigueur : l'environnement, surchargé par ce que
 * l'écran d'administration a posé en base.
 *
 * Séparé pour que `config.ts` reste pur : il est importé depuis `lib/db/`, et
 * lui faire lire la base créerait un cycle.
 *
 * Rien n'est mis en cache : couper les appels doit prendre effet à l'appel
 * suivant. La requête est une lecture par clé primaire.
 */
export async function lireLaConfigEffective(): Promise<AiConfig> {
  return assemblerLaConfig(await lireLesSurcharges());
}
