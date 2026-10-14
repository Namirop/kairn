"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { supprimerLeCompte } from "@/lib/db/compte";
import { enregistrerLesReglages, optOutOfEmails, reprendreLesEmails } from "@/lib/db/user-settings";
import { confirmationValide, MOT_DE_CONFIRMATION } from "@/lib/domain/confirmation-de-suppression";
import { lireHeureDeRappel } from "@/lib/domain/heure-de-rappel";
import { lirePlafondDeSession, PLAFOND_MAX, PLAFOND_MIN } from "@/lib/domain/selection-session";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { PaiementError } from "@/lib/paiement/erreurs";
import { fermerLAbonnementDuCompte } from "@/lib/paiement/fermeture-du-compte";

/**
 * Les gestes de l'écran des réglages : la suppression du compte et les
 * réglages de notification. L'argent est à part, dans `paiement.ts`.
 */

export type EtatSuppression = { erreur?: string };

/** Efface le compte, et la session avec lui, puis renvoie à l'accueil. */
export async function supprimerMonCompteAction(
  _precedent: EtatSuppression,
  donnees: FormData,
): Promise<EtatSuppression> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const t = await getTranslations("compte.donnees.erreurs");
  // Le mot à recopier est celui que l'écran a demandé, donc celui de sa langue.
  const langue = await langueDeLaRequete();
  const valide = z
    .object({ confirmation: z.string().refine((saisie) => confirmationValide(saisie, langue)) })
    .safeParse({ confirmation: (donnees.get("confirmation") ?? "").toString() });

  if (!valide.success) {
    return { erreur: t("confirmation", { mot: MOT_DE_CONFIRMATION[langue] }) };
  }

  // L'abonnement se coupe avant le compte, jamais l'inverse : la ligne
  // `Subscription` part en cascade et emporte l'identifiant du client Stripe,
  // après quoi plus rien ne sait quel abonnement prélève. Un échec renonce donc
  // à la suppression : un compte de trop se répare, un prélèvement orphelin non.
  try {
    await fermerLAbonnementDuCompte(utilisateur.id);
  } catch (erreur) {
    console.error("[paiement] fermeture refusée", {
      userId: utilisateur.id,
      code: erreur instanceof PaiementError ? erreur.code : "INCONNU",
      erreur,
    });

    return { erreur: t("abonnement") };
  }

  const efface = await supprimerLeCompte(utilisateur.id);

  if (!efface) return { erreur: t("introuvable") };

  // Rien à révoquer : la ligne `Session` est partie dans la même cascade, et le
  // cookie restant ne désigne plus rien.
  redirect(ROUTES.accueil);
}

/**
 * Ce que le formulaire de notifications rend à l'écran : un mot, jamais les deux.
 *
 * `heure` et `plafond` portent les saisies refusées : React remet un formulaire
 * à ses valeurs par défaut quand l'action rend la main, et la saisie à corriger
 * disparaîtrait.
 */
export type EtatDesReglages = {
  message?: string;
  erreur?: string;
  heure?: string;
  plafond?: string;
};

/**
 * Enregistre les réglages de notification. Rendre les emails lève le refus sans
 * rien rallumer : ce qu'on veut recevoir se rechoisit.
 */
export async function enregistrerLesReglagesAction(
  _precedent: EtatDesReglages,
  donnees: FormData,
): Promise<EtatDesReglages> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const t = await getTranslations("compte.reglages.reponses");

  // Les deux lectures d'abord : rien ne s'écrit tant qu'une saisie est illisible,
  // sinon un plafond mal tapé aurait quand même coupé les emails.
  const saisieDuPlafond = (donnees.get("plafond") ?? "").toString();
  const plafond = lirePlafondDeSession(saisieDuPlafond);

  if (plafond === null) {
    return {
      erreur: t("plafond", { min: PLAFOND_MIN, max: PLAFOND_MAX }),
      plafond: saisieDuPlafond,
    };
  }

  const emailsActifs = donnees.get("emails") !== null;
  const saisieDeLHeure = (donnees.get("heure") ?? "").toString();
  const heure = lireHeureDeRappel(saisieDeLHeure);

  if (heure === null) {
    return {
      erreur: t("heure"),
      heure: saisieDeLHeure,
      plafond: saisieDuPlafond,
    };
  }

  if (!emailsActifs) await optOutOfEmails(utilisateur.id);
  else await reprendreLesEmails(utilisateur.id);

  const ecrit = await enregistrerLesReglages(utilisateur.id, {
    sessionCap: plafond,
    // Emails coupés, les deux réglages de contenu le sont aussi : comme le lien
    // de désinscription, pour que les deux chemins laissent le même état.
    dailyReminderEnabled: emailsActifs && donnees.get("rappel") !== null,
    dailyReminderHour: heure,
    streakAlertEnabled: emailsActifs && donnees.get("alerte") !== null,
  });

  if (!ecrit) return { erreur: t("echec") };

  revalidatePath(ROUTES.reglages);

  return { message: emailsActifs ? t("enregistre") : t("enregistreSansEmails") };
}
