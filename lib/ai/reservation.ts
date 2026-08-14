import {
  rendrePlaceAnonyme,
  rendrePlacesDeCompte,
  reserverAppelModele,
  reserverPlaceAnonyme,
  reserverPlaceDeCompte,
} from "@/lib/db/ai-quota";
import type { AiConfig } from "./config";
import { AIAnonymousQuotaError, AIQuotaError, AIUserQuotaError } from "./errors";

/**
 * Qui paie un appel, et dans quel ordre.
 *
 * Trois compteurs protègent trois choses différentes : la part d'un compte le
 * protège de lui-même et protège les autres de lui, la part du trafic sans
 * compte empêche la landing et les comptes de s'affamer mutuellement, et le
 * plafond global protège le budget du produit. Les tenir ici, ensemble, évite
 * qu'un jour l'un des trois s'oublie sur un chemin.
 */

/** D'où vient l'appel, pour savoir à quel seau le facturer. */
export type Provenance = { userId: string } | { anonyme: true } | { interne: true };

export function provenanceDeLAppel(params: {
  userId?: string;
  anonyme?: boolean;
}): Provenance {
  if (params.userId) return { userId: params.userId };
  if (params.anonyme) return { anonyme: true };

  return { interne: true };
}

/**
 * Les deux places d'un appel : la part de qui le demande, puis celle du produit.
 *
 * L'ordre n'est pas indifférent. La part se prend d'abord parce qu'elle se rend :
 * tant que rien n'a été émis, elle ne doit rien. La place globale, elle, ne se
 * rend jamais — un appel qui part et échoue a pu consommer des tokens. Prendre
 * la globale en premier ferait payer au produit les refus d'une part pleine.
 *
 * **Trois provenances, et l'anonyme n'est plus confondue avec l'interne.** Le
 * commentaire d'avant disait qu'un appel sans utilisateur « n'appartient à
 * personne, il n'a pas de part à prendre » : c'était vrai d'une reprise par le
 * cron, faux d'un visiteur. Le trafic public appartient à un pool, et ce pool a
 * une part. Seul l'interne — une reprise, un outil, une évaluation — passe
 * directement au plafond global, parce qu'il n'y a personne derrière à protéger
 * de qui que ce soit.
 */
export async function reserverLesDeuxPlaces(
  config: AiConfig,
  provenance: Provenance,
): Promise<void> {
  if ("userId" in provenance) {
    const part = await reserverPlaceDeCompte(provenance.userId, config.userDailyCallCap);

    if (!part.obtenue) {
      throw new AIUserQuotaError(part.utilisees, config.userDailyCallCap);
    }
  }

  if ("anonyme" in provenance) {
    const part = await reserverPlaceAnonyme(config.anonymousDailyCallCap);

    if (!part.obtenue) {
      throw new AIAnonymousQuotaError(part.utilisees, config.anonymousDailyCallCap);
    }
  }

  const reservation = await reserverAppelModele(config.dailyCallCap);

  if (reservation.obtenue) return;

  if ("userId" in provenance) await rendrePlacesDeCompte(provenance.userId);
  if ("anonyme" in provenance) await rendrePlaceAnonyme();

  throw new AIQuotaError(reservation.utilisees, config.dailyCallCap);
}
