import { differer } from "@/lib/hors-chemin-critique";
import { envoyerLAlerteDeRetour, type RetourAAnnoncer } from "./alerte-de-retour";

/**
 * Prévenir qu'un retour vient d'arriver, sans faire attendre qui l'a écrit.
 *
 * Le câblage est séparé de l'envoi pour la même raison qu'ailleurs : ce fichier
 * connaît l'attente et la panne, `alerte-de-retour.ts` ne connaît qu'un email.
 *
 * **Un email qui échoue ne fait pas échouer le retour.** Le retour est déjà
 * écrit quand on arrive ici ; le perdre parce que Resend a hoqueté serait perdre
 * la seule chose qui avait de la valeur dans ce geste. L'échec est journalisé —
 * il n'est pas avalé —, et l'écran des retours, lui, l'a de toute façon.
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
