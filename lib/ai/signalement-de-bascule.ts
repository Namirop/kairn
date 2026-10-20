import { compterBasculesDuJour } from "@/lib/db/registre-des-appels";
import { reserverLAlerte } from "@/lib/db/alerte-quota";
import { envoyerLAlerteDeBascule } from "@/lib/email/alerte-de-bascule";
import {
  SEUIL_BASCULES,
  surveillerLesBascules,
  type OutilsDAlerteBascule,
} from "./alerte-de-bascule";
import { differer } from "@/lib/hors-chemin-critique";

/** Le câblage réel (base, emails) d'`alerte-de-bascule.ts`, qui se teste sans. */

const OUTILS: OutilsDAlerteBascule = {
  reserver: reserverLAlerte,
  envoyer: envoyerLAlerteDeBascule,
};

/** Différé : `callAI` a déjà sa valeur, la surveillance ne la retarde pas. */
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
