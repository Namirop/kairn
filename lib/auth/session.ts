import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./config";

/**
 * Un `userId` vient toujours d'ici, jamais de la requête. Mémoïsée sur le rendu :
 * la mise en page et sa page la demandent toutes deux.
 */

export type UtilisateurDeSession = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export class SessionAbsenteError extends Error {
  readonly code = "UNAUTHENTICATED";

  constructor() {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("Aucune session valide.");
    this.name = "SessionAbsenteError";
  }
}

export const lireLUtilisateur = cache(async (): Promise<UtilisateurDeSession | null> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };
});

/** Pour les routes et actions ; une page préfère rediriger qu'afficher une erreur. */
export async function exigerLUtilisateur(): Promise<UtilisateurDeSession> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) throw new SessionAbsenteError();

  return utilisateur;
}
