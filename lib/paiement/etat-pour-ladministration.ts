import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import type { CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { CLE_DU_PRIX, prixDeLaCadence } from "./catalogue";
import { modeDePaiement, type ModeDePaiement } from "./config";

/**
 * Ce que l'écran de pilotage sait du paiement : une lecture, jamais un levier
 * (`PAIEMENT_LIVE` reste un geste chez l'hébergeur, voir `config.ts`).
 *
 * Il dit le mode et si le catalogue répond : des clés ou montants divergents
 * feraient échouer chaque achat, sans autre signal avant le premier client.
 * Aucun secret ne sort d'ici.
 */

export type LigneDeCatalogue = {
  cadence: CadenceStripe;
  cle: string;
  /** Ce que la page annonce, en euros. */
  annonce: number;
  /** L'identifiant résolu, ou la raison du refus. */
  resolu: { prix: string } | { erreur: string };
};

export type EtatDuPaiement = {
  mode: ModeDePaiement;
  catalogue: LigneDeCatalogue[];
};

const ANNONCE: Record<CadenceStripe, number> = {
  month: PRIX_MENSUEL,
  year: PRIX_ANNUEL,
};

export async function lireLEtatDuPaiement(): Promise<EtatDuPaiement> {
  const mode = modeDePaiement();

  // Paiement fermé : demander le catalogue afficherait une fausse erreur.
  if (mode === "ferme") return { mode, catalogue: [] };

  const cadences: CadenceStripe[] = ["month", "year"];
  const catalogue = await Promise.all(cadences.map((cadence) => resoudre(cadence)));

  return { mode, catalogue };
}

async function resoudre(cadence: CadenceStripe): Promise<LigneDeCatalogue> {
  const ligne = { cadence, cle: CLE_DU_PRIX[cadence], annonce: ANNONCE[cadence] };

  try {
    return { ...ligne, resolu: { prix: await prixDeLaCadence(cadence) } };
  } catch (erreur) {
    // Le refus de `prixDeLaCadence`, tel quel : c'est celui qu'aurait un achat.
    return { ...ligne, resolu: { erreur: erreur instanceof Error ? erreur.message : "illisible" } };
  }
}
