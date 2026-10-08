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
 * Les quatre gestes d'argent : payer, arrêter, reprendre, et ouvrir le portail.
 *
 * Ils vivent à part des autres gestes du compte parce qu'ils touchent à une
 * carte bancaire, et qu'un import distrait ne doit pas pouvoir mettre l'un
 * d'eux à portée d'un écran qui ne le demande pas — même raison qui garde la
 * suppression de compte dans son propre fichier.
 *
 * Chacun revérifie la session et passe par la limite de débit. Le compte visé
 * est toujours celui de la session : aucun de ces gestes ne prend d'identifiant.
 */

const CADENCES = ["month", "year"] as const;
const cadenceSchema = z.enum(CADENCES);

export type EtatDuPaiement = { erreur?: string };

/**
 * Les textes de ces gestes vivent dans `compte.offre.erreurs`, dans la langue de
 * la personne ; les commentaires qui suivent gardent le pourquoi de chacun, sous
 * la clé qui le désigne.
 */
const erreurs = () => getTranslations("compte.offre.erreurs");

/* `tropVite` — ce qu'on dit quand la limite de débit refuse. Personne ne la
   verra à la main. */

/*
 * `echec` — ce qu'on dit d'un échec côté Stripe.
 *
 * Le détail part au journal et pas à l'écran : il nomme des clés, des
 * identifiants de prix et des montants, et il ne dit rien d'actionnable à qui
 * voulait simplement payer.
 */

/*
 * `dejaAbonne` — ce qu'on dit à qui paie une seconde fois.
 *
 * Ça n'arrive pas en cliquant : l'écran ne montre le bouton qu'à un compte sans
 * abonnement. Ça arrive avec un onglet resté ouvert sur l'état d'avant — et la
 * bonne réponse est alors de le rafraîchir, pas de réessayer.
 */

/*
 * `portailFerme` — ce qu'on dit quand le portail ne s'ouvre pas.
 *
 * Le portail ne change aucun droit — on y consulte des factures et on y met une
 * carte à jour — donc son échec n'a rien d'urgent à annoncer. Il se réessaie.
 */

/**
 * Ouvre la page de paiement et y envoie.
 *
 * La redirection est hors du `try` : `redirect()` fonctionne en levant une
 * exception que Next intercepte, et l'attraper ici transformerait un succès en
 * message d'erreur.
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
 * Envoie au portail Stripe, où vivent les factures et le moyen de paiement.
 *
 * Ces deux-là seulement : la configuration du portail refuse explicitement la
 * résiliation et le changement d'offre, qui se font dans Kairn. Comme pour
 * l'achat, la redirection est hors du `try`.
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
 * Arrête le renouvellement, ou revient dessus.
 *
 * Un seul geste pour les deux sens, parce que c'en est un seul : un drapeau
 * qu'on lève et qu'on baisse chez Stripe. Deux actions auraient dupliqué la
 * session, la limite de débit et le traitement d'échec pour la seule différence
 * d'un booléen.
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
