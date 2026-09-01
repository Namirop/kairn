import Stripe from "stripe";
import { lireConfigDePaiement } from "./config";

/**
 * Le seul endroit qui instancie le SDK Stripe.
 *
 * Même règle que `lib/ai/client.ts` : un point d'entrée unique, sans exception.
 * Ce qui est en jeu ici n'est pas la balance d'une API mais celle d'un client,
 * et un second client Stripe construit ailleurs, avec sa propre idée de la clé
 * à prendre, c'est la porte ouverte à un appel de production émis depuis un
 * chemin qui se croyait en test.
 */

/**
 * L'instance, gardée tant que la clé ne change pas.
 *
 * Le SDK tient un pool de connexions ; en reconstruire un à chaque requête
 * coûterait une poignée de main TLS par appel. La clé est dans le cache pour
 * qu'une rotation de secret prenne effet toute seule : la clé change, l'instance
 * est jetée.
 */
let cache: { cle: string; stripe: Stripe } | null = null;

export function stripe(): Stripe {
  const { cleSecrete } = lireConfigDePaiement();

  if (cache?.cle === cleSecrete) return cache.stripe;

  cache = {
    cle: cleSecrete,
    stripe: new Stripe(cleSecrete, {
      // Ce que le produit dit de lui-même dans le tableau de bord Stripe, à
      // côté de chaque appel. Sert au diagnostic quand deux environnements
      // écrivent sur le même compte.
      appInfo: { name: "Kairn", url: "https://kairn.me" },
    }),
  };

  return cache.stripe;
}
