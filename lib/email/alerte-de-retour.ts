import { ROUTES } from "@/lib/auth/routes";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { envoyerUneAlerte } from "./envoi-d-alerte";
import { composerLAlerteDeRetour, type AlerteDeRetourPayload } from "./templates/alerte-de-retour";

/** Le lien se construit ici, seul endroit qui connaît l'adresse et la route de l'écran. */
export type RetourAAnnoncer = Omit<AlerteDeRetourPayload, "lien">;

export async function envoyerLAlerteDeRetour(retour: RetourAAnnoncer): Promise<void> {
  await envoyerUneAlerte("retour", () =>
    composerLAlerteDeRetour({
      ...retour,
      lien: `${adresseDeLApp()}${ROUTES.adminRetours}`,
    }),
  );
}
