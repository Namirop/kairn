import { differer } from "@/lib/hors-chemin-critique";
import { envoyerLAlerteDeRetour, type RetourAAnnoncer } from "./alerte-de-retour";

/**
 * Sans faire attendre qui l'a écrit. Un email qui échoue ne fait pas échouer le
 * retour, déjà écrit et visible dans l'écran des retours.
 */
export function signalerUnRetour(retour: RetourAAnnoncer): void {
  differer(async () => {
    try {
      await envoyerLAlerteDeRetour(retour);
    } catch (erreur) {
      const cause = erreur instanceof Error ? erreur.message : "erreur inconnue";

      console.error(`[retour] alerte non partie — ${cause}`);
    }
  });
}
