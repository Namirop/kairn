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
 * Les gestes d'argent, à part pour qu'un import distrait ne les mette pas à
 * portée d'un autre écran. Session et limite de débit revérifiées ; le compte
 * visé est celui de la session, aucun geste ne prend d'identifiant.
 */

const CADENCES = ["month", "year"] as const;
const cadenceSchema = z.enum(CADENCES);

export type EtatDuPaiement = { erreur?: string };

/*
 * Le détail d'un échec Stripe part au journal, pas à l'écran : clés et prix,
 * rien d'actionnable. `dejaAbonne` vient d'un onglet resté sur l'état d'avant :
 * il faut rafraîchir, pas réessayer.
 */
const erreurs = () => getTranslations("compte.offre.erreurs");

type Erreurs = Awaited<ReturnType<typeof erreurs>>;

type Demande<D> = { lue: D } | { refus: string };

type Acces<D> = { erreur: string } | { utilisateur: UtilisateurDeSession; demande: D };

/**
 * Session, demande, puis limite de débit, dans cet ordre : une session expirée
 * se dit d'abord, une demande illisible ne consomme pas de geste.
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

/** `redirect()` hors du `try` : il lève, et l'attraper ferait d'un succès une erreur. */
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
 * Factures et moyen de paiement seulement : le portail est configuré pour refuser
 * résiliation et changement d'offre, qui se font dans Kairn.
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

/** Arrêter et reprendre : un seul drapeau chez Stripe, donc une seule action. */
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
