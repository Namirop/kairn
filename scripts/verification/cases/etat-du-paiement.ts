import { lireLOffreDuCompte } from "@/lib/db/abonnement";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { PLAFOND_GRATUIT, PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { etatDepuisStripe } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "@/lib/paiement/client";
import { lireLeRapport } from "@/lib/paiement/rapport";
import { record } from "./journal";

/**
 * Notre ligne et celle de Stripe, côte à côte, contre un vrai abonnement.
 *
 * Les tests unitaires prouvent la traduction d'`etatDepuisStripe`, pas la forme
 * réelle de l'objet Stripe : le terme d'un abonnement vit sur la ligne, pas sur
 * l'abonnement, et une fixture écrite d'après la même lecture que le code ne
 * signalerait pas ce genre de déplacement.
 */
export async function comparerAvecStripe(userId: string): Promise<void> {
  const offre = await lireLOffreDuCompte(userId);
  const dossier = await lireDossierStripe(userId);

  if (!dossier.abonnementId) {
    record(
      "Le compte porte un abonnement Stripe",
      false,
      `plan ${offre.plan}, client ${dossier.clientId ?? "aucun"}, aucun abonnement attaché`,
    );

    return;
  }

  const abonnement = await stripe().subscriptions.retrieve(dossier.abonnementId);
  const attendu = etatDepuisStripe(lireLeRapport(abonnement));

  record(
    "Le plan de notre ligne est celui que Stripe décrit",
    offre.plan === attendu.plan,
    `nous : ${offre.plan}, Stripe : ${abonnement.status} → ${attendu.plan}`,
  );

  // Une seconde de tolérance : Stripe compte en secondes, nous en millisecondes.
  const ecart = offre.finDePeriode
    ? Math.abs(offre.finDePeriode.getTime() - (attendu.finDePeriode?.getTime() ?? 0))
    : Number.POSITIVE_INFINITY;

  record(
    "Le terme de notre ligne est celui de Stripe",
    ecart < 1000,
    `nous : ${offre.finDePeriode?.toISOString() ?? "aucun"}, Stripe : ${attendu.finDePeriode?.toISOString() ?? "aucun"}`,
  );

  record(
    "Le drapeau de résiliation suit Stripe",
    offre.resilieALaFin === attendu.resilieALaFin,
    `nous : ${offre.resilieALaFin}, Stripe : ${attendu.resilieALaFin}`,
  );

  const plafondAttendu = attendu.plan === "GRATUIT" ? PLAFOND_GRATUIT : PLAFOND_PAYANT;

  record(
    "Le plafond de concepts suit le plan",
    offre.plafond === plafondAttendu,
    `${offre.plafond} concepts pour un plan ${offre.plan}`,
  );
}
