import { envoyerUneAlerte } from "./envoi-d-alerte";
import {
  composerLAlerteDeBascule,
  type AlerteDeBasculePayload,
} from "./templates/alerte-de-bascule";

/**
 * L'envoi d'une alerte de bascule Luna → Sonnet. Comme les autres alertes
 * d'exploitation : hors de `envoyerLaNotification`, vers `EMAIL_ALERTES`, et un
 * simple avertissement si la variable manque.
 */
export async function envoyerLAlerteDeBascule(payload: AlerteDeBasculePayload): Promise<void> {
  await envoyerUneAlerte("bascule", () => composerLAlerteDeBascule(payload));
}
