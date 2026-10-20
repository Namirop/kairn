import { sommerLesAppels } from "@/lib/db/registre-des-appels";
import { debutDuJourUtc } from "@/lib/domain/fenetre-utc";
import { reserverLAlerte } from "@/lib/db/alerte-quota";
import { envoyerLAlerteDePlafond } from "@/lib/email/alerte-de-plafond";
import { surveillerLePlafond, type EtatDuCompteur, type OutilsDAlerte } from "./alerte-de-plafond";
import { differer } from "@/lib/hors-chemin-critique";

/** Le câblage réel (base, emails) d'`alerte-de-plafond.ts`, qui se teste sans. */

const OUTILS: OutilsDAlerte = {
  reserver: reserverLAlerte,
  // La dépense se lit au registre plutôt qu'elle ne s'estime.
  depenseDuJourUsd: async (maintenant) =>
    (await sommerLesAppels(debutDuJourUtc(maintenant))).costUsd,
  envoyer: envoyerLAlerteDePlafond,
};

/** Différé : la réservation rend la main, la surveillance se fait après la réponse. */
export function signalerLEtatDuCompteur(etat: EtatDuCompteur, maintenant = new Date()): void {
  differer(() => surveillerLePlafond(etat, maintenant, OUTILS));
}
