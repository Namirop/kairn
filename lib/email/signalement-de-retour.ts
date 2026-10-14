import { differer } from "@/lib/hors-chemin-critique";
import { envoyerLAlerteDeRetour, type RetourAAnnoncer } from "./alerte-de-retour";

/**
 * Prévenir qu'un retour vient d'arriver, sans faire attendre qui l'a écrit. Ce
 * fichier connaît l'attente et la panne ; `alerte-de-retour.ts` ne connaît
 * qu'un email.
 *
 * Un email qui échoue ne fait pas échouer le retour, déjà écrit : l'échec est
 * journalisé, et l'écran des retours l'a de toute façon.
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
