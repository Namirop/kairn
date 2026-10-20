import { ConfigIaInvalideError } from "./errors";
import { lireLaConfigEffective } from "./reglages-effectifs";
import type { ConfigIa } from "./config";

/**
 * Pour l'écran d'administration seulement : une variable manquante ne doit pas
 * faire tomber la page où l'on vient chercher la panne. Sur le chemin d'un
 * appel, une configuration illisible reste une erreur levée.
 */
export type ConfigDiagnostiquee =
  { lisible: true; config: ConfigIa } | { lisible: false; motif: string };

export async function diagnostiquerLaConfig(): Promise<ConfigDiagnostiquee> {
  try {
    return { lisible: true, config: await lireLaConfigEffective() };
  } catch (erreur) {
    // Une base injoignable remonte : elle ne doit pas passer pour un réglage à corriger.
    if (!(erreur instanceof ConfigIaInvalideError)) throw erreur;

    console.error("Configuration du modèle illisible", {
      code: erreur.code,
      motif: erreur.message,
    });

    return { lisible: false, motif: erreur.message };
  }
}
