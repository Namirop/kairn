import { notFound, redirect } from "next/navigation";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";

/**
 * Renvoi vers `/admin`, pour les favoris de l'ancienne adresse.
 *
 * Gardé exactement comme la vraie page : un renvoi non gardé apprendrait à
 * n'importe qui que `/admin` existe, ce que son 404 s'applique à taire.
 */
export const dynamic = "force-dynamic";

export default async function AncienneAdresseDeLAdministration(): Promise<never> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();

  redirect(ROUTES.admin);
}
