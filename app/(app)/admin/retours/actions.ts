"use server";
// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { basculerLeTraitement } from "@/lib/db/retour";

/**
 * Marquer un retour lu, ou le remettre à lire.
 *
 * L'autorisation est revérifiée ici et pas seulement à l'affichage : une Server
 * Action est une route, atteignable sans passer par l'écran qui la propose.
 *
 * C'est un aller-retour et pas un aller : on se trompe de bouton, et un retour
 * classé par erreur ne doit pas disparaître de la pile pour de bon.
 */

const CHAMPS = z.object({ id: z.string().min(1) });

export type EtatDuTraitement = { erreur?: string };

export async function basculerLeTraitementAction(
  _precedent: EtatDuTraitement,
  donnees: FormData,
): Promise<EtatDuTraitement> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return { erreur: "Session absente." };
  if (!estAdministrateur(utilisateur.email)) return { erreur: "Accès refusé." };

  const lu = CHAMPS.safeParse({ id: donnees.get("id") });

  if (!lu.success) return { erreur: "Retour introuvable." };

  const bascule = await basculerLeTraitement(lu.data.id);

  if (bascule === null) return { erreur: "Ce retour n'existe plus." };

  revalidatePath(ROUTES.adminRetours);

  return {};
}
