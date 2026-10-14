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
 * Qui paie un appel, et dans quel ordre. Trois compteurs : la part d'un compte
 * protège les comptes entre eux, celle du trafic sans compte protège landing et
 * comptes l'un de l'autre, le plafond global protège le budget. Ils vivent
 * ensemble pour qu'aucun chemin n'en oublie un.
 */

/** D'où vient l'appel, pour savoir à quel seau le facturer. */
export type Provenance = { userId: string } | { anonyme: true } | { interne: true };

export function provenanceDeLAppel(params: { userId?: string; anonyme?: boolean }): Provenance {
  if (params.userId) return { userId: params.userId };
  if (params.anonyme) return { anonyme: true };

  return { interne: true };
}

/**
 * Les deux places d'un appel : la part de qui le demande, puis celle du produit.
 *
 * Chaque compteur est signalé après son incrément, refus compris : c'est le
 * seul moment où l'on sait qu'un plafond est atteint. Le signalement ne bloque
 * ni ne lève (voir `signalement-de-plafond.ts`).
 *
 * La part d'abord, parce qu'elle se rend tant que rien n'est émis ; la place
 * globale ne se rend jamais, un appel échoué ayant pu consommer des tokens.
 * L'inverse ferait payer au produit les refus d'une part pleine.
 *
 * L'interne (reprise, outil, évaluation) n'a pas de part : personne derrière à
 * protéger. Le trafic anonyme, lui, en a une.
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
 * La place d'un repli : une seconde émission réelle, donc une place au plafond
 * global, qui protège le budget. Pas de part de compte ni de trafic anonyme :
 * elles comptent des demandes, et la demande a déjà pris la sienne.
 *
 * Rend `false` quand le plafond est atteint, sans lever : l'appelant renonce au
 * repli et laisse remonter l'échec du modèle primaire.
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
