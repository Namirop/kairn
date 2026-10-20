import { envoyerUneAlerte } from "./envoi-d-alerte";
import {
  composerLAlerteDeBascule,
  type AlerteDeBasculePayload,
} from "./templates/alerte-de-bascule";

export async function envoyerLAlerteDeBascule(payload: AlerteDeBasculePayload): Promise<void> {
  await envoyerUneAlerte("bascule", () => composerLAlerteDeBascule(payload));
}
