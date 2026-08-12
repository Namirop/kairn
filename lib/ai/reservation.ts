import {
  rendrePlacesDeCompte,
  reserverAppelModele,
  reserverPlaceDeCompte,
} from "@/lib/db/ai-quota";
import type { AiConfig } from "./config";
import { AIQuotaError, AIUserQuotaError } from "./errors";

/**
 * Qui paie un appel, et dans quel ordre.
 *
 * Deux compteurs protègent deux choses différentes : la part d'un compte le
 * protège de lui-même et protège les autres de lui, le plafond global protège le
 * budget du produit. Les tenir ici, ensemble, évite qu'un jour l'un des deux
 * s'oublie sur un chemin.
 */

/**
 * Les deux places d'un appel : celle du compte, puis celle du produit.
 *
 * L'ordre n'est pas indifférent. La place du compte se prend d'abord parce
 * qu'elle se rend : tant que rien n'a été émis, elle ne doit rien. La place
 * globale, elle, ne se rend jamais — un appel qui part et échoue a pu consommer
 * des tokens. Prendre la globale en premier ferait payer au produit les refus
 * d'un compte qui a atteint sa part.
 *
 * Un appel sans utilisateur — une reprise par le cron, un outil — ne passe que
 * le plafond global. Il n'appartient à personne, il n'a pas de part à prendre.
 */
export async function reserverLesDeuxPlaces(
  config: AiConfig,
  userId: string | undefined,
): Promise<void> {
  if (userId) {
    const part = await reserverPlaceDeCompte(userId, config.userDailyCallCap);

    if (!part.obtenue) {
      throw new AIUserQuotaError(part.utilisees, config.userDailyCallCap);
    }
  }

  const reservation = await reserverAppelModele(config.dailyCallCap);

  if (reservation.obtenue) return;

  if (userId) await rendrePlacesDeCompte(userId);

  throw new AIQuotaError(reservation.utilisees, config.dailyCallCap);
}
