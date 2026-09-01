import type { CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import { stripe } from "./client";
import { RapportIllisibleError } from "./erreurs";

/**
 * Le catalogue Stripe, adressé par clé de recherche et non par identifiant.
 *
 * Un `price_…` est propre à un environnement : celui du mode test n'existe pas
 * en production. Les inscrire dans le code obligerait à une variable
 * d'environnement par prix, et à se souvenir de la changer le jour du passage
 * en production — c'est-à-dire au moment précis où l'on a le plus de choses en
 * tête. Une clé de recherche, elle, est la même des deux côtés : le catalogue
 * de production porte les mêmes que celui de test, et le code ne connaît qu'un
 * nom.
 */

/** Les clés portées par les prix Stripe. Elles sont identiques en test et en production. */
export const CLE_DU_PRIX: Record<CadenceStripe, string> = {
  month: "kairn_mensuel",
  year: "kairn_annuel",
};

/** Ce que le produit annonce, en centimes — l'unité dans laquelle Stripe compte. */
const CENTIMES_ANNONCES: Record<CadenceStripe, number> = {
  month: PRIX_MENSUEL * 100,
  year: PRIX_ANNUEL * 100,
};

/**
 * L'identifiant du prix d'une cadence, vérifié contre ce que la page annonce.
 *
 * **La vérification n'est pas une précaution de plus, c'est la promesse.** La
 * page de tarifs affiche `PRIX_MENSUEL` ; ce qui est débité est ce que Stripe a
 * enregistré. Les deux vivent dans deux systèmes que rien ne synchronise, et le
 * jour où ils divergent, la seule issue acceptable est de ne pas vendre :
 * encaisser un montant différent de celui qui est affiché n'est pas un bug
 * d'affichage.
 *
 * Le refus est bruyant et arrive au clic sur « Payer ». C'est le bon endroit —
 * il vaut mieux un achat qui échoue devant une personne qu'un prélèvement
 * qu'elle découvre après.
 */
export async function prixDeLaCadence(cadence: CadenceStripe): Promise<string> {
  const cle = CLE_DU_PRIX[cadence];
  const trouves = await stripe().prices.list({ lookup_keys: [cle], active: true, limit: 2 });
  const prix = trouves.data.length === 1 ? trouves.data[0] : undefined;

  if (!prix) {
    throw new RapportIllisibleError(
      `${trouves.data.length} prix actif porte la clé « ${cle} », il en faut exactement un.`,
    );
  }

  const attendu = CENTIMES_ANNONCES[cadence];

  if (prix.currency !== "eur" || prix.unit_amount !== attendu) {
    throw new RapportIllisibleError(
      `« ${cle} » vaut ${prix.unit_amount} ${prix.currency}, la page annonce ${attendu} eur.`,
    );
  }

  if (prix.recurring?.interval !== cadence || prix.recurring.interval_count !== 1) {
    throw new RapportIllisibleError(`« ${cle} » ne se renouvelle pas tous les 1 ${cadence}.`);
  }

  return prix.id;
}
