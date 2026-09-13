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
      /*
        La version d'API est **épinglée**, et pas laissée au SDK.

        Sans cette ligne, le SDK vise sa `LatestApiVersion` — c'est-à-dire une
        valeur qui change quand on met le paquet à jour. Un `npm update` de
        routine déplacerait donc la version d'API que Stripe applique à nos
        appels, sans qu'aucune ligne de ce dépôt ne bouge et sans que rien ne le
        dise.

        Ce n'est pas théorique ici : `lireLeRapport` lit `current_period_end`
        **sur la ligne** de l'abonnement, parce que Stripe l'y a déplacé depuis
        l'abonnement lui-même. C'est exactement le genre de déplacement qu'une
        version d'API décide, et il casserait la lecture du terme — donc le
        droit d'un compte payant — en silence.

        La valeur est celle que le SDK installé vise aujourd'hui : l'épingler ne
        change rien maintenant, et c'est le but. Elle se monte à la main, en
        relisant ce que la nouvelle version déplace.

        Pratique reprise de DevisRapide, qui l'épingle pour la même raison.
      */
      apiVersion: "2026-08-26.dahlia",
      // Ce que le produit dit de lui-même dans le tableau de bord Stripe, à
      // côté de chaque appel. Sert au diagnostic quand deux environnements
      // écrivent sur le même compte.
      appInfo: { name: "Kairn", url: "https://kairn.me" },
    }),
  };

  return cache.stripe;
}
