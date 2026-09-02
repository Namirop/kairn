import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { abonnementVivant } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "./client";
import { objetIntrouvableChezStripe } from "./erreurs";
import { lireLeRapport } from "./rapport";

/**
 * Couper l'abonnement d'un compte qui va disparaître.
 *
 * **C'est le geste qui manquait, et son absence prélevait.** Supprimer un compte
 * efface la ligne `Subscription` par cascade ; l'abonnement Stripe, lui, ne sait
 * rien de nous et continue de débiter tous les mois. Pire que le prélèvement :
 * l'identifiant du client partait avec la ligne, donc plus rien ne permettait de
 * retrouver qui rembourser. La personne, elle, n'avait plus de compte d'où
 * résilier.
 *
 * À part de `resiliation.ts`, qui lève un drapeau et laisse courir jusqu'au
 * terme. Ici c'est l'inverse : on coupe tout de suite, parce qu'il ne restera
 * personne pour profiter des jours déjà payés. Ces jours-là ne sont pas
 * remboursés — Stripe ne le fait pas de lui-même, et rembourser au prorata est
 * une décision commerciale, pas une conséquence technique de la suppression.
 */

/**
 * Annule l'abonnement du compte s'il en a un qui vit encore.
 *
 * Ne rend rien et ne juge pas : un compte sans dossier Stripe, ou dont
 * l'abonnement est déjà fini, sort d'ici sans qu'on ait parlé à Stripe. C'est
 * le cas de l'immense majorité des suppressions, et il ne doit rien coûter.
 *
 * **En revanche, elle lève quand l'annulation échoue.** L'appelant doit alors
 * renoncer à supprimer le compte : garder un compte de trop est réparable en un
 * clic, laisser courir un prélèvement sans plus aucune trace ne l'est pas.
 */
export async function fermerLAbonnementDuCompte(userId: string): Promise<void> {
  const { abonnementId } = await lireDossierStripe(userId);

  if (!abonnementId) return;

  let abonnement;

  try {
    abonnement = await stripe().subscriptions.retrieve(abonnementId);
  } catch (erreur) {
    // Introuvable : il ne prélève rien, il n'y a rien à couper. Refuser la
    // suppression du compte ici serait la bloquer pour toujours.
    if (objetIntrouvableChezStripe(erreur)) return;

    throw erreur;
  }

  if (!abonnementVivant(lireLeRapport(abonnement).statut)) return;

  await stripe().subscriptions.cancel(abonnementId);
}
