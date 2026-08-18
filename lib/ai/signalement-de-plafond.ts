import { startOfUtcDay, sumAiCalls } from "@/lib/db/ai-call";
import { reserverLAlerte } from "@/lib/db/alerte-quota";
import { envoyerLAlerteDePlafond } from "@/lib/email/alerte-de-plafond";
import { surveillerLePlafond, type EtatDuCompteur, type OutilsDAlerte } from "./alerte-de-plafond";
import { differer } from "./hors-chemin-critique";

/**
 * Le câblage de la surveillance des plafonds : la base, les emails, l'attente.
 *
 * Il est séparé de la décision pour une raison précise. `alerte-de-plafond.ts`
 * ne connaît que des types, donc il se charge et se teste sans client de base ni
 * client d'emails ; tout ce qui touche au monde réel est ici, dans un fichier
 * qui n'a aucune logique à vérifier.
 */

const OUTILS: OutilsDAlerte = {
  reserver: reserverLAlerte,
  // La dépense se lit au registre plutôt qu'elle ne s'estime : c'est ce que les
  // appels ont réellement coûté, pas ce qu'on croit qu'ils coûtent.
  depenseDuJourUsd: async (maintenant) => (await sumAiCalls(startOfUtcDay(maintenant))).costUsd,
  envoyer: envoyerLAlerteDePlafond,
};

/**
 * Signale l'état d'un compteur sans faire attendre l'appelant.
 *
 * C'est la forme qu'utilise la réservation : elle rend la main tout de suite, et
 * le travail se fait après la réponse.
 */
export function signalerLEtatDuCompteur(etat: EtatDuCompteur, maintenant = new Date()): void {
  differer(() => surveillerLePlafond(etat, maintenant, OUTILS));
}
