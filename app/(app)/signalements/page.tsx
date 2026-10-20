import { notFound, redirect } from "next/navigation";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";

/**
 * Ancienne adresse, gardée comme la vraie : un renvoi non gardé révélerait
 * `/admin`, que son 404 s'applique à taire.
 */
export const dynamic = "force-dynamic";

export default async function AncienneAdresseDeLAdministration(): Promise<never> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();

  redirect(ROUTES.admin);
}
