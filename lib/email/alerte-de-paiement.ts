import { envoyerUneAlerte } from "./envoi-d-alerte";
import {
  composerLAlerteDePaiement,
  type AlerteDePaiementPayload,
} from "./templates/alerte-de-paiement";

/**
 * L'envoi d'une alerte de webhook de paiement en échec.
 *
 * Comme les autres alertes d'exploitation : hors de `envoyerLaNotification`, vers
 * `EMAIL_ALERTES`, et un simple avertissement si la variable manque.
 */
export async function envoyerLAlerteDePaiement(payload: AlerteDePaiementPayload): Promise<void> {
  await envoyerUneAlerte("paiement", () => composerLAlerteDePaiement(payload));
}
