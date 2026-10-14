import { ROUTES } from "@/lib/auth/routes";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { envoyerUneAlerte } from "./envoi-d-alerte";
import { composerLAlerteDeRetour, type AlerteDeRetourPayload } from "./templates/alerte-de-retour";

/**
 * L'envoi d'une alerte de retour. Comme les autres alertes d'exploitation :
 * hors de `envoyerLaNotification`, vers `EMAIL_ALERTES`, et un simple avertissement
 * si la variable manque.
 *
 * Le lien se construit ici, seul endroit qui connaisse l'adresse de
 * l'application et la route de l'écran.
 */
export type RetourAAnnoncer = Omit<AlerteDeRetourPayload, "lien">;

export async function envoyerLAlerteDeRetour(retour: RetourAAnnoncer): Promise<void> {
  await envoyerUneAlerte("retour", () =>
    composerLAlerteDeRetour({
      ...retour,
      lien: `${adresseDeLApp()}${ROUTES.adminRetours}`,
    }),
  );
}
