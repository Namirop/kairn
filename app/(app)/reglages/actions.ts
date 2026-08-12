"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { supprimerLeCompte } from "@/lib/db/compte";

/**
 * Les gestes irréversibles d'un compte.
 *
 * Il n'y en a qu'un, et c'est pour ça qu'il est ici plutôt que dans les gestes
 * de dépôt : effacer un compte n'a rien à voir avec le reste du produit, et
 * mélanger les deux ferait qu'une erreur d'import mette la suppression à portée
 * d'un écran qui ne la demande pas.
 */

/**
 * Ce qu'il faut taper pour confirmer.
 *
 * Pas une case à cocher : une case se coche sans lire. Recopier un mot demande
 * de regarder ce qu'on est en train de faire, et c'est le seul frein
 * proportionné à une action qu'on ne peut pas défaire.
 */
export const MOT_DE_CONFIRMATION = "supprimer";

const confirmationSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .toLowerCase()
    .refine((valeur) => valeur === MOT_DE_CONFIRMATION),
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

  const efface = await supprimerLeCompte(utilisateur.id);

  if (!efface) return { erreur: "Ce compte est introuvable." };

  // Rien à révoquer : la ligne `Session` est partie avec le compte, dans la même
  // cascade. Le cookie que le navigateur garde ne désigne plus rien — la
  // prochaine requête ne trouve pas de session et le barrage d'entrée renvoie à
  // la connexion. Appeler une déconnexion ici donnerait l'illusion d'un ménage
  // qui a déjà eu lieu.
  redirect(ROUTES.accueil);
}
