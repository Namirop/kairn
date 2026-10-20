"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { supprimerLeCompte } from "@/lib/db/compte";
import {
  enregistrerLesReglages,
  couperLesEmails,
  reprendreLesEmails,
} from "@/lib/db/reglages-du-compte";
import { confirmationValide, MOT_DE_CONFIRMATION } from "@/lib/domain/confirmation-de-suppression";
import { lireHeureDeRappel } from "@/lib/domain/heure-de-rappel";
import { lirePlafondDeSession, PLAFOND_MAX, PLAFOND_MIN } from "@/lib/domain/selection-session";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { PaiementError } from "@/lib/paiement/erreurs";
import { fermerLAbonnementDuCompte } from "@/lib/paiement/fermeture-du-compte";

/** L'argent est à part, dans `paiement.ts`. */

export type EtatSuppression = { erreur?: string };

export async function supprimerMonCompteAction(
  _precedent: EtatSuppression,
  donnees: FormData,
): Promise<EtatSuppression> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const t = await getTranslations("compte.donnees.erreurs");
  // Le mot à recopier est dans la langue de l'écran.
  const langue = await langueDeLaRequete();
  const valide = z
    .object({ confirmation: z.string().refine((saisie) => confirmationValide(saisie, langue)) })
    .safeParse({ confirmation: (donnees.get("confirmation") ?? "").toString() });

  if (!valide.success) {
    return { erreur: t("confirmation", { mot: MOT_DE_CONFIRMATION[langue] }) };
  }

  // L'abonnement avant le compte : la cascade emporte l'identifiant Stripe, et
  // plus rien ne saurait quel abonnement prélève. Un échec renonce à la suppression : un
  // compte de trop se répare, un prélèvement orphelin non.
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

  // Rien à révoquer : `Session` part dans la cascade, le cookie ne désigne plus rien.
  redirect(ROUTES.accueil);
}

/**
 * Un message ou une erreur, jamais les deux. `heure` et `plafond` rendent les
 * saisies refusées : React réinitialise le formulaire au retour de l'action.
 */
export type EtatDesReglages = {
  message?: string;
  erreur?: string;
  heure?: string;
  plafond?: string;
};

/** Rendre les emails lève le refus sans rien rallumer : ce qu'on veut recevoir se rechoisit. */
export async function enregistrerLesReglagesAction(
  _precedent: EtatDesReglages,
  donnees: FormData,
): Promise<EtatDesReglages> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const t = await getTranslations("compte.reglages.reponses");

  // Lire avant d'écrire : un plafond mal tapé ne doit pas couper les emails.
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

  if (!emailsActifs) await couperLesEmails(utilisateur.id);
  else await reprendreLesEmails(utilisateur.id);

  const ecrit = await enregistrerLesReglages(utilisateur.id, {
    sessionCap: plafond,
    // Même état que le lien de désinscription : emails coupés, contenus coupés.
    dailyReminderEnabled: emailsActifs && donnees.get("rappel") !== null,
    dailyReminderHour: heure,
    streakAlertEnabled: emailsActifs && donnees.get("alerte") !== null,
  });

  if (!ecrit) return { erreur: t("echec") };

  revalidatePath(ROUTES.reglages);

  return { message: emailsActifs ? t("enregistre") : t("enregistreSansEmails") };
}
