import { notFound, redirect } from "next/navigation";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * L'ancienne adresse de l'écran interne.
 *
 * L'écran a grossi au-delà des signalements — il porte la dépense, les comptes,
 * les volumes et les réglages —, et une route qui annonce une seule de ces
 * choses ment sur ce qu'elle ouvre. Elle est devenue `/admin` ; celle-ci n'est
 * plus qu'un renvoi, pour le favori qui existe déjà.
 *
 * Elle se garde exactement comme la vraie. Un renvoi non gardé serait une
 * confirmation gratuite : il apprendrait à n'importe qui que `/admin` existe,
 * ce que le 404 de la page d'arrivée s'applique justement à taire.
 */
export const dynamic = "force-dynamic";

export default async function AncienneAdresseDeLAdministration(): Promise<never> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();

  redirect(ROUTES.admin);
}
