import { notFound, redirect } from "next/navigation";
import { estAdministrateur } from "./admin";
import { ROUTES } from "./routes";
import { getCurrentUser } from "./session";

/**
 * La garde de tous les écrans internes, en un seul geste.
 *
 * L'écran d'administration est maintenant six pages, et six pages veut dire six
 * occasions d'oublier la garde. Une page qui l'oublie ne casse rien, ne fait
 * échouer aucun test de rendu, et s'ouvre à tout le monde — c'est exactement le
 * genre de trou qu'on ne remarque pas. Un seul appel en tête de fichier se
 * vérifie, lui, d'un coup d'œil, et la vérification l'exige sur chaque page du
 * dossier.
 *
 * Elle rend un 404 et non un 403 : l'existence de ces pages n'a pas à se
 * confirmer à qui n'y a pas droit.
 *
 * Elle ne remplace pas la vérification faite dans les Server Actions. Une action
 * est une route atteignable sans passer par l'écran qui la propose ; garder
 * l'affichage ne garde que l'affichage.
 */
export async function exigerUnAdministrateur(): Promise<void> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();
}
