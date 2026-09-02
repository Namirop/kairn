import { lireLOffreDuCompte } from "@/lib/db/abonnement";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { PLAFOND_GRATUIT, PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { etatDepuisStripe } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "@/lib/paiement/client";
import { lireLeRapport } from "@/lib/paiement/rapport";
import { record } from "./journal";

/**
 * Notre ligne et celle de Stripe, mises côte à côte.
 *
 * Les tests unitaires prouvent que `etatDepuisStripe` traduit correctement un
 * rapport ; ils ne peuvent rien dire de ce qui arrive **avant** lui — la forme
 * réelle de l'objet que Stripe envoie. Le terme d'un abonnement a changé de
 * place dans l'API (il vit sur la ligne depuis que la facturation peut être
 * découpée), et c'est le genre de déplacement qu'aucune fixture ne signale :
 * elle a été écrite d'après la même lecture que le code.
 *
 * D'où cette comparaison-ci, qui ne vaut qu'exécutée contre un vrai abonnement.
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
