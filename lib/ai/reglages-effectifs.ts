import { lireLesSurcharges } from "@/lib/db/reglages";
import { assemblerLaConfig, type ConfigIa } from "./config";

/**
 * À part de `config.ts`, importé depuis `lib/db/` : lui faire lire la base créerait
 * un cycle. Sans cache pour qu'une coupure prenne effet à l'appel suivant ; la
 * requête est une lecture par clé primaire.
 */
export async function lireLaConfigEffective(): Promise<ConfigIa> {
  return assemblerLaConfig(await lireLesSurcharges());
}
