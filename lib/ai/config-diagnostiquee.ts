import { AIConfigError } from "./errors";
import { lireLaConfigEffective } from "./reglages-effectifs";
import type { AiConfig } from "./config";

/**
 * La configuration effective, ou la raison pour laquelle elle ne se lit pas.
 *
 * Pour l'écran d'administration seulement, qui regarde sans émettre : une
 * variable manquante ne doit pas y faire tomber la page où l'on vient chercher
 * la panne. L'erreur est montrée et journalisée. Sur le chemin d'un appel au
 * modèle, une configuration illisible doit rester une erreur levée.
 */
export type ConfigDiagnostiquee =
  { lisible: true; config: AiConfig } | { lisible: false; motif: string };

export async function diagnostiquerLaConfig(): Promise<ConfigDiagnostiquee> {
  try {
    return { lisible: true, config: await lireLaConfigEffective() };
  } catch (erreur) {
    // Seule une configuration refusée se montre : une base injoignable remonte,
    // pour ne pas passer pour un réglage à corriger.
    if (!(erreur instanceof AIConfigError)) throw erreur;

    console.error("Configuration du modèle illisible", {
      code: erreur.code,
      motif: erreur.message,
    });

    return { lisible: false, motif: erreur.message };
  }
}
