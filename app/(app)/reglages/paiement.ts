"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { ouvrirLePaiement } from "@/lib/paiement/achat";
import { ouvrirLePortail } from "@/lib/paiement/portail";
import { AbonnementDejaOuvertError, PaiementError } from "@/lib/paiement/erreurs";
import { arreterLAbonnement, reprendreLAbonnement } from "@/lib/paiement/resiliation";

/**
 * Les gestes d'argent : payer, arrêter, reprendre, ouvrir le portail. À part
 * des autres gestes du compte, pour qu'un import distrait ne les mette pas à
 * portée d'un écran qui ne les demande pas.
 *
 * Chacun revérifie la session et passe par la limite de débit. Le compte visé
 * est toujours celui de la session : aucun de ces gestes ne prend d'identifiant.
 */

const CADENCES = ["month", "year"] as const;
const cadenceSchema = z.enum(CADENCES);

export type EtatDuPaiement = { erreur?: string };

/*
 * Les textes sont dans `compte.offre.erreurs`. Le détail d'un échec Stripe
 * (`echec`) part au journal et pas à l'écran : il nomme des clés et des prix,
 * rien d'actionnable. `dejaAbonne` ne survient qu'avec un onglet resté ouvert
 * sur l'état d'avant : la réponse est de rafraîchir, pas de réessayer.
 */
const erreurs = () => getTranslations("compte.offre.erreurs");

/**
 * Ouvre la page de paiement et y envoie.
 *
 * La redirection est hors du `try` : `redirect()` lève une exception que Next
 * intercepte, et l'attraper ici transformerait un succès en erreur.
 */
export async function payerAction(
  _precedent: EtatDuPaiement,
  donnees: FormData,
): Promise<EtatDuPaiement> {
  const utilisateur = await getCurrentUser();
  const t = await erreurs();

  if (!utilisateur) return { erreur: t("sessionExpiree") };

  const cadence = cadenceSchema.safeParse(donnees.get("cadence"));

  if (!cadence.success) return { erreur: t("offreInconnue") };

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { erreur: t("tropVite") };
  }

  let adresse: string;

  try {
    adresse = await ouvrirLePaiement(utilisateur, cadence.data);
  } catch (erreur) {
    console.error("[paiement] ouverture refusée", {
      userId: utilisateur.id,
      code: erreur instanceof PaiementError ? erreur.code : "INCONNU",
      erreur,
    });

    return { erreur: erreur instanceof AbonnementDejaOuvertError ? t("dejaAbonne") : t("echec") };
  }

  redirect(adresse);
}

/**
 * Envoie au portail Stripe, pour les factures et le moyen de paiement
 * seulement : sa configuration refuse la résiliation et le changement d'offre,
 * qui se font dans Kairn. Redirection hors du `try`, comme pour l'achat.
 */
export async function portailAction(): Promise<EtatDuPaiement> {
  const utilisateur = await getCurrentUser();
  const t = await erreurs();

  if (!utilisateur) return { erreur: t("sessionExpiree") };

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { erreur: t("tropVite") };
  }

  let adresse: string;

  try {
    adresse = await ouvrirLePortail(utilisateur.id);
  } catch (erreur) {
    console.error("[paiement] portail refusé", {
      userId: utilisateur.id,
      code: erreur instanceof PaiementError ? erreur.code : "INCONNU",
      erreur,
    });

    return { erreur: t("portailFerme") };
  }

  redirect(adresse);
}

/**
 * Arrête le renouvellement, ou revient dessus : un seul drapeau chez Stripe,
 * donc une seule action.
 */
const gesteSchema = z.enum(["arreter", "reprendre"]);

export async function renouvellementAction(
  _precedent: EtatDuPaiement,
  donnees: FormData,
): Promise<EtatDuPaiement> {
  const geste = gesteSchema.safeParse(donnees.get("geste"));
  const t = await erreurs();

  if (!geste.success) return { erreur: t("gesteInconnu") };

  return geste.data === "arreter"
    ? basculer(arreterLAbonnement, t("arretEchoue"))
    : basculer(reprendreLAbonnement, t("repriseEchouee"));
}

async function basculer(
  geste: (userId: string) => Promise<void>,
  echec: string,
): Promise<EtatDuPaiement> {
  const utilisateur = await getCurrentUser();
  const t = await erreurs();

  if (!utilisateur) return { erreur: t("sessionExpiree") };

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { erreur: t("tropVite") };
  }

  try {
    await geste(utilisateur.id);
  } catch (erreur) {
    console.error("[paiement] geste refusé", {
      userId: utilisateur.id,
      code: erreur instanceof PaiementError ? erreur.code : "INCONNU",
      erreur,
    });

    return { erreur: echec };
  }

  revalidatePath(ROUTES.reglages);

  return {};
}
