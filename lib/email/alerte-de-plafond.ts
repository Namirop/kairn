import { envoyerUneAlerte } from "./envoi-d-alerte";
import {
  composerLAlerteDePlafond,
  type AlerteDePlafondPayload,
} from "./templates/alerte-de-plafond";

export async function envoyerLAlerteDePlafond(payload: AlerteDePlafondPayload): Promise<void> {
  await envoyerUneAlerte("plafond", () => composerLAlerteDePlafond(payload));
}
