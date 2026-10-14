"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur, type UtilisateurDeSession } from "@/lib/auth/session";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
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

type Erreurs = Awaited<ReturnType<typeof erreurs>>;

/** Ce que porte la demande, déjà lu, ou ce qu'on répond quand elle ne se lit pas. */
type Demande<D> = { lue: D } | { refus: string };

type Acces<D> = { erreur: string } | { utilisateur: UtilisateurDeSession; demande: D };

/**
 * L'entrée commune des gestes : la session, puis la demande, puis la limite de
 * débit. Dans cet ordre : une demande illisible est refusée sans consommer de
 * geste, et une session expirée se dit avant tout le reste.
 */
async function ouvrirLeGeste<D>(t: Erreurs, demande: Demande<D>): Promise<Acces<D>> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return { erreur: t("sessionExpiree") };

  if ("refus" in demande) return { erreur: demande.refus };

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { erreur: t("tropVite") };
  }

  return { utilisateur, demande: demande.lue };
}

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
  const t = await erreurs();
  const cadence = cadenceSchema.safeParse(donnees.get("cadence"));
  const acces = await ouvrirLeGeste(
    t,
    cadence.success ? { lue: cadence.data } : { refus: t("offreInconnue") },
  );

  if ("erreur" in acces) return { erreur: acces.erreur };

  const { utilisateur } = acces;
  let adresse: string;

  try {
    adresse = await ouvrirLePaiement(utilisateur, acces.demande);
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
  const t = await erreurs();
  const acces = await ouvrirLeGeste(t, { lue: null });

  if ("erreur" in acces) return { erreur: acces.erreur };

  const { utilisateur } = acces;
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
  const acces = await ouvrirLeGeste(await erreurs(), { lue: null });

  if ("erreur" in acces) return { erreur: acces.erreur };

  const { utilisateur } = acces;

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
