"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { ouvrirLePaiement } from "@/lib/paiement/achat";
import { AbonnementDejaOuvertError, PaiementError } from "@/lib/paiement/erreurs";
import { arreterLAbonnement, reprendreLAbonnement } from "@/lib/paiement/resiliation";

/**
 * Les trois gestes d'argent : payer, arrêter, reprendre.
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

/** Ce qu'on dit quand la limite de débit refuse. Personne ne la verra à la main. */
const TROP_VITE = "Trop de demandes coup sur coup. Laisse passer quelques secondes.";

const SESSION_EXPIREE = "Ta session a expiré. Reconnecte-toi.";

/**
 * Ce qu'on dit d'un échec côté Stripe.
 *
 * Le détail part au journal et pas à l'écran : il nomme des clés, des
 * identifiants de prix et des montants, et il ne dit rien d'actionnable à qui
 * voulait simplement payer.
 */
const ECHEC = "Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant.";

/**
 * Ce qu'on dit à qui paie une seconde fois.
 *
 * Ça n'arrive pas en cliquant : l'écran ne montre le bouton qu'à un compte sans
 * abonnement. Ça arrive avec un onglet resté ouvert sur l'état d'avant — et la
 * bonne réponse est alors de le rafraîchir, pas de réessayer.
 */
const DEJA_ABONNE = "Ton abonnement est déjà ouvert. Recharge la page pour voir où il en est.";

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

  if (!utilisateur) return { erreur: SESSION_EXPIREE };

  const cadence = cadenceSchema.safeParse(donnees.get("cadence"));

  if (!cadence.success) return { erreur: "Cette offre n'existe pas." };

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { erreur: TROP_VITE };
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

    return { erreur: erreur instanceof AbonnementDejaOuvertError ? DEJA_ABONNE : ECHEC };
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

  if (!geste.success) return { erreur: "Ce geste n'existe pas." };

  return geste.data === "arreter"
    ? basculer(arreterLAbonnement, "L'arrêt n'a pas pu être enregistré.")
    : basculer(reprendreLAbonnement, "La reprise n'a pas pu être enregistrée.");
}

async function basculer(
  geste: (userId: string) => Promise<void>,
  echec: string,
): Promise<EtatDuPaiement> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return { erreur: SESSION_EXPIREE };

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { erreur: TROP_VITE };
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
