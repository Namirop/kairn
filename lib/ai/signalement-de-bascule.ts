import { compterBasculesDuJour } from "@/lib/db/ai-call";
import { reserverLAlerte } from "@/lib/db/alerte-quota";
import { envoyerLAlerteDeBascule } from "@/lib/email/alerte-de-bascule";
import {
  SEUIL_BASCULES,
  surveillerLesBascules,
  type OutilsDAlerteBascule,
} from "./alerte-de-bascule";
import { differer } from "@/lib/hors-chemin-critique";

/**
 * Le câblage de la surveillance des bascules : la base, les emails, l'attente.
 * Séparé de la décision pour la même raison qu'`alerte-de-plafond` :
 * `alerte-de-bascule.ts` ne connaît que des types et se teste sans client de
 * base ni client d'emails ; tout ce qui touche au monde réel est ici.
 */

const OUTILS: OutilsDAlerteBascule = {
  reserver: reserverLAlerte,
  envoyer: envoyerLAlerteDeBascule,
};

/**
 * Signale qu'une bascule vient de se produire, sans faire attendre l'appelant.
 *
 * L'appelant (le chemin de `callAI`) a déjà rendu la valeur à son propre
 * appelant — la bascule a réussi, le dépôt part. La surveillance se fait après.
 */
export function signalerUneBascule(motif: string, maintenant = new Date()): void {
  differer(async () => {
    const bascules = await compterBasculesDuJour(maintenant);
    await surveillerLesBascules(
      { bascules, seuil: SEUIL_BASCULES, motifDernier: motif },
      maintenant,
      OUTILS,
    );
  });
}
