import { AIConfigError } from "./errors";
import { lireLaConfigEffective } from "./reglages-effectifs";
import type { AiConfig } from "./config";

/**
 * La configuration effective, ou la raison pour laquelle elle ne se lit pas.
 *
 * `lireLaConfigEffective()` lève, et c'est bien : `callAI()` doit refuser
 * d'émettre sur une configuration absurde plutôt que de deviner un plafond. Mais
 * l'écran d'administration n'émet rien, il *regarde* — et une variable
 * manquante y faisait tomber toute la page, c'est-à-dire précisément l'endroit
 * où l'on vient chercher ce qui ne va pas. Le nom de la variable fautive
 * partait alors dans les journaux de l'hébergeur, et nulle part ailleurs.
 *
 * L'erreur n'est donc pas avalée : elle change de destination. Elle est montrée
 * à l'écran plutôt que levée, et journalisée au passage pour rester visible
 * depuis l'extérieur. Rien d'autre n'a le droit d'appeler ceci — sur le chemin
 * d'un appel au modèle, une configuration illisible doit rester une erreur.
 */
export type ConfigDiagnostiquee =
  { lisible: true; config: AiConfig } | { lisible: false; motif: string };

export async function diagnostiquerLaConfig(): Promise<ConfigDiagnostiquee> {
  try {
    return { lisible: true, config: await lireLaConfigEffective() };
  } catch (erreur) {
    // Seule une configuration refusée se montre. Une base injoignable pendant la
    // lecture des surcharges est une panne d'un autre ordre, qui doit continuer
    // de remonter : la déguiser en « réglage à corriger » enverrait chercher
    // pendant une heure une variable qui n'a rien.
    if (!(erreur instanceof AIConfigError)) throw erreur;

    console.error("Configuration du modèle illisible", {
      code: erreur.code,
      motif: erreur.message,
    });

    return { lisible: false, motif: erreur.message };
  }
}
