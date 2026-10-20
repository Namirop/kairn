import Stripe from "stripe";
import { lireConfigDePaiement } from "./config";

/**
 * Seul point d'instanciation du SDK, comme `lib/ai/client.ts` : un second client
 * pourrait appeler la production depuis un chemin qui se croit en test.
 */

/** Gardée pour son pool de connexions ; une rotation de clé la remplace. */
let cache: { cle: string; stripe: Stripe } | null = null;

export function stripe(): Stripe {
  const { cleSecrete } = lireConfigDePaiement();

  if (cache?.cle === cleSecrete) return cache.stripe;

  cache = {
    cle: cleSecrete,
    stripe: new Stripe(cleSecrete, {
      /*
        Épinglée : sinon une mise à jour du paquet changerait la version sans
        qu'une ligne bouge. `lireLeRapport` lit `current_period_end` sur la ligne
        de l'abonnement, qu'une version peut déplacer, et le droit payant en
        dépend. Se monte à la main, en relisant ce qu'elle déplace.
      */
      apiVersion: "2026-09-30.endive",
      // Distingue les environnements qui écrivent sur le même compte Stripe.
      appInfo: { name: "Kairn", url: "https://kairn.me" },
    }),
  };

  return cache.stripe;
}
