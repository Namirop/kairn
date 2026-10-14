import { notFound, redirect } from "next/navigation";
import { estAdministrateur } from "./admin";
import { ROUTES } from "./routes";
import { lireLUtilisateur } from "./session";

/**
 * La garde de tous les écrans internes, en un appel en tête de page : une page
 * qui l'oublie s'ouvre à tout le monde sans rien casser, et un appel unique se
 * vérifie d'un coup d'œil.
 *
 * Un 404 et non un 403 : l'existence de ces pages n'a pas à se confirmer.
 *
 * Elle ne remplace pas la vérification dans les Server Actions, atteignables
 * sans passer par l'écran qui les propose.
 */
export async function exigerUnAdministrateur(): Promise<void> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();
}
