import { envoyerUneAlerte } from "./envoi-d-alerte";
import {
  composerLAlerteDePaiement,
  type AlerteDePaiementPayload,
} from "./templates/alerte-de-paiement";

export async function envoyerLAlerteDePaiement(payload: AlerteDePaiementPayload): Promise<void> {
  await envoyerUneAlerte("paiement", () => composerLAlerteDePaiement(payload));
}
