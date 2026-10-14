import { envoyerUneAlerte } from "./envoi-d-alerte";
import {
  composerLAlerteDePlafond,
  type AlerteDePlafondPayload,
} from "./templates/alerte-de-plafond";

/**
 * L'envoi d'une alerte de plafond, à qui tient le produit. Sans `EMAIL_ALERTES`,
 * un simple avertissement : lever ferait échouer la réservation qu'on surveille.
 */
export async function envoyerLAlerteDePlafond(payload: AlerteDePlafondPayload): Promise<void> {
  await envoyerUneAlerte("plafond", () => composerLAlerteDePlafond(payload));
}
