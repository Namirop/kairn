import { compterBasculesDuJour } from "@/lib/db/registre-des-appels";
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
 * `alerte-de-bascule.ts` ne connaît que des types et se teste sans base ni
 * emails ; ce qui touche au monde réel est ici.
 */

const OUTILS: OutilsDAlerteBascule = {
  reserver: reserverLAlerte,
  envoyer: envoyerLAlerteDeBascule,
};

/**
 * Signale qu'une bascule vient de se produire, sans faire attendre l'appelant.
 *
 * La bascule a réussi et `callAI` a déjà rendu sa valeur : la surveillance se
 * fait après.
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
