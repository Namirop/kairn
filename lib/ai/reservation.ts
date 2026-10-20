import {
  rendrePlaceAnonyme,
  rendrePlacesDeCompte,
  reserverAppelModele,
  reserverPlaceAnonyme,
  reserverPlaceDeCompte,
} from "@/lib/db/ai-quota";
import { signalerLEtatDuCompteur } from "./signalement-de-plafond";
import type { ConfigIa } from "./config";
import {
  PartSansCompteEpuiseeError,
  PlafondGlobalAtteintError,
  PartDuCompteEpuiseeError,
} from "./errors";

/**
 * Qui paie un appel. La part d'un compte protège les comptes entre eux, celle du
 * sans-compte protège landing et comptes l'un de l'autre, le global protège le
 * budget. Ensemble pour qu'aucun chemin n'en oublie un.
 */

export type Provenance = { userId: string } | { anonyme: true } | { interne: true };

export function provenanceDeLAppel(params: { userId?: string; anonyme?: boolean }): Provenance {
  if (params.userId) return { userId: params.userId };
  if (params.anonyme) return { anonyme: true };

  return { interne: true };
}

/**
 * La part du demandeur d'abord, car elle se rend tant que rien n'est émis ; la
 * place globale ne se rend jamais, un appel échoué ayant pu consommer des tokens.
 * L'inverse ferait payer au produit les refus d'une part pleine. L'interne
 * (reprise, outil, évaluation) n'a pas de part : personne derrière à protéger.
 *
 * Chaque compteur est signalé après son incrément, refus compris : seul moment
 * où l'on sait qu'un plafond est atteint.
 */
export async function reserverLesDeuxPlaces(
  config: ConfigIa,
  provenance: Provenance,
): Promise<void> {
  if ("userId" in provenance) {
    const part = await reserverPlaceDeCompte(provenance.userId, config.userDailyCallCap);

    signalerLEtatDuCompteur({
      compteur: "COMPTE",
      cible: provenance.userId,
      utilisees: part.utilisees,
      plafond: config.userDailyCallCap,
    });

    if (!part.obtenue) {
      throw new PartDuCompteEpuiseeError(part.utilisees, config.userDailyCallCap);
    }
  }

  if ("anonyme" in provenance) {
    const part = await reserverPlaceAnonyme(config.anonymousDailyCallCap);

    signalerLEtatDuCompteur({
      compteur: "ANONYME",
      cible: null,
      utilisees: part.utilisees,
      plafond: config.anonymousDailyCallCap,
    });

    if (!part.obtenue) {
      throw new PartSansCompteEpuiseeError(part.utilisees, config.anonymousDailyCallCap);
    }
  }

  const reservation = await reserverAppelModele(config.dailyCallCap);

  signalerLEtatDuCompteur({
    compteur: "GLOBAL",
    cible: null,
    utilisees: reservation.utilisees,
    plafond: config.dailyCallCap,
  });

  if (reservation.obtenue) return;

  if ("userId" in provenance) await rendrePlacesDeCompte(provenance.userId);
  if ("anonyme" in provenance) await rendrePlaceAnonyme();

  throw new PlafondGlobalAtteintError(reservation.utilisees, config.dailyCallCap);
}

/**
 * Seconde émission réelle, donc une place globale ; pas de part, qui compte les
 * demandes et que la demande a déjà prise.
 *
 * `false` au plafond, sans lever : l'appelant laisse remonter l'échec du primaire.
 */
export async function reserverLaPlaceDuRepli(config: ConfigIa): Promise<boolean> {
  const reservation = await reserverAppelModele(config.dailyCallCap);

  signalerLEtatDuCompteur({
    compteur: "GLOBAL",
    cible: null,
    utilisees: reservation.utilisees,
    plafond: config.dailyCallCap,
  });

  return reservation.obtenue;
}
