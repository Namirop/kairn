import { sommerLesAppels } from "@/lib/db/registre-des-appels";
import { debutDuJourUtc } from "@/lib/domain/fenetre-utc";
import { reserverLAlerte } from "@/lib/db/alerte-quota";
import { envoyerLAlerteDePlafond } from "@/lib/email/alerte-de-plafond";
import { surveillerLePlafond, type EtatDuCompteur, type OutilsDAlerte } from "./alerte-de-plafond";
import { differer } from "@/lib/hors-chemin-critique";

/**
 * Le câblage de la surveillance des plafonds : la base, les emails, l'attente.
 *
 * Séparé de la décision : `alerte-de-plafond.ts` ne connaît que des types et se
 * teste sans base ni emails ; ce qui touche au monde réel est ici, sans logique.
 */

const OUTILS: OutilsDAlerte = {
  reserver: reserverLAlerte,
  // La dépense se lit au registre plutôt qu'elle ne s'estime.
  depenseDuJourUsd: async (maintenant) =>
    (await sommerLesAppels(debutDuJourUtc(maintenant))).costUsd,
  envoyer: envoyerLAlerteDePlafond,
};

/**
 * Signale l'état d'un compteur sans faire attendre l'appelant : la réservation
 * rend la main, le travail se fait après la réponse.
 */
export function signalerLEtatDuCompteur(etat: EtatDuCompteur, maintenant = new Date()): void {
  differer(() => surveillerLePlafond(etat, maintenant, OUTILS));
}
