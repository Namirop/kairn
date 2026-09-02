"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { supprimerLeCompte } from "@/lib/db/compte";
import { enregistrerLesReglages, optOutOfEmails, reprendreLesEmails } from "@/lib/db/user-settings";
import { confirmationValide, MOT_DE_CONFIRMATION } from "@/lib/domain/confirmation-de-suppression";
import { lireHeureDeRappel } from "@/lib/domain/heure-de-rappel";
import { lirePlafondDeSession, PLAFOND_MAX, PLAFOND_MIN } from "@/lib/domain/selection-session";
import { PaiementError } from "@/lib/paiement/erreurs";
import { fermerLAbonnementDuCompte } from "@/lib/paiement/fermeture-du-compte";

/**
 * Les gestes irréversibles d'un compte.
 *
 * Il n'y en a qu'un, et c'est pour ça qu'il est ici plutôt que dans les gestes
 * de dépôt : effacer un compte n'a rien à voir avec le reste du produit, et
 * mélanger les deux ferait qu'une erreur d'import mette la suppression à portée
 * d'un écran qui ne la demande pas.
 */

const confirmationSchema = z.object({
  confirmation: z.string().refine(confirmationValide),
});

export type EtatSuppression = { erreur?: string };

/**
 * Efface le compte, puis la session avec.
 *
 * L'ordre compte : la session est détruite par la cascade au moment où la ligne
 * `User` part, donc il n'y a rien à révoquer après. On redirige vers l'accueil,
 * qui est le seul écran qu'un compte effacé peut encore voir.
 */
export async function supprimerMonCompteAction(
  _precedent: EtatSuppression,
  donnees: FormData,
): Promise<EtatSuppression> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const valide = confirmationSchema.safeParse({
    confirmation: (donnees.get("confirmation") ?? "").toString(),
  });

  if (!valide.success) {
    return { erreur: `Recopie « ${MOT_DE_CONFIRMATION} » pour confirmer.` };
  }

  // **L'abonnement se coupe avant le compte, et jamais l'inverse.** La ligne
  // `Subscription` part en cascade avec le compte, et elle emporte l'identifiant
  // du client Stripe : après le `delete`, plus rien ici ne sait quel abonnement
  // continue de prélever. C'est donc maintenant ou jamais.
  //
  // Un échec renonce à la suppression plutôt que de la forcer. Garder un compte
  // de trop se répare d'un clic ; un prélèvement qui court sans plus aucune
  // trace se répare en fouillant le tableau de bord Stripe, si tant est qu'on
  // s'aperçoive qu'il court.
  try {
    await fermerLAbonnementDuCompte(utilisateur.id);
  } catch (erreur) {
    console.error("[paiement] fermeture refusée", {
      userId: utilisateur.id,
      code: erreur instanceof PaiementError ? erreur.code : "INCONNU",
      erreur,
    });

    return {
      erreur:
        "Ton abonnement n'a pas pu être arrêté, et on ne supprime pas un compte qui paie encore. Réessaie dans un instant.",
    };
  }

  const efface = await supprimerLeCompte(utilisateur.id);

  if (!efface) return { erreur: "Ce compte est introuvable." };

  // Rien à révoquer : la ligne `Session` est partie avec le compte, dans la même
  // cascade. Le cookie que le navigateur garde ne désigne plus rien — la
  // prochaine requête ne trouve pas de session et le barrage d'entrée renvoie à
  // la connexion. Appeler une déconnexion ici donnerait l'illusion d'un ménage
  // qui a déjà eu lieu.
  redirect(ROUTES.accueil);
}

/**
 * Ce que le formulaire de notifications rend à l'écran : un mot, jamais les deux.
 *
 * `heure` et `plafond` portent les saisies refusées. React remet un formulaire à
 * ses valeurs par défaut quand l'action rend la main, donc sans elles une valeur
 * mal écrite disparaissait au moment où l'on demandait de la corriger.
 */
export type EtatDesReglages = {
  message?: string;
  erreur?: string;
  heure?: string;
  plafond?: string;
};

/**
 * Enregistre les réglages de notification.
 *
 * L'ordre des écritures compte. Couper les emails coupe aussi les deux réglages
 * de contenu — c'est ce que fait le lien de désinscription, et un compte coupé
 * depuis l'écran doit finir dans le même état que coupé depuis un email. Les
 * rendre lève le refus sans rien rallumer : ce qu'on veut recevoir se rechoisit,
 * ça ne se devine pas.
 *
 * L'identifiant vient de la session, jamais du formulaire, et l'écriture porte
 * sa propre clause de propriété.
 */
export async function enregistrerLesReglagesAction(
  _precedent: EtatDesReglages,
  donnees: FormData,
): Promise<EtatDesReglages> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  // Les deux lectures d'abord : rien ne s'écrit tant qu'une saisie est illisible,
  // sinon un plafond mal tapé aurait quand même coupé les emails.
  const saisieDuPlafond = (donnees.get("plafond") ?? "").toString();
  const plafond = lirePlafondDeSession(saisieDuPlafond);

  if (plafond === null) {
    return {
      erreur: `La session porte de ${PLAFOND_MIN} à ${PLAFOND_MAX} concepts. Ce qui déborde revient le lendemain.`,
      plafond: saisieDuPlafond,
    };
  }

  const emailsActifs = donnees.get("emails") !== null;
  const saisieDeLHeure = (donnees.get("heure") ?? "").toString();
  const heure = lireHeureDeRappel(saisieDeLHeure);

  if (heure === null) {
    return {
      erreur: "L'heure du rappel est une heure pile, de 0 à 23. Par exemple 19 h.",
      heure: saisieDeLHeure,
      plafond: saisieDuPlafond,
    };
  }

  if (!emailsActifs) await optOutOfEmails(utilisateur.id);
  else await reprendreLesEmails(utilisateur.id);

  const ecrit = await enregistrerLesReglages(utilisateur.id, {
    sessionCap: plafond,
    // Emails coupés, les deux réglages de contenu le sont aussi : c'est ce que
    // fait le lien de désinscription, et les deux chemins doivent laisser le
    // compte dans le même état.
    dailyReminderEnabled: emailsActifs && donnees.get("rappel") !== null,
    dailyReminderHour: heure,
    streakAlertEnabled: emailsActifs && donnees.get("alerte") !== null,
  });

  if (!ecrit) return { erreur: "Ces réglages n'ont pas pu être enregistrés. Réessaie." };

  revalidatePath(ROUTES.reglages);

  return { message: emailsActifs ? "Enregistré." : "Enregistré. Emails coupés." };
}
