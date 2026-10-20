import { notFound, redirect } from "next/navigation";
import { estAdministrateur } from "./admin";
import { ROUTES } from "./routes";
import { lireLUtilisateur } from "./session";

/**
 * En tête de chaque écran interne : une page qui l'oublie s'ouvre à tous sans
 * rien casser. Un 404, pas un 403 : ces pages n'ont pas à se confirmer. Ne
 * dispense pas les Server Actions, atteignables sans l'écran.
 */
export async function exigerUnAdministrateur(): Promise<void> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();
}
