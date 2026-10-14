import Stripe from "stripe";
import { lireConfigDePaiement } from "./config";

/**
 * Le seul endroit qui instancie le SDK Stripe, comme `lib/ai/client.ts` pour le
 * modèle : un second client, avec sa propre idée de la clé, pourrait émettre un
 * appel de production depuis un chemin qui se croit en test.
 */

/**
 * L'instance, gardée tant que la clé ne change pas : le SDK tient un pool de
 * connexions, et une rotation de secret jette l'instance d'elle-même.
 */
let cache: { cle: string; stripe: Stripe } | null = null;

export function stripe(): Stripe {
  const { cleSecrete } = lireConfigDePaiement();

  if (cache?.cle === cleSecrete) return cache.stripe;

  cache = {
    cle: cleSecrete,
    stripe: new Stripe(cleSecrete, {
      /*
        Version d'API épinglée : sans elle, une mise à jour du paquet changerait
        la version appliquée à nos appels sans qu'aucune ligne ne bouge. Or
        `lireLeRapport` lit `current_period_end` sur la ligne de l'abonnement, un
        emplacement qu'une version d'API peut déplacer, et le droit d'un compte
        payant en dépend. Se monte à la main, en relisant ce qu'elle déplace.
      */
      apiVersion: "2026-08-26.dahlia",
      // Affiché à côté de chaque appel dans le tableau de bord Stripe : sert au
      // diagnostic quand deux environnements écrivent sur le même compte.
      appInfo: { name: "Kairn", url: "https://kairn.me" },
    }),
  };

  return cache.stripe;
}
