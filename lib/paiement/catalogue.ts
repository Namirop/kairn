import type { CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import { stripe } from "./client";
import { RapportIllisibleError } from "./erreurs";

/** Par `lookup_key` : un `price_…` est propre à un mode, la clé est la même des deux côtés. */

export const CLE_DU_PRIX: Record<CadenceStripe, string> = {
  month: "kairn_mensuel",
  year: "kairn_annuel",
};

/** En centimes, l'unité de Stripe. */
const CENTIMES_ANNONCES: Record<CadenceStripe, number> = {
  month: PRIX_MENSUEL * 100,
  year: PRIX_ANNUEL * 100,
};

/**
 * Rien ne synchronise la page et Stripe : s'ils divergent, on refuse de vendre.
 * Mieux vaut un achat qui échoue qu'un prélèvement différent de l'affiché.
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
